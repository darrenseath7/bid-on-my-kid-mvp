import { NextResponse } from "next/server";

type RateLimitOptions = {
  keyPrefix: string;
  limit: number;
  windowMs: number;
  message?: string;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __bragwallRateLimitStore: Map<string, RateLimitEntry> | undefined;
}

function getStore() {
  if (!globalThis.__bragwallRateLimitStore) {
    globalThis.__bragwallRateLimitStore = new Map<string, RateLimitEntry>();
  }

  return globalThis.__bragwallRateLimitStore;
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-client-ip") ||
    "unknown"
  );
}

function cleanupExpiredEntries(now: number) {
  const store = getStore();

  if (store.size < 500) {
    return;
  }

  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function rateLimit(request: Request, options: RateLimitOptions) {
  const now = Date.now();
  const store = getStore();
  const ip = getClientIp(request);
  const key = `${options.keyPrefix}:${ip}`;
  const existing = store.get(key);

  cleanupExpiredEntries(now);

  if (!existing || existing.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });

    return null;
  }

  existing.count += 1;
  store.set(key, existing);

  if (existing.count <= options.limit) {
    return null;
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((existing.resetAt - now) / 1000)
  );

  return NextResponse.json(
    {
      error:
        options.message ||
        "Too many requests. Please wait a moment and try again.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}
