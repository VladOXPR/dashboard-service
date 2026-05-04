import { proxyToCuub, readJsonBody } from "@/lib/cuub-proxy";

export async function GET() {
  return proxyToCuub("/users/");
}

export async function POST(req: Request) {
  const body = await readJsonBody(req);
  return proxyToCuub("/users/", { method: "POST", body });
}
