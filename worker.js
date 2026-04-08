/**
 * Cloudflare Worker – serves the SPA with per-route meta-tag injection so that
 * search-engine crawlers and social-media link previews see the correct title,
 * description and Open Graph tags for each public page.
 */

const SITE_URL = "https://splittrip.app";

/** Route-specific meta overrides.  Any route not listed here falls through to
 *  the defaults baked into the SPA shell by +html.tsx. */
const ROUTE_META = {
  "/": {
    title: "SplitTrip | Shared travel expenses",
    description:
      "Track group travel spending, split costs fairly, and settle in one pass. Create a trip, invite friends, log expenses in any currency, and let SplitTrip calculate the minimum repayments.",
  },
  "/sign-in": {
    title: "Sign in | SplitTrip",
    description:
      "Sign in to SplitTrip to manage your shared travel expenses, create trips, and settle up with friends.",
  },
  "/home": {
    title: "Dashboard | SplitTrip",
    description:
      "Your SplitTrip dashboard – see active trips, recent activity, and outstanding balances at a glance.",
  },
  "/trips": {
    title: "Your Trips | SplitTrip",
    description:
      "View and manage all your group trips. Create a new trip, invite members, and start tracking shared expenses.",
  },
  "/account": {
    title: "Account Settings | SplitTrip",
    description:
      "Manage your SplitTrip account, payment methods, and preferences.",
  },
};

/** Returns true when the request is for an HTML page (not a static asset). */
function isPageRequest(request) {
  const url = new URL(request.url);
  const ext = url.pathname.split(".").pop();
  // If there is no file extension, or it is explicitly .html, treat it as a page
  if (url.pathname === "/" || !ext || ext === url.pathname.slice(1) || ext === "html") {
    const accept = request.headers.get("Accept") || "";
    return accept.includes("text/html");
  }
  return false;
}

/** Replace the content of a single meta/title tag inside an HTML string. */
function replaceMeta(html, { title, description, url }) {
  if (title) {
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
    html = html.replace(
      /(<meta\s+property="og:title"\s+content=")[^"]*(")/,
      `$1${title}$2`,
    );
    html = html.replace(
      /(<meta\s+name="twitter:title"\s+content=")[^"]*(")/,
      `$1${title}$2`,
    );
  }
  if (description) {
    html = html.replace(
      /(<meta\s+name="description"\s+content=")[^"]*(")/,
      `$1${description}$2`,
    );
    html = html.replace(
      /(<meta\s+property="og:description"\s+content=")[^"]*(")/,
      `$1${description}$2`,
    );
    html = html.replace(
      /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/,
      `$1${description}$2`,
    );
  }
  if (url) {
    html = html.replace(
      /(<link\s+rel="canonical"\s+href=")[^"]*(")/,
      `$1${url}$2`,
    );
    html = html.replace(
      /(<meta\s+property="og:url"\s+content=")[^"]*(")/,
      `$1${url}$2`,
    );
  }
  return html;
}

export default {
  async fetch(request, env) {
    // For page requests, check if we have route-specific meta to inject
    if (isPageRequest(request)) {
      const url = new URL(request.url);
      const pathname = url.pathname.replace(/\/+$/, "") || "/";
      const meta = ROUTE_META[pathname];

      if (meta) {
        const response = await env.ASSETS.fetch(request);
        const html = await response.text();
        const injected = replaceMeta(html, {
          title: meta.title,
          description: meta.description,
          url: `${SITE_URL}${pathname === "/" ? "/" : pathname}`,
        });
        return new Response(injected, {
          status: response.status,
          headers: response.headers,
        });
      }
    }

    return env.ASSETS.fetch(request);
  },
};
