import { proxyToCuub, readJsonBody } from "@/lib/cuub-proxy";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  return proxyToCuub(`/stations/${encodeURIComponent(params.id)}`);
}

export async function PATCH(req: Request, { params }: Params) {
  const body = await readJsonBody(req);
  return proxyToCuub(`/stations/${encodeURIComponent(params.id)}`, { method: "PATCH", body });
}

export async function DELETE(_req: Request, { params }: Params) {
  return proxyToCuub(`/stations/${encodeURIComponent(params.id)}`, { method: "DELETE" });
}
