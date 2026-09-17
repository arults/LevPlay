import { CURATED_MARKETS, ONDO_API, PREIPO_MARKETS, TESSERA_MARKETS, TOKEN_2022_PROGRAM } from "@/lib/markets";
import { isSafeRpcUrl } from "@/lib/protocol";

export const runtime = "edge";

type OndoPrice = {
  primaryMarket?: { symbol?: string; price?: string };
  underlyingMarket?: { ticker?: string; price?: string };
  timestamp?: number;
};
type DexPair = {
  chainId?: string;
  pairAddress?: string;
  priceUsd?: string;
  liquidity?: { usd?: number };
  baseToken?: { address?: string };
  info?: { imageUrl?: string };
};
type PreIpoReference = {
  price: number;
  liquidityUsd: number;
  pairAddress: string;
  logo?: string;
};
type TesseraToken = {
  id?: string;
  code?: string;
  mint?: string;
  markPrice?: number;
};

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const DISPLAY_FRESHNESS_MS = 60_000;

async function getOndoPrices(): Promise<Record<string, OndoPrice>> {
  const key = process.env.ONDO_API_KEY;
  if (!key) throw new Error("provider_unconfigured");
  const response = await fetch(`${ONDO_API}/assets/all/prices/latest`, {
    headers: { accept: "application/json", "x-api-key": key },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("provider_offline");
  if (Number(response.headers.get("content-length") || 0) > 2_000_000) throw new Error("Oversized Ondo response");
  const payload = await response.json() as OndoPrice[];
  if (!Array.isArray(payload)) throw new Error("provider_invalid");
  return Object.fromEntries(payload.flatMap((row) => row.primaryMarket?.symbol ? [[row.primaryMarket.symbol, row]] : []));
}

async function getPreIpoReferences(): Promise<Record<string, PreIpoReference | null>> {
  const requested = new Set(PREIPO_MARKETS.map((item) => item.mint));
  const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${[...requested].join(",")}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("provider_offline");
  if (Number(response.headers.get("content-length") || 0) > 2_000_000) throw new Error("Oversized DEX response");
  const payload = await response.json() as { pairs?: DexPair[] };
  const pairs = Array.isArray(payload.pairs) ? payload.pairs : [];
  return Object.fromEntries([...requested].map((mint) => {
    const candidates = pairs.filter((pair) =>
      pair.chainId === "solana"
      && pair.baseToken?.address === mint
      && Number(pair.priceUsd) > 0
    );
    const pair = candidates.sort((a, b) => Number(b.liquidity?.usd || 0) - Number(a.liquidity?.usd || 0))[0];
    const logo = pair?.info?.imageUrl?.startsWith("https://cdn.dexscreener.com/") ? pair.info.imageUrl : undefined;
    return [mint, pair ? {
      price: Number(pair.priceUsd),
      liquidityUsd: Number(pair.liquidity?.usd || 0),
      pairAddress: pair.pairAddress || "",
      logo,
    } : null];
  }));
}

async function getTesseraReferences(): Promise<Record<string, TesseraToken>> {
  const response = await fetch("https://rest-api.tessera.pe/v1/public/token-details", {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("provider_offline");
  if (Number(response.headers.get("content-length") || 0) > 500_000) throw new Error("Oversized Tessera response");
  const payload = await response.json() as TesseraToken[];
  if (!Array.isArray(payload)) throw new Error("provider_invalid");
  return Object.fromEntries(payload.flatMap((row) =>
    typeof row.mint === "string" && BASE58.test(row.mint) ? [[row.mint, row]] : []
  ));
}

async function verifyPinnedMints(): Promise<Record<string, boolean>> {
  const pinned = [...CURATED_MARKETS, ...TESSERA_MARKETS].filter((item) => BASE58.test(item.mint));
  const configured = process.env.LEVPLAY_SVM_READ_RPC;
  const rpcs = [...new Set([
    ...(isSafeRpcUrl(configured) ? [configured] : []),
    "https://api.mainnet-beta.solana.com",
    "https://solana-rpc.publicnode.com",
  ])];
  for (const rpc of rpcs) {
    try {
      const response = await fetch(rpc, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(pinned.map((item, index) => ({
          jsonrpc: "2.0",
          id: index + 1,
          method: "getAccountInfo",
          params: [item.mint, { encoding: "jsonParsed", commitment: "confirmed" }],
        }))),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) continue;
      const payload = await response.json() as Array<{
        id: number;
        result?: { value?: { owner?: string; data?: { parsed?: { info?: { isInitialized?: boolean } } } } };
      }>;
      if (!Array.isArray(payload)) continue;
      return Object.fromEntries(payload.flatMap((row) => {
        const item = pinned[row.id - 1];
        if (!item) return [];
        const value = row.result?.value;
        const valid = value?.owner === TOKEN_2022_PROGRAM
          && value?.data?.parsed?.info?.isInitialized === true;
        return [[item.symbol, valid]];
      }));
    } catch {
      // Try the next independent read provider.
    }
  }
  return {};
}

export async function GET() {
  const ondoConfigured = Boolean(process.env.ONDO_API_KEY);
  const [ondoResult, mintChecks, preIpoResult, tesseraResult] = await Promise.all([
    getOndoPrices()
      .then((prices) => ({ prices, reachable: true }))
      .catch(() => ({ prices: {} as Record<string, OndoPrice>, reachable: false })),
    verifyPinnedMints(),
    getPreIpoReferences()
      .then((references) => ({ references, reachable: true }))
      .catch(() => ({ references: {} as Record<string, PreIpoReference | null>, reachable: false })),
    getTesseraReferences()
      .then((references) => ({ references, reachable: true }))
      .catch(() => ({ references: {} as Record<string, TesseraToken>, reachable: false })),
  ]);

  const publicMarkets = CURATED_MARKETS.map((item) => {
    const quote = ondoResult.prices[item.symbol];
    const price = Number(quote?.underlyingMarket?.price);
    const rawTimestamp = Number(quote?.timestamp || 0);
    const timestampMs = rawTimestamp > 0 && rawTimestamp < 1_000_000_000_000
      ? rawTimestamp * 1_000
      : rawTimestamp;
    const fresh = Number.isFinite(timestampMs)
      && timestampMs > 0
      && Math.abs(Date.now() - timestampMs) <= DISPLAY_FRESHNESS_MS;
    const available = Number.isFinite(price) && price > 0;
    const referenceStatus = available
      ? (fresh ? "live" : "stale")
      : (ondoConfigured ? "provider_offline" : "provider_unconfigured");
    const referenceLabel = referenceStatus === "live"
      ? "Live display"
      : referenceStatus === "stale"
        ? "Last verified display"
        : referenceStatus === "provider_unconfigured"
          ? "Provider setup pending"
          : "Provider temporarily offline";

    return {
      ...item,
      price: available ? price : undefined,
      period: "Ondo display",
      marketOpen: available && fresh,
      verified: false,
      unavailable: !available,
      referenceStatus,
      referenceLabel,
      referenceTimestamp: timestampMs || undefined,
      sourceMintVerified: Boolean(item.mint && mintChecks[item.symbol]),
      verificationNote: available
        ? `Ondo display reference received${fresh ? "" : " but stale"}; it is never accepted for settlement`
        : `${referenceLabel}; execution remains blocked until independent onchain feeds pass`,
    };
  });

  const privateMarkets = PREIPO_MARKETS.map((item) => {
    const reference = preIpoResult.references[item.mint];
    const referenceStatus = reference
      ? "live"
      : (preIpoResult.reachable ? "not_admitted" : "provider_offline");
    const referenceLabel = reference
      ? "Live DEX display"
      : referenceStatus === "not_admitted"
        ? "Reference not admitted"
        : "Provider temporarily offline";

    return {
      ...item,
      price: reference?.price,
      logo: reference?.logo,
      liquidityUsd: reference?.liquidityUsd,
      pairAddress: reference?.pairAddress,
      period: "24/7 secondary",
      marketOpen: Boolean(reference),
      verified: false,
      unavailable: !reference,
      referenceStatus,
      referenceLabel,
      verificationNote: reference
        ? "DEX display reference available; it is never accepted for settlement"
        : `${referenceLabel}; execution remains blocked`,
    };
  });

  const tesseraMarkets = TESSERA_MARKETS.map((item) => {
    const reference = tesseraResult.references[item.mint];
    const identityMatches = reference?.mint === item.mint && reference?.code?.toLowerCase() === item.ticker.toLowerCase();
    const price = Number(reference?.markPrice);
    const available = identityMatches && Number.isFinite(price) && price > 0;
    const mintVerified = Boolean(mintChecks[item.symbol]);
    return {
      ...item,
      price: available ? price : undefined,
      period: "24/7 issuer display",
      marketOpen: false,
      verified: false,
      unavailable: !available,
      referenceStatus: available ? "timestamp_unavailable" : (tesseraResult.reachable ? "not_admitted" : "provider_offline"),
      referenceLabel: available ? "Display · timestamp unavailable" : (tesseraResult.reachable ? "Identity not admitted" : "Provider temporarily offline"),
      sourceMintVerified: mintVerified,
      pythFeedId: null,
      pricingPolicy: "Pyth primary only when an exact product feed is admitted",
      verificationNote: available
        ? `Tessera issuer mark received and pinned mint ${mintVerified ? "verified on Solana" : "not verified"}; the API supplies no observation timestamp and is never accepted for settlement`
        : "Tessera display reference unavailable; execution remains blocked",
    };
  });

  return Response.json({
    markets: [...publicMarkets, ...privateMarkets, ...tesseraMarkets],
    checkedAt: new Date().toISOString(),
    source: "Ondo authenticated display API + pinned PreStocks DEX references + pinned Tessera public token details",
    providers: {
      ondo: { configured: ondoConfigured, reachable: ondoResult.reachable, purpose: "display-only" },
      prestocksDex: { configured: true, reachable: preIpoResult.reachable, purpose: "display-only" },
      tessera: { configured: true, reachable: tesseraResult.reachable, purpose: "display-only", timestamped: false },
      settlement: { required: 2, admitted: 0, status: "fail-closed" },
    },
  }, {
    headers: {
      "cache-control": "public, max-age=15, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
