import { proxyToCuub } from "@/lib/cuub-proxy";

export async function GET() {
  return proxyToCuub("/scans/");
}
