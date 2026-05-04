import { proxyToCuub, POS_API_TOKEN } from "@/lib/cuub-proxy";

export async function GET() {
  return proxyToCuub("/pos/rents", {
    headers: { Authorization: "Bearer " + POS_API_TOKEN },
  });
}
