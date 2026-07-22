import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Serif display do design system v2 (escolha do time, 17/07/2026)
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

// Base absoluta para OG/canonical: a mesma env que auth e Stripe usam,
// então dev resolve para localhost e produção para https://beviewer.com.
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://beviewer.com";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: BRAND.metaTitle,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.metaDescription,
  // Defaults de compartilhamento (herdados por todas as páginas). Sem
  // canonical/og:url globais de propósito: no layout raiz marcariam
  // toda página como se fosse a home.
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: BRAND.name,
    title: BRAND.metaTitle,
    description: BRAND.metaDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.metaTitle,
    description: BRAND.metaDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* Vercel Web Analytics (item 5A): pageviews sem cookie, para
            medir o funil landing → cadastro. Requer habilitar Web
            Analytics no painel da Vercel. */}
        <Analytics />
      </body>
    </html>
  );
}
