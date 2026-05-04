const CUUB_API = "https://api.cuub.tech";

export async function GET() {
  try {
    const upstream = await fetch(`${CUUB_API}/stations/export`, {
      method: "GET",
      headers: { Accept: "text/csv, application/json, */*" },
      cache: "no-store",
    });
    const headers = new Headers();
    const ct = upstream.headers.get("content-type");
    if (ct) headers.set("Content-Type", ct);
    const cd = upstream.headers.get("content-disposition");
    if (cd) headers.set("Content-Disposition", cd);
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (err) {
    console.error("API request error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to fetch from API" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
