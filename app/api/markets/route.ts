import { CURATED_MARKETS, TOKEN_2022_PROGRAM, XSTOCKS_API } from "@/lib/markets";

export const runtime = "edge";

type Json = Record<string, unknown>;

async function getJson(path: string) {
  const response = await fetch(`${XSTOCKS_API}${path}`, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`xStocks ${response.status}`);
  return (await response.json()) as Json;
}

async function verifyMints() {
  const configured = process.env.LEVPLAY_SVM_READ_RPC;
  const rpcs = [...new Set([...(configured && /^https:\/\/[^@\s]+$/.test(configured) ? [configured] : []), "https://api.mainnet-beta.solana.com", "https://solana-rpc.publicnode.com"])];
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
  const rows = await Promise.all(CURATED_MARKETS.map(async (market) => {
    try {
      const [asset, price, multiplier, oraclePayload, liveMints] = await Promise.all([
        getJson(`/public/assets/${market.symbol}`),
        getJson(`/public/assets/${market.symbol}/price-data`),
        getJson(`/public/assets/${market.symbol}/multiplier?network=Solana`),
        oracleRequest,
        mintChecks,
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
      if (!solana || solana.address !== market.mint || !Number.isFinite(quote) || quote <= 0) throw new Error("Incomplete or mismatched market data");
      const activation = Number(multiplier.activationDateTime || 0);
      const insideCorporateActionWindow = activation > 0 && Math.abs(Date.now() - activation * 1000) <= 15 * 60 * 1000;
      const dualOracle = oracles.some((item) => item.provider === "Pyth") && oracles.some((item) => item.provider === "Chainlink");
      const halted = asset.isTradingHalted === true || (asset.trading as Json | undefined)?.isTradingHalted === true;
      return {
        ...market,
        price: quote,
        mint: market.mint,
        atomic: solana.supportsAtomicSwaps === true,
        halted,
        marketOpen: (asset.trading as Json | undefined)?.openNow === true,
        period: String((asset.trading as Json | undefined)?.currentPeriod || "unknown"),
        multiplier: Number(multiplier.currentMultiplier || 1),
        pendingMultiplier: Number(multiplier.newMultiplier || 0),
        multiplierActivation: Number(multiplier.activationDateTime || 0),
        oracles,
        issuerControls: mintState?.hasPermanentDelegate ? ["mint", "freeze", "pause", "permanent delegate"] : [],
        verified: Boolean(mintState?.valid && solana.supportsAtomicSwaps === true && dualOracle && !insideCorporateActionWindow && !halted),
      };
    } catch {
      return { ...market, unavailable: true, verified: false };
    }
  }));
  return Response.json({ markets: rows, checkedAt: new Date().toISOString(), source: "xStocks public API v2" }, {
    headers: { "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120" },
  });
}
