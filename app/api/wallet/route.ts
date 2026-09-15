import { CURATED_MARKETS, SOLANA_USDC_MINT, TOKEN_2022_PROGRAM, TOKEN_PROGRAM } from "@/lib/markets";
import { isSolanaAddress } from "@/lib/protocol";

export const runtime = "edge";

type RpcResult = { result?: unknown; error?: { message?: string } };
const DEFAULT_RPCS = ["https://api.mainnet-beta.solana.com", "https://solana-rpc.publicnode.com"];

function rpcUrls() {
  try {
    const configured = JSON.parse(process.env.LEVPLAY_SVM_RPC_URLS_JSON || "[]") as unknown;
    const valid = Array.isArray(configured) ? configured.filter((url): url is string => typeof url === "string" && /^https:\/\/[^@\s]+$/.test(url)).slice(0, 4) : [];
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
  const payload = await response.json() as RpcResult;
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
  let address = "";
  try { address = String(((await request.json()) as { address?: string }).address || ""); } catch { /* handled below */ }
  if (!isSolanaAddress(address)) return Response.json({ error: "Invalid Solana address" }, { status: 400 });
  try {
    return Response.json(await readWallet(address), { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Solana balance providers are unavailable" }, { status: 503 });
  }
}
