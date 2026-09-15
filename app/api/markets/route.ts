import { CURATED_MARKETS, PREIPO_MARKETS, TOKEN_2022_PROGRAM, XSTOCKS_API } from "@/lib/markets";
import { isSafeRpcUrl } from "@/lib/protocol";

export const runtime = "edge";

type Json = Record<string, unknown>;
type DexPair = {
  chainId?: string;
  pairAddress?: string;
  priceUsd?: string;
  liquidity?: { usd?: number };
  baseToken?: { address?: string };
  info?: { imageUrl?: string };
};

async function getJson(path: string) {
  const response = await fetch(`${XSTOCKS_API}${path}`, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`xStocks ${response.status}`);
  if (Number(response.headers.get("content-length") || 0) > 1_000_000) throw new Error("Oversized xStocks response");
  return (await response.json()) as Json;
}

async function getPreIpoReferences() {
  const requested = new Set(PREIPO_MARKETS.map((market) => market.mint));
  const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${[...requested].join(",")}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`DEX reference ${response.status}`);
  if (Number(response.headers.get("content-length") || 0) > 2_000_000) throw new Error("Oversized DEX reference response");
  const payload = await response.json() as { pairs?: DexPair[] };
  const pairs = Array.isArray(payload.pairs) ? payload.pairs : [];
  return Object.fromEntries([...requested].map((mint) => {
    const candidates = pairs.filter((pair) => pair.chainId === "solana" && pair.baseToken?.address === mint && Number(pair.priceUsd) > 0);
    const pair = candidates.sort((a, b) => Number(b.liquidity?.usd || 0) - Number(a.liquidity?.usd || 0))[0];
    const logo = pair?.info?.imageUrl?.startsWith("https://cdn.dexscreener.com/") ? pair.info.imageUrl : undefined;
    return [mint, pair ? { price: Number(pair.priceUsd), liquidityUsd: Number(pair.liquidity?.usd || 0), pairAddress: pair.pairAddress || "", logo } : null];
  }));
}

async function verifyMints() {
  const configured = process.env.LEVPLAY_SVM_READ_RPC;
  const rpcs = [...new Set([...(isSafeRpcUrl(configured) ? [configured] : []), "https://api.mainnet-beta.solana.com", "https://solana-rpc.publicnode.com"])];
  let payload: Array<{ id: number; result?: { value?: { owner?: string; data?: { parsed?: { info?: { extensions?: Array<{ extension?: string; state?: Json }>; isInitialized?: boolean } } } } } }> | null = null;
  for (const rpc of rpcs) {
    try {
      const response = await fetch(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(CURATED_MARKETS.map((market, index) => ({ jsonrpc: "2.0", id: index + 1, method: "getAccountInfo", params: [market.mint, { encoding: "jsonParsed", commitment: "confirmed" }] }))), signal: AbortSignal.timeout(10_000) });
      if (!response.ok) continue;
      payload = await response.json();
      if (Array.isArray(payload)) break;
    } catch { /* try the next independent provider */ }
  }
  if (!payload) throw new Error("Solana RPC unavailable");
  return Object.fromEntries(payload.map((item) => {
    const market = CURATED_MARKETS[item.id - 1];
    const value = item.result?.value;
    const info = value?.data?.parsed?.info;
    const extensions = info?.extensions || [];
    const named = (name: string) => extensions.find((extension) => extension.extension === name)?.state;
    const metadata = named("tokenMetadata");
    const pause = named("pausableConfig");
    const scaled = named("scaledUiAmountConfig");
    const hook = named("transferHook");
    const valid = value?.owner === TOKEN_2022_PROGRAM && info?.isInitialized === true && metadata?.symbol === market?.symbol && Boolean(scaled) && pause?.paused !== true && !hook?.programId;
    return [market?.symbol || "", { valid, paused: pause?.paused === true, hasPermanentDelegate: Boolean(named("permanentDelegate")), multiplier: String(scaled?.multiplier || "") }];
  }));
}

export async function GET() {
  const oracleRequest = getJson("/public/oracles?pageSize=100&network=Solana").catch(() => ({ nodes: [] }));
  const mintChecks = verifyMints().catch(() => ({} as Record<string, { valid: boolean; paused: boolean; hasPermanentDelegate: boolean; multiplier: string }>));
  const preIpoRequest = getPreIpoReferences().catch(() => ({} as Record<string, { price: number; liquidityUsd: number; pairAddress: string; logo?: string } | null>));
  const hongKongCatalogRequest = getJson("/public/assets?listingCountry=HK&network=Solana&pageSize=100").catch(() => ({ nodes: [] }));
  const rows = await Promise.all(CURATED_MARKETS.map(async (market) => {
    try {
      const isHongKong = market.category === "Hong Kong";
      const [asset, oraclePayload, liveMints] = await Promise.all([
        isHongKong
          ? hongKongCatalogRequest.then((catalog) => {
              const nodes = Array.isArray(catalog.nodes) ? catalog.nodes as Json[] : [];
              const match = nodes.find((item) => item.symbol === market.symbol);
              if (!match) throw new Error("Hong Kong asset missing from issuer catalog");
              return match;
            })
          : getJson(`/public/assets/${market.symbol}`),
        oracleRequest,
        mintChecks,
      ]);
      const trading = asset.trading as Json | undefined;
      const marketClosed = trading?.currentPeriod === "closed" && trading?.openNow !== true;
      const [price, multiplier] = marketClosed
        ? [{ quote: null } as Json, {} as Json]
        : await Promise.all([
            getJson(`/public/assets/${market.symbol}/price-data`),
            getJson(`/public/assets/${market.symbol}/multiplier?network=Solana`),
          ]);
      const deployments = Array.isArray(asset.deployments) ? asset.deployments as Json[] : [];
      const solana = deployments.find((item) => item.network === "Solana");
      const oracleNodes = Array.isArray(oraclePayload.nodes) ? oraclePayload.nodes as Json[] : [];
      const oracles = oracleNodes.filter((item) => item.network === "Solana" && item.symbol === market.symbol).map((item) => {
        const metadata = item.metadata && typeof item.metadata === "object" ? item.metadata as Json : {};
        return { provider: String(item.managedBy || ""), feedId: String(metadata.hermesId || metadata.feedId || ""), minPublishers: Number(metadata.minPublishers || 0) };
      });
      const quote = Number(price.quote);
      const mintState = liveMints[market.symbol];
      const quoteAvailable = Number.isFinite(quote) && quote > 0;
      if (!solana || solana.address !== market.mint || (!quoteAvailable && !marketClosed)) throw new Error("Incomplete or mismatched market data");
      const activation = Number(multiplier.activationDateTime || 0);
      const insideCorporateActionWindow = activation > 0 && Math.abs(Date.now() - activation * 1000) <= 15 * 60 * 1000;
      const dualOracle = oracles.some((item) => item.provider === "Pyth") && oracles.some((item) => item.provider === "Chainlink");
      const halted = asset.isTradingHalted === true || trading?.isTradingHalted === true;
      return {
        ...market,
        price: quoteAvailable ? quote : undefined,
        mint: market.mint,
        atomic: solana.supportsAtomicSwaps === true,
        halted,
        marketOpen: trading?.openNow === true,
        period: String(trading?.currentPeriod || "unknown"),
        multiplier: Number(multiplier.currentMultiplier || 1),
        pendingMultiplier: Number(multiplier.newMultiplier || 0),
        multiplierActivation: Number(multiplier.activationDateTime || 0),
        logo: typeof asset.logo === "string" && asset.logo.startsWith("https://xstocks-metadata.backed.fi/") ? asset.logo : undefined,
        oracles,
        issuerControls: mintState?.hasPermanentDelegate ? ["mint", "freeze", "pause", "permanent delegate"] : [],
        verified: Boolean(quoteAvailable && mintState?.valid && solana.supportsAtomicSwaps === true && dualOracle && !insideCorporateActionWindow && !halted),
      };
    } catch {
      return { ...market, unavailable: true, verified: false };
    }
  }));
  const preIpoReferences = await preIpoRequest;
  const preIpo = PREIPO_MARKETS.map((market) => {
    const reference = preIpoReferences[market.mint];
    return {
      ...market,
      provider: "PreStocks · DEX reference",
      price: reference?.price,
      logo: reference?.logo,
      liquidityUsd: reference?.liquidityUsd,
      pairAddress: reference?.pairAddress,
      period: "24/7 secondary",
      marketOpen: true,
      verified: false,
      unavailable: !reference,
      verificationNote: reference
        ? "Live DEX reference available; execution remains blocked until independent settlement oracles and leverage backing are audited"
        : "Reference provider unavailable; execution remains blocked",
    };
  });
  return Response.json({ markets: [...rows, ...preIpo], checkedAt: new Date().toISOString(), source: "xStocks public API v2 + pinned PreStocks catalog" }, {
    headers: { "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120" },
  });
}
