export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const requestsByIp = new Map();

function jsonError(status, message, headers = {}) {
  return Response.json(
    { error: { message } },
    { status, headers: { "Cache-Control": "no-store", ...headers } }
  );
}

function isValidCity(city) {
  // Reject markup and ASCII control characters; allow normal international city names.
  return typeof city === "string"
    && city.length > 0
    && city.length <= 100
    && !/[<>\u0000-\u001F\u007F]/.test(city);
}

function isRateLimited(ip) {
  const now = Date.now();

  // Best-effort per-instance limiter; serverless instances do not share memory.
  if (requestsByIp.size > 5000) {
    for (const [key, entry] of requestsByIp) {
      if (now - entry.start >= WINDOW_MS) requestsByIp.delete(key);
    }
  }

  let entry = requestsByIp.get(ip);
  if (!entry || now - entry.start >= WINDOW_MS) {
    requestsByIp.set(ip, { start: now, count: 1 });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_REQUESTS;
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const city = (requestUrl.searchParams.get("city") || "").trim();

  if (!isValidCity(city)) {
    return jsonError(400, "Enter a valid city name.");
  }

  const apiKey = process.env.WEATHERAPI_KEY;
  if (!apiKey) {
    return jsonError(500, "Weather service is not configured. Add WEATHERAPI_KEY in Vercel Environment Variables.");
  }

  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(clientIp)) {
    return jsonError(429, "Too many requests. Please wait and try again.", { "Retry-After": "60" });
  }

  const upstreamUrl = new URL("https://api.weatherapi.com/v1/current.json");
  upstreamUrl.searchParams.set("key", apiKey);
  upstreamUrl.searchParams.set("q", city);
  upstreamUrl.searchParams.set("aqi", "no");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal
    });

    const responseBody = await upstream.text();

    return new Response(responseBody, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      return jsonError(504, "Weather provider timed out. Please try again.");
    }
    return jsonError(502, "Unable to reach the weather provider. Please try again.");
  } finally {
    clearTimeout(timeout);
  }
}
