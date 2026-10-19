import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Unified Ecommerce — Your Trusted Tech Partner",
    template: "%s | Unified Ecommerce",
  },
  description: "Premium electronics, mobile phones, laptops and accessories. Shop online or visit our store.",
  keywords: ["electronics", "mobile phones", "laptops", "accessories", "Bangladesh", "online shopping"],
  openGraph: {
    siteName: "Unified Ecommerce",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,opsz,wght@0,6..12,300..900;1,6..12,300..900&family=Rubik:ital,wght@0,300..900;1,300..900&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
