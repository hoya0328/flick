import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";
function worker() {
  const handlers: Record<string, (event: unknown) => void> = {},
    fetch = vi.fn().mockResolvedValue(new Response("ok"));
  const cache = {
    match: vi.fn().mockResolvedValue(undefined),
    put: vi.fn(),
    add: vi.fn().mockResolvedValue(undefined),
  };
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    match: vi.fn().mockResolvedValue(new Response("OFFLINE")),
    keys: vi.fn().mockResolvedValue(["flick-public-old", "unrelated"]),
    delete: vi.fn().mockResolvedValue(true),
  };
  vm.runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: {
      location: { origin: "https://flick.test" },
      addEventListener: (name: string, fn: (event: unknown) => void) => {
        handlers[name] = fn;
      },
    },
    URL,
    Response,
    caches,
    fetch,
  });
  return { handlers, fetch, cache, caches };
}
describe("static-only service worker runtime", () => {
  it("ignores mutations, cross-origin API/signed images, and same-origin private resources", () => {
    const { handlers, fetch } = worker();
    for (const [url, method] of [
      ["https://api.supabase.co/auth/v1/token", "POST"],
      [
        "https://api.supabase.co/storage/v1/object/sign/core-photos/private.jpg?token=secret",
        "GET",
      ],
      ["https://flick.test/rest/v1/profiles", "GET"],
      ["https://flick.test/private.json", "GET"],
      ["https://flick.test/icons/x.png?token=secret", "GET"],
    ]) {
      const respondWith = vi.fn();
      handlers.fetch!({ request: { url, method, mode: "cors" }, respondWith });
      expect(respondWith).not.toHaveBeenCalled();
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it("uses network for navigation and offline fallback without caching personal HTML", async () => {
    const w = worker();
    w.fetch.mockRejectedValueOnce(new Error("offline"));
    let response: Promise<Response> | undefined;
    w.handlers.fetch!({
      request: {
        url: "https://flick.test/profile",
        method: "GET",
        mode: "navigate",
      },
      respondWith: (value: Promise<Response>) => {
        response = value;
      },
    });
    expect(await (await response!)!.text()).toBe("OFFLINE");
    expect(w.cache.put).not.toHaveBeenCalled();
    expect(w.caches.match).toHaveBeenCalledWith("/offline.html");
  });
  it("caches a successful same-origin static bundle and removes only its own old caches", async () => {
    const w = worker();
    w.fetch.mockResolvedValueOnce({
      ok: true,
      type: "basic",
      clone: () => ({ body: "static" }),
    } as unknown as Response);
    let work: Promise<unknown> | undefined;
    const request = {
      url: "https://flick.test/_expo/static/js/web/entry-123.js",
      method: "GET",
      mode: "cors",
    };
    w.handlers.fetch!({
      request,
      respondWith: (value: Promise<unknown>) => {
        work = value;
      },
    });
    await work;
    expect(w.cache.put).toHaveBeenCalledWith(request, { body: "static" });
    w.handlers.activate!({
      waitUntil: (value: Promise<unknown>) => {
        work = value;
      },
    });
    await work;
    expect(w.caches.delete).toHaveBeenCalledExactlyOnceWith("flick-public-old");
  });
});
