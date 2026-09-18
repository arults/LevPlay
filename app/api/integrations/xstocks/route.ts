import { getXStocksPublicSnapshot } from "@/lib/xstocks";

export const runtime = "edge";

export async function GET(request: Request) {
  const symbol = new URL(request.url).searchParams.get("symbol") || "AAPLx";
  try {
    const snapshot = await getXStocksPublicSnapshot(symbol);
    return Response.json({
      provider: "xstocks",
      mode: "public-read-only",
      executionEnabled: false,
      authenticatedAccessConfigured: Boolean(process.env.XSTOCKS_API_KEY),
      tokenStandard: "SPL Token-2022 Scaled UI",
      rawAmountsRequiredForTransactions: true,
      ...snapshot,
    }, { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=30" } });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "xstocks_unavailable";
    const status = reason === "invalid_xstocks_symbol" ? 400 : 503;
    return Response.json({ provider: "xstocks", executionEnabled: false, reason }, { status });
  }
}
