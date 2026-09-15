import { protocolStatus } from "@/lib/protocol";

export const runtime = "edge";

export async function GET() {
  return Response.json(protocolStatus(), { headers: { "cache-control": "no-store" } });
}

