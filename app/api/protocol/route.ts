import { protocolStatus } from "@/lib/protocol";

export const runtime = "edge";

export async function GET() {
  return Response.json(await protocolStatus(), { headers: { "cache-control": "no-store" } });
}
