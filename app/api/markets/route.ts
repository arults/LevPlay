import { PREIPO_MARKETS, TESSERA_MARKETS, TOKEN_2022_PROGRAM, TOKEN_PROGRAM } from "@/lib/markets";
import { isSafeRpcUrl } from "@/lib/protocol";
import { readJsonResponseBounded } from "@/lib/http-safety";

export const runtime = "edge";

type DexPair = { chainId?: string; pairAddress?: string; priceUsd?: string; liquidity?: { usd?: number }; baseToken?: { address?: string }; info?: { imageUrl?: string } };
type PreStocksToken = { company?: string; contract_address?: string; markPrice?: number | string; tokenPrice?: number | string };
type TesseraToken = { id?: string; code?: string; mint?: string; markPrice?: number | string };
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

async function getPreStocksIssuerReferences() {
  const response = await fetch("https://prestocks.com/api/prestocks", { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error("provider_offline");
  const payload = await readJsonResponseBounded(response, 500_000) as PreStocksToken[];
  if (!Array.isArray(payload)) throw new Error("provider_invalid");
  return Object.fromEntries(payload.flatMap((row) => typeof row.contract_address === "string" && BASE58.test(row.contract_address) ? [[row.contract_address, row]] : []));
}

async function getPreStocksDexReferences() {
  const requested = new Set(PREIPO_MARKETS.map((item) => item.mint));
  const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${[...requested].join(",")}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error("provider_offline");
  const payload = await readJsonResponseBounded(response, 2_000_000) as { pairs?: DexPair[] };
  const pairs = Array.isArray(payload.pairs) ? payload.pairs : [];
  return Object.fromEntries([...requested].map((mint) => {
    const pair = pairs.filter((candidate) => candidate.chainId === "solana" && candidate.baseToken?.address === mint && Number(candidate.priceUsd) > 0)
      .sort((left, right) => Number(right.liquidity?.usd || 0) - Number(left.liquidity?.usd || 0))[0];
    return [mint, pair ? { price: Number(pair.priceUsd), liquidityUsd: Number(pair.liquidity?.usd || 0), pairAddress: pair.pairAddress || "", logo: pair.info?.imageUrl?.startsWith("https://cdn.dexscreener.com/") ? pair.info.imageUrl : undefined } : null];
  }));
}

async function getTesseraReferences() {
  const response = await fetch("https://rest-api.tessera.pe/v1/public/token-details", { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error("provider_offline");
  const payload = await readJsonResponseBounded(response, 500_000) as TesseraToken[];
  if (!Array.isArray(payload)) throw new Error("provider_invalid");
  return Object.fromEntries(payload.flatMap((row) => typeof row.mint === "string" && BASE58.test(row.mint) ? [[row.mint, row]] : []));
}

async function verifyPinnedMints(): Promise<Record<string, { valid: boolean; tokenProgram?: string }>> {
  const pinned = [...PREIPO_MARKETS, ...TESSERA_MARKETS];
  const configured = process.env.LEVPLAY_SVM_READ_RPC;
  const rpcs = [...new Set([...(isSafeRpcUrl(configured) ? [configured] : []), "https://api.mainnet-beta.solana.com", "https://solana-rpc.publicnode.com"])];
  for (const rpc of rpcs) {
    try {
      const response = await fetch(rpc, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(pinned.map((item, index) => ({ jsonrpc: "2.0", id: index + 1, method: "getAccountInfo", params: [item.mint, { encoding: "jsonParsed", commitment: "confirmed" }] }))),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) continue;
      const payload = await readJsonResponseBounded(response, 1_000_000) as Array<{ id: number; result?: { value?: { owner?: string; data?: { parsed?: { type?: string; info?: { isInitialized?: boolean } } } } } }>;
      if (!Array.isArray(payload)) continue;
      return Object.fromEntries(payload.flatMap((row) => {
        const item = pinned[row.id - 1];
        if (!item) return [];
        const value = row.result?.value;
        const tokenProgram = value?.owner;
        return [[item.symbol, { valid: (tokenProgram === TOKEN_PROGRAM || tokenProgram === TOKEN_2022_PROGRAM) && value?.data?.parsed?.type === "mint" && value?.data?.parsed?.info?.isInitialized === true, tokenProgram }]];
      }));
    } catch {
      // Continue to the next independent read provider.
    }
  }
  return {};
}

export async function GET() {
  const [issuerResult, dexResult, tesseraResult, mintChecks] = await Promise.all([
    getPreStocksIssuerReferences().then((references) => ({ references, reachable: true })).catch(() => ({ references: {} as Record<string, PreStocksToken>, reachable: false })),
    getPreStocksDexReferences().then((references) => ({ references, reachable: true })).catch(() => ({ references: {} as Record<string, { price: number; liquidityUsd: number; pairAddress: string; logo?: string } | null>, reachable: false })),
    getTesseraReferences().then((references) => ({ references, reachable: true })).catch(() => ({ references: {} as Record<string, TesseraToken>, reachable: false })),
    verifyPinnedMints(),
  ]);

  const prestocks = PREIPO_MARKETS.map((item) => {
    const issuer = issuerResult.references[item.mint];
    const dex = dexResult.references[item.mint];
    const issuerPrice = Number(issuer?.tokenPrice || issuer?.markPrice);
    const price = Number(dex?.price) > 0 ? Number(dex?.price) : issuerPrice;
    const identityMatches = issuer?.contract_address === item.mint;
    const available = identityMatches && Number.isFinite(price) && price > 0;
    const mintVerified = Boolean(mintChecks[item.symbol]?.valid);
    return {
      ...item, price: available ? price : undefined, logo: dex?.logo || item.logo, liquidityUsd: dex?.liquidityUsd, pairAddress: dex?.pairAddress,
      period: "24/7 display reference", marketOpen: available, verified: false, unavailable: !available,
      referenceStatus: available ? "timestamp_unavailable" : (issuerResult.reachable ? "not_admitted" : "provider_offline"),
      referenceLabel: available ? (dex ? "DEX display · issuer identity pinned" : "Issuer display · timestamp unavailable") : (issuerResult.reachable ? "Reference identity unavailable" : "Provider temporarily offline"),
      sourceMintVerified: mintVerified, tokenProgram: mintChecks[item.symbol]?.tokenProgram,
      verificationNote: available ? `PreStocks identity is pinned and the source mint is ${mintVerified ? "verified" : "not verified"} on Solana; issuer and DEX prices are display-only and cannot settle a trade` : "PreStocks reference unavailable; execution remains blocked",
    };
  });

  const tessera = TESSERA_MARKETS.map((item) => {
    const reference = tesseraResult.references[item.mint];
    const identityMatches = reference?.mint === item.mint && reference?.code?.toLowerCase() === item.ticker.toLowerCase();
    const price = Number(reference?.markPrice);
    const available = identityMatches && Number.isFinite(price) && price > 0;
    const mintVerified = Boolean(mintChecks[item.symbol]?.valid);
    return {
      ...item, price: available ? price : undefined, period: "24/7 issuer display", marketOpen: available, verified: false, unavailable: !available,
      referenceStatus: available ? "timestamp_unavailable" : (tesseraResult.reachable ? "not_admitted" : "provider_offline"),
      referenceLabel: available ? "Issuer display · timestamp unavailable" : (tesseraResult.reachable ? "Identity not admitted" : "Provider temporarily offline"),
      sourceMintVerified: mintVerified, tokenProgram: mintChecks[item.symbol]?.tokenProgram,
      verificationNote: available ? `Tessera issuer mark and pinned identity received; source mint is ${mintVerified ? "verified" : "not verified"} on Solana. The API has no observation timestamp and cannot settle a trade` : "Tessera display reference unavailable; execution remains blocked",
    };
  });

  return Response.json({
    markets: [...prestocks, ...tessera], checkedAt: new Date().toISOString(),
    source: "Pinned PreStocks issuer + DEX display references and pinned Tessera issuer references",
    providers: {
      prestocks: { configured: true, reachable: issuerResult.reachable, purpose: "identity-and-display-only", timestamped: false },
      prestocksDex: { configured: true, reachable: dexResult.reachable, purpose: "display-and-liquidity-only" },
      tessera: { configured: true, reachable: tesseraResult.reachable, purpose: "identity-and-display-only", timestamped: false },
      settlement: { required: 2, admitted: 0, status: "fail-closed" },
    },
  }, { headers: { "cache-control": "public, max-age=15, s-maxage=30, stale-while-revalidate=60" } });
}
