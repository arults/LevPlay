export class BodyTooLargeError extends Error {
  constructor() {
    super("Request body exceeds the configured limit");
    this.name = "BodyTooLargeError";
  }
}

function declaredLength(headers: Headers) {
  const value = headers.get("content-length");
  if (value === null) return null;
  if (!/^\d+$/.test(value)) throw new BodyTooLargeError();
  return Number(value);
}

async function readBoundedBytes(body: ReadableStream<Uint8Array> | null, maxBytes: number) {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel("body limit exceeded");
        throw new BodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function readJsonBodyBounded(request: Request, maxBytes: number) {
  const length = declaredLength(request.headers);
  if (length !== null && length > maxBytes) throw new BodyTooLargeError();
  const bytes = await readBoundedBytes(request.body, maxBytes);
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
}

export async function readJsonResponseBounded(response: Response, maxBytes: number) {
  const length = declaredLength(response.headers);
  if (length !== null && length > maxBytes) throw new BodyTooLargeError();
  const bytes = await readBoundedBytes(response.body, maxBytes);
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
}

type Window = { count: number; resetAt: number };

/**
 * Best-effort protection for one warm runtime instance. This is deliberately
 * not described as a distributed or durable production rate limit.
 */
export class InstanceRateLimiter {
  private readonly windows = new Map<string, Window>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly maxKeys: number;

  constructor(limit: number, windowMs: number, maxKeys = 2_048) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.maxKeys = maxKeys;
  }

  take(key: string, now = Date.now()) {
    const current = this.windows.get(key);
    if (!current || current.resetAt <= now) {
      if (!current && this.windows.size >= this.maxKeys) this.prune(now);
      if (this.windows.size >= this.maxKeys) return { allowed: false, retryAfterSeconds: 1 };
      this.windows.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (current.count >= this.limit) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)) };
    }
    current.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  private prune(now: number) {
    for (const [key, value] of this.windows) {
      if (value.resetAt <= now) this.windows.delete(key);
    }
  }
}
