import { describe, expect, test } from "bun:test";

import worker, { isPageRequest, replaceMeta } from "./worker.js";

// ---------------------------------------------------------------------------
// ZKU-58: unit tests for worker.js — route-based meta-tag injection and the
// Content-Length header fix (stale Content-Length must be dropped whenever
// the HTML body is rewritten, otherwise strict clients/CDNs can truncate the
// page).
// ---------------------------------------------------------------------------

const SAMPLE_HTML = `<!doctype html>
<html>
<head>
<title>Old Title</title>
<meta property="og:title" content="Old OG Title">
<meta name="twitter:title" content="Old Twitter Title">
<meta name="description" content="Old description">
<meta property="og:description" content="Old OG description">
<meta name="twitter:description" content="Old Twitter description">
<link rel="canonical" href="https://old.example.com/">
<meta property="og:url" content="https://old.example.com/">
</head>
<body></body>
</html>`;

describe("isPageRequest", () => {
  test("returns true for the root path with an HTML Accept header", () => {
    const request = new Request("https://splittrip.app/", {
      headers: { Accept: "text/html,application/xhtml+xml" }
    });
    expect(isPageRequest(request)).toBe(true);
  });

  test("returns true for an extension-less route with an HTML Accept header", () => {
    const request = new Request("https://splittrip.app/trips", {
      headers: { Accept: "text/html" }
    });
    expect(isPageRequest(request)).toBe(true);
  });

  test("returns false for a static asset request (has a file extension)", () => {
    const request = new Request("https://splittrip.app/assets/app.js", {
      headers: { Accept: "*/*" }
    });
    expect(isPageRequest(request)).toBe(false);
  });

  test("returns false when the Accept header does not include text/html", () => {
    const request = new Request("https://splittrip.app/trips", {
      headers: { Accept: "application/json" }
    });
    expect(isPageRequest(request)).toBe(false);
  });

  test("returns true for a route explicitly ending in .html", () => {
    const request = new Request("https://splittrip.app/trips.html", {
      headers: { Accept: "text/html" }
    });
    expect(isPageRequest(request)).toBe(true);
  });
});

describe("replaceMeta", () => {
  test("replaces the <title>, og:title and twitter:title tags", () => {
    const result = replaceMeta(SAMPLE_HTML, { title: "New Title" });
    expect(result).toContain("<title>New Title</title>");
    expect(result).toContain('<meta property="og:title" content="New Title">');
    expect(result).toContain('<meta name="twitter:title" content="New Title">');
  });

  test("replaces description, og:description and twitter:description tags", () => {
    const result = replaceMeta(SAMPLE_HTML, { description: "New description" });
    expect(result).toContain('<meta name="description" content="New description">');
    expect(result).toContain('<meta property="og:description" content="New description">');
    expect(result).toContain('<meta name="twitter:description" content="New description">');
  });

  test("replaces the canonical link and og:url tags", () => {
    const result = replaceMeta(SAMPLE_HTML, { url: "https://splittrip.app/trips" });
    expect(result).toContain('<link rel="canonical" href="https://splittrip.app/trips">');
    expect(result).toContain('<meta property="og:url" content="https://splittrip.app/trips">');
  });

  test("leaves the html untouched when no overrides are given", () => {
    expect(replaceMeta(SAMPLE_HTML, {})).toBe(SAMPLE_HTML);
  });

  test("applies title, description and url together", () => {
    const result = replaceMeta(SAMPLE_HTML, {
      title: "Dashboard | SplitTrip",
      description: "Your dashboard.",
      url: "https://splittrip.app/home"
    });
    expect(result).toContain("<title>Dashboard | SplitTrip</title>");
    expect(result).toContain('<meta name="description" content="Your dashboard.">');
    expect(result).toContain('<link rel="canonical" href="https://splittrip.app/home">');
  });
});

describe("default export fetch handler — Content-Length fix", () => {
  test("drops the stale Content-Length header when meta tags are injected", async () => {
    const request = new Request("https://splittrip.app/", {
      headers: { Accept: "text/html" }
    });
    const env = {
      ASSETS: {
        fetch: async () =>
          new Response(SAMPLE_HTML, {
            status: 200,
            headers: {
              "Content-Type": "text/html",
              "Content-Length": String(SAMPLE_HTML.length)
            }
          })
      }
    };

    const response = await worker.fetch(request, env);
    const body = await response.text();

    expect(response.headers.get("Content-Length")).toBeNull();
    expect(body).toContain("<title>SplitTrip | Split travel expenses with zero hassle</title>");
    // The injected body length differs from the original asset's length, so
    // asserting the header is gone (rather than recomputed) guards against
    // regressing to a stale, now-incorrect Content-Length.
    expect(body.length).not.toBe(SAMPLE_HTML.length);
  });

  test("passes through asset responses untouched for routes with no meta override", async () => {
    const request = new Request("https://splittrip.app/some-unmapped-route", {
      headers: { Accept: "text/html" }
    });
    const env = {
      ASSETS: {
        fetch: async () =>
          new Response(SAMPLE_HTML, {
            status: 200,
            headers: {
              "Content-Type": "text/html",
              "Content-Length": String(SAMPLE_HTML.length)
            }
          })
      }
    };

    const response = await worker.fetch(request, env);

    expect(response.headers.get("Content-Length")).toBe(String(SAMPLE_HTML.length));
  });

  test("passes non-page requests straight through to env.ASSETS.fetch", async () => {
    const request = new Request("https://splittrip.app/assets/app.js", {
      headers: { Accept: "*/*" }
    });
    let calledWithRequest = null;
    const env = {
      ASSETS: {
        fetch: async (req) => {
          calledWithRequest = req;
          return new Response("console.log(1)", {
            headers: { "Content-Type": "application/javascript" }
          });
        }
      }
    };

    const response = await worker.fetch(request, env);

    expect(calledWithRequest).toBe(request);
    expect(await response.text()).toBe("console.log(1)");
  });
});
