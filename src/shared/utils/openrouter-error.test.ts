import { describe, expect, test } from "vitest";

import { openRouterErrorMessage, openRouterStatusCode } from "./openrouter-error";

const http = (statusCode: number): Error =>
  Object.assign(new Error(`Status ${statusCode} Body: <!DOCTYPE html><html>`), { statusCode });

describe("openRouterErrorMessage", () => {
  test("never shows the raw response body", () => {
    for (const status of [400, 401, 402, 403, 404, 408, 429, 500, 502, 504]) {
      expect(openRouterErrorMessage(http(status), "Request failed.")).not.toMatch(/Status|html/u);
    }
  });

  test("names the action for the common failures", () => {
    expect(openRouterErrorMessage(http(401), "x")).toMatch(/Reconnect/u);
    expect(openRouterErrorMessage(http(402), "x")).toMatch(/balance/u);
    expect(openRouterErrorMessage(http(404), "x")).toMatch(/Choose another/u);
    expect(openRouterErrorMessage(http(429), "x")).toMatch(/rate limiting/u);
    expect(openRouterErrorMessage(http(503), "x")).toMatch(/Try again/u);
  });

  test("recognises transport failures by name", () => {
    const named = (name: string): Error => Object.assign(new Error("fetch failed"), { name });
    expect(openRouterErrorMessage(named("ConnectionError"), "x")).toMatch(/connection/u);
    expect(openRouterErrorMessage(named("RequestTimeoutError"), "x")).toMatch(/too long/u);
    expect(openRouterErrorMessage(named("RequestAbortedError"), "x")).toMatch(/cancelled/u);
  });

  test("keeps a plain sentence from OpenRouter", () => {
    const stated = Object.assign(new Error("Code expired"), { statusCode: 403 });
    expect(openRouterErrorMessage(stated, "x")).toBe("Code expired");
    const untyped = Object.assign(new Error("API error occurred: Status 402 Body: {…}"), {
      statusCode: 402,
      body: JSON.stringify({ error: { message: "This request requires more credits." } }),
    });
    expect(openRouterErrorMessage(untyped, "x")).toBe("This request requires more credits.");
    expect(openRouterErrorMessage(new Error("Insufficient credits"), "x")).toBe(
      "Insufficient credits",
    );
  });

  test("falls back for anything else", () => {
    expect(openRouterErrorMessage(new Error('{"raw":"json"}'), "Request failed.")).toBe(
      "Request failed.",
    );
    expect(openRouterErrorMessage(http(418), "Request failed.")).toBe("Request failed.");
    expect(openRouterErrorMessage(null, "Request failed.")).toBe("Request failed.");
    expect(openRouterStatusCode(http(429))).toBe(429);
    expect(openRouterStatusCode("nope")).toBeNull();
  });
});
