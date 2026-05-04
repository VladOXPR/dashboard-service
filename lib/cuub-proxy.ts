import { NextResponse } from "next/server";

export type ProxyOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
};

const CUUB_API = "https://api.cuub.tech";

export async function proxyToCuub(pathname: string, options: ProxyOptions = {}) {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers ?? {}),
  };
  let body: string | undefined;
  if (options.body !== undefined && options.body !== null) {
    body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    headers["Content-Type"] = "application/json";
  }

  try {
    const upstream = await fetch(CUUB_API + pathname, {
      method,
      headers,
      body,
      cache: "no-store",
    });
    const text = await upstream.text();
    try {
      const data = text.length > 0 ? JSON.parse(text) : null;
      return NextResponse.json(data, { status: upstream.status });
    } catch {
      console.error("Error parsing API response from", pathname);
      return NextResponse.json(
        { success: false, error: "Failed to parse API response" },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error("API request error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch from API" },
      { status: 500 },
    );
  }
}

export async function readJsonBody(req: Request): Promise<unknown> {
  try {
    const text = await req.text();
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export const POS_API_TOKEN =
  process.env.POS_API_TOKEN ||
  "b4798f053612f59dacb7cd42b42a2244635f26e95145e95a97cba00d3890379a";
