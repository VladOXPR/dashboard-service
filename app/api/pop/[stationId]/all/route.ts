import { proxyToCuub } from "@/lib/cuub-proxy";

type Params = { params: { stationId: string } };

export async function POST(_req: Request, { params }: Params) {
  return proxyToCuub(`/pop/${encodeURIComponent(params.stationId)}/all`, { method: "POST" });
}
