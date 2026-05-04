import { NextResponse } from "next/server";
import { proxyToCuub } from "@/lib/cuub-proxy";

const RENTS_DATE_RANGE_RE = /^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/;

type Params = { params: { slug: string[] } };

export async function GET(_req: Request, { params }: Params) {
  const slug = params.slug ?? [];
  if (slug.length === 1) {
    const [dateRange] = slug;
    return proxyToCuub(`/rents/${encodeURIComponent(dateRange)}`);
  }
  if (slug.length === 2) {
    const [first, second] = slug;
    if (second === "all") {
      return proxyToCuub(`/rents/${encodeURIComponent(first)}/all`);
    }
    if (RENTS_DATE_RANGE_RE.test(second)) {
      return proxyToCuub(`/rents/${first}/${second}`);
    }
  }
  return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
}
