import { bodyLimit } from "hono/body-limit";
import { proxy } from "hono/proxy";
import { factory } from "server/factory.ts";

export const route = factory
  .createApp()
  .use(bodyLimit({ maxSize: 100 * 1024 * 1024 }))
  .all("/schema", async (c) => {
    // Basic header debug
    const h = c.req.header();
    const reqId = h["x-request-id"] || crypto.randomUUID();
    console.info(`[schema ${reqId}] method=${c.req.method}`);
    console.info(`[schema ${reqId}] hdr content-type=${h["content-type"]}`);
    console.info(
      `[schema ${reqId}] hdr content-encoding=${h["content-encoding"]}`,
    );
    console.info(`[schema ${reqId}] hdr content-length=${h["content-length"]}`);

    // Peek first chunk from a clone (doesn't consume the original stream)
    try {
      const clone = c.req.raw.clone();
      if (clone.body) {
        const reader = clone.body.getReader();
        const result = (await reader.read()) as {
          done: boolean;
          value?: Uint8Array;
        };
        const { value, done } = result;
        if (!done && value && value instanceof Uint8Array) {
          // first 32 bytes as hex
          const first = value.subarray(0, Math.min(32, value.byteLength));
          const hex = Array.from(first)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          const isGzip = first[0] === 0x1f && first[1] === 0x8b;
          console.info(
            `[schema ${reqId}] first-bytes(hex)=${hex} len(firstChunk)=${value.byteLength} isGzip=${isGzip}`,
          );
        } else {
          console.info(`[schema ${reqId}] empty body (no first chunk)`);
        }
        await reader.cancel(); // important: stop reading the clone
      } else {
        console.info(`[schema ${reqId}] no body stream present`);
      }
    } catch (e) {
      console.error(`[schema ${reqId}] peek failed:`, e);
    }

    // Forward unchanged to Flask
    const BASE_URL = c.var.FLASK_URL;
    return proxy(`${BASE_URL}/schema`, {
      raw: c.req.raw, // preserves the original stream
      headers: { ...c.req.header(), "x-request-id": reqId }, // carry tracing id
    });
  });
