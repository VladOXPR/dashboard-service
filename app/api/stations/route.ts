import { proxyToCuub, readJsonBody } from "@/lib/cuub-proxy";

export async function GET() {
  return proxyToCuub("/stations/");
}

export async function POST(req: Request) {
  const body = await readJsonBody(req);
  return proxyToCuub("/stations", { method: "POST", body });
}
