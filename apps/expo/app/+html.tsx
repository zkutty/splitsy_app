import type { PropsWithChildren } from "react";
import { ScrollViewStyleReset } from "expo-router/html";

const siteUrl = "https://splittrip.app";
const appTitle = "SplitTrip | Shared travel expenses";
const appDescription =
  "Track group travel spending, split costs fairly, and settle in one pass. Create a trip, invite friends, log expenses in any currency, and let SplitTrip calculate the minimum repayments.";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "SplitTrip",
  url: siteUrl,
  description: appDescription,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web, iOS, Android",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "Group expense tracking",
    "Multi-currency support",
    "Minimum repayment calculation",
    "Real-time balance updates",
    "Trip-based expense organization",
  ],
};

export default function RootHtml({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Primary */}
        <title>{appTitle}</title>
        <meta name="description" content={appDescription} />
        <link rel="canonical" href={siteUrl + "/"} />
        <meta name="theme-color" content="#2563EB" />
        <meta name="application-name" content="SplitTrip" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="SplitTrip" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:url" content={siteUrl + "/"} />
        <meta property="og:title" content={appTitle} />
        <meta property="og:description" content={appDescription} />
        <meta property="og:image" content={siteUrl + "/og-image.png"} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="SplitTrip – split travel expenses with your group" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={appTitle} />
        <meta name="twitter:description" content={appDescription} />
        <meta name="twitter:image" content={siteUrl + "/og-image.png"} />
        <meta name="twitter:image:alt" content="SplitTrip – split travel expenses with your group" />

        {/* Icons & manifest */}
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="SplitTrip" />

        {/* Structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />

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
