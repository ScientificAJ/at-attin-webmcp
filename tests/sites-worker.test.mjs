import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import worker, { AGENT_TOOL_NAMES, createWorker } from "../worker/index.js";

test("keeps the server allowlist aligned to the exact 56 imperative tools", () => {
  assert.equal(AGENT_TOOL_NAMES.length, 56);
  assert.equal(new Set(AGENT_TOOL_NAMES).size, 56);
});

test("serves existing static assets without a fallback", async () => {
  const calls = [];
  const response = await worker.fetch(new Request("https://example.test/assets/app.js"), {
    ASSETS: {
      fetch: async (request) => {
        calls.push(new URL(request.url).pathname);
        return new Response("asset", { status: 200 });
      },
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/assets/app.js"]);
});

test("falls back to index.html for an unknown app route", async () => {
  const calls = [];
  const response = await worker.fetch(
    new Request("https://example.test/flow/step-two?source=share", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async (request) => {
          const url = new URL(request.url);
          calls.push(url.pathname + url.search);
          return new Response(url.pathname === "/" ? "app" : "missing", {
            status: url.pathname === "/" ? 200 : 404,
          });
        },
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/flow/step-two?source=share", "/"]);
});

test("adds browser security headers to prevent confirmation clickjacking", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/settings/agent", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async (request) => new Response(
          new URL(request.url).pathname === "/index.html" ? "app" : "missing",
          { status: new URL(request.url).pathname === "/index.html" ? 200 : 404 },
        ),
      },
    },
  );

  assert.match(
    response.headers.get("content-security-policy") ?? "",
    /frame-ancestors 'none'/,
  );
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.match(response.headers.get("permissions-policy") ?? "", /payment=\(\)/);
});

test("does not turn missing API or write requests into the app shell", async () => {
  for (const request of [
    new Request("https://example.test/api/missing", { headers: { accept: "application/json" } }),
    new Request("https://example.test/flow", { method: "POST", headers: { accept: "text/html" } }),
  ]) {
    let calls = 0;
    const response = await worker.fetch(request, {
      ASSETS: {
        fetch: async () => {
          calls += 1;
          return new Response("missing", { status: 404 });
        },
      },
    });

    assert.equal(response.status, 404);
    assert.equal(calls, 1);
  }
});

test("routes a same-origin agent request through Featherless and returns one bounded tool call", async () => {
  const agentWorker = createWorker({
    fetchImpl: async (url, init) => {
      assert.equal(url, "https://api.featherless.ai/v1/chat/completions");
      assert.equal(init.headers.Authorization, "Bearer server-only-key");
      const outbound = JSON.parse(init.body);
      assert.equal(outbound.model, "moonshotai/Kimi-K3");
      assert.equal(outbound.parallel_tool_calls, false);
      assert.equal(outbound.tools[0].function.name, "get_overview");
      return new Response(JSON.stringify({
        model: "moonshotai/Kimi-K3",
        choices: [{
          message: {
            role: "assistant",
            content: null,
            tool_calls: [{
              id: "call-overview",
              type: "function",
              function: { name: "get_overview", arguments: "{}" },
            }],
          },
        }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    },
  });
  const response = await agentWorker.fetch(new Request("https://example.test/api/agent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://example.test",
    },
    body: JSON.stringify({
      userText: "Show my overview",
      steps: [],
      tools: [{
        name: "get_overview",
        description: "Prepare a concise overview.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      }],
    }),
  }), {
    ASSETS: { fetch: async () => new Response("missing", { status: 404 }) },
    FEATHERLESS_API_KEY: "server-only-key",
    FEATHERLESS_MODEL: "moonshotai/Kimi-K3",
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    kind: "tool_call",
    id: "call-overview",
    name: "get_overview",
    arguments: {},
    model: "moonshotai/Kimi-K3",
  });
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("fails closed when the Featherless secret or same-origin boundary is missing", async () => {
  const env = {
    ASSETS: { fetch: async () => new Response("missing", { status: 404 }) },
  };
  const requestBody = JSON.stringify({ userText: "Show my overview", steps: [], tools: [] });

  const missingSecret = await worker.fetch(new Request("https://example.test/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.test" },
    body: requestBody,
  }), env);
  assert.equal(missingSecret.status, 503);
  assert.deepEqual(await missingSecret.json(), { error: "agent-unavailable" });

  const crossOrigin = await worker.fetch(new Request("https://example.test/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://attacker.test" },
    body: requestBody,
  }), { ...env, FEATHERLESS_API_KEY: "server-only-key" });
  assert.equal(crossOrigin.status, 403);
  assert.deepEqual(await crossOrigin.json(), { error: "cross-origin-agent-request" });
});

test("emits the files required by Sites packaging", async () => {
  await access(new URL("../dist/client/index.html", import.meta.url));
  await access(new URL("../dist/server/index.js", import.meta.url));
  await access(new URL("../dist/.openai/hosting.json", import.meta.url));
  const staticHeaders = await readFile(
    new URL("../dist/client/_headers", import.meta.url),
    "utf8",
  );
  assert.match(staticHeaders, /frame-ancestors 'none'/);
  assert.match(staticHeaders, /X-Frame-Options: DENY/i);
});

test("keeps the built app shell behind the security-header Worker", async () => {
  const builtWorker = (
    await import(new URL("../dist/server/index.js?secure-shell", import.meta.url))
  ).default;
  const response = await builtWorker.fetch(
    new Request("https://example.test/settings/agent", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("missing", { status: 404 }),
      },
    },
  );

  assert.equal(response.status, 200);
  assert.match(await response.text(), /<title>At Attin<\/title>/);
  assert.match(
    response.headers.get("content-security-policy") ?? "",
    /frame-ancestors 'none'/,
  );

  const publicRoot = await readFile(
    new URL("../dist/client/index.html", import.meta.url),
    "utf8",
  );
  assert.match(publicRoot, /location\.replace\("\/login"\)/);
  assert.doesNotMatch(publicRoot, /\/assets\/index-[^\"]+\.js/);
});
