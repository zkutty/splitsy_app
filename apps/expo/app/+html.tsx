import type { PropsWithChildren } from "react";
import { ScrollViewStyleReset } from "expo-router/html";

const appTitle = "SplitTrip | Shared travel expenses";
const appDescription = "Track group travel spending, split costs fairly, and settle in one pass.";

export default function RootHtml({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>{appTitle}</title>
        <meta name="description" content={appDescription} />
        <meta name="theme-color" content="#2563EB" />
        <meta property="og:title" content={appTitle} />
        <meta property="og:description" content={appDescription} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={appTitle} />
        <meta name="twitter:description" content={appDescription} />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <ScrollViewStyleReset />
      </head>
      <body>
        {children}
        {/* Cloudflare Web Analytics – free, cookie-free, real-visitor tracking */}
        <script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "43df86215c774b9ebaeb2af648222639"}'
        />
      </body>
    </html>
  );
}
