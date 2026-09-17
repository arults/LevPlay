import { CURATED_MARKETS, SOLANA_USDC_MINT, TOKEN_2022_PROGRAM, TOKEN_PROGRAM } from "@/lib/markets";
import { isSafeRpcUrl, isSolanaAddress } from "@/lib/protocol";
import { BodyTooLargeError, InstanceRateLimiter, readJsonBodyBounded, readJsonResponseBounded } from "@/lib/http-safety";

export const runtime = "edge";

type RpcResult = { result?: unknown; error?: { message?: string } };
const DEFAULT_RPCS = ["https://api.mainnet-beta.solana.com", "https://solana-rpc.publicnode.com"];
const REQUEST_LIMIT_BYTES = 1_024;
const RPC_RESPONSE_LIMIT_BYTES = 2_000_000;
const ipLimiter = new InstanceRateLimiter(30, 60_000);
const walletLimiter = new InstanceRateLimiter(15, 60_000);

function rpcUrls() {
  try {
    const configured = JSON.parse(process.env.LEVPLAY_SVM_RPC_URLS_JSON || "[]") as unknown;
    const valid = Array.isArray(configured) ? configured.filter(isSafeRpcUrl).slice(0, 4) : [];
    return [...new Set([...valid, ...DEFAULT_RPCS])];
  } catch {
    return DEFAULT_RPCS;
  }
}

async function callRpc(url: string, method: string, params: unknown[]) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(7_000),
  });
  let payload: RpcResult;
  try {
    payload = await readJsonResponseBounded(response, RPC_RESPONSE_LIMIT_BYTES) as RpcResult;
  } catch (error) {
    if (error instanceof BodyTooLargeError) throw new Error("Oversized RPC response");
    throw error;
  }
  if (!response.ok || payload.error || payload.result === undefined) throw new Error(payload.error?.message || "RPC error");
  return payload.result;
}

async function readWallet(address: string) {
  let lastError: unknown;
  for (const rpc of rpcUrls()) {
    try {
      const [genesis, balance, classic, token2022] = await Promise.all([
        callRpc(rpc, "getGenesisHash", []),
        callRpc(rpc, "getBalance", [address, { commitment: "confirmed" }]),
        callRpc(rpc, "getTokenAccountsByOwner", [address, { programId: TOKEN_PROGRAM }, { encoding: "jsonParsed", commitment: "confirmed" }]),
        callRpc(rpc, "getTokenAccountsByOwner", [address, { programId: TOKEN_2022_PROGRAM }, { encoding: "jsonParsed", commitment: "confirmed" }]),
      ]);
      if (genesis !== "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp") throw new Error("Not Solana mainnet");
      const lamports = Number((balance as { value?: number }).value || 0);
      const knownMints = new Set([SOLANA_USDC_MINT, ...CURATED_MARKETS.map((market) => market.mint)]);
      const accounts = [...((classic as { value?: unknown[] }).value || []), ...((token2022 as { value?: unknown[] }).value || [])];
      const tokens = accounts.flatMap((entry) => {
        const account = entry as { account?: { data?: { parsed?: { info?: { mint?: string; tokenAmount?: { uiAmountString?: string; amount?: string; decimals?: number } } } } } };
        const info = account.account?.data?.parsed?.info;
        const mint = info?.mint;
        if (!mint || !knownMints.has(mint)) return [];
        return [{ mint, amount: info.tokenAmount?.uiAmountString || "0", rawAmount: info.tokenAmount?.amount || "0", decimals: info.tokenAmount?.decimals || 0 }];
      });
      return { sol: lamports / 1_000_000_000, tokens, rpc: new URL(rpc).hostname };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("All Solana RPCs failed");
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return Response.json({ error: "JSON required" }, { status: 415 });
  let address = "";
  try {
    const body = await readJsonBodyBounded(request, REQUEST_LIMIT_BYTES) as { address?: unknown };
    address = typeof body?.address === "string" ? body.address : "";
  } catch (error) {
    if (error instanceof BodyTooLargeError) return Response.json({ error: "Request too large" }, { status: 413 });
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isSolanaAddress(address)) return Response.json({ error: "Invalid Solana address" }, { status: 400 });
  const forwarded = request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for") || "unknown";
  const clientKey = forwarded.split(",", 1)[0].trim().slice(0, 64) || "unknown";
  const limits = [ipLimiter.take(`ip:${clientKey}`), walletLimiter.take(`wallet:${address}`)];
  const rejected = limits.find((result) => !result.allowed);
  if (rejected) {
    return Response.json(
      { error: "Too many wallet balance requests" },
      { status: 429, headers: { "retry-after": String(rejected.retryAfterSeconds), "cache-control": "no-store" } },
    );
  }
  try {
    return Response.json(await readWallet(address), { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Solana balance providers are unavailable" }, { status: 503 });
  }
}
