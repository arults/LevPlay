import assert from "node:assert/strict";
import { BodyTooLargeError, InstanceRateLimiter, readJsonBodyBounded, readJsonResponseBounded } from "../lib/http-safety.ts";

function chunked(chunks) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    },
  });
}

const parsed = await readJsonBodyBounded(new Request("https://app.levplay.tech/api/wallet", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: chunked(['{"address":"', 'abc', '"}']),
  duplex: "half",
}), 64);
assert.deepEqual(parsed, { address: "abc" });

await assert.rejects(
  readJsonBodyBounded(new Request("https://app.levplay.tech/api/wallet", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: chunked(["1234", "5678", "9"]),
    duplex: "half",
  }), 8),
  BodyTooLargeError,
  "chunked requests must stop after the byte limit even without Content-Length",
);

await assert.rejects(
  readJsonBodyBounded(new Request("https://app.levplay.tech/api/wallet", {
    method: "POST",
    headers: { "content-type": "application/json", "content-length": "999" },
    body: "{}",
  }), 8),
  BodyTooLargeError,
  "declared oversized requests must fail before parsing",
);

await assert.rejects(
  readJsonResponseBounded(new Response(chunked(["1234", "5678", "9"])), 8),
  BodyTooLargeError,
  "chunked upstream responses must stop after the byte limit",
);

const limiter = new InstanceRateLimiter(2, 1_000, 2);
assert.equal(limiter.take("a", 10).allowed, true);
assert.equal(limiter.take("a", 11).allowed, true);
assert.deepEqual(limiter.take("a", 12), { allowed: false, retryAfterSeconds: 1 });
assert.equal(limiter.take("b", 12).allowed, true);
assert.equal(limiter.take("c", 12).allowed, false, "key cardinality must remain bounded");
assert.equal(limiter.take("c", 1_011).allowed, true, "expired windows must be pruned");

console.log("LevPlay bounded HTTP parsing and instance rate-limit tests passed");
