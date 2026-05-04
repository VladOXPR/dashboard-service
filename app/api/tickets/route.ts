import { proxyToCuub, readJsonBody } from "@/lib/cuub-proxy";

export async function GET() {
  return proxyToCuub("/tickets/");
}

export async function POST(req: Request) {
  const body = await readJsonBody(req);
  return proxyToCuub("/tickets/", { method: "POST", body });
}
