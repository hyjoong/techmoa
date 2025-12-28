import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AppOverlayProvider } from "@/components/overlay-provider";
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: {
    default: "Techmoa - 기술 블로그 모음집",
    template: "%s | Techmoa",
  },
  description:
    "국내 IT·개발 기술 블로그의 최신 포스트를 Techmoa에서 한눈에 확인하세요.",
  keywords: [
    "기술 블로그",
    "개발 블로그",
    "IT 블로그",
    "프로그래밍",
    "프론트엔드",
    "백엔드",
    "개발자",
    "Techmoa",
    "기술 아티클",
    "토스",
    "카카오",
    "우아한형제들",
    "기술 트렌드",
  ],
  authors: [{ name: "Techmoa Team" }],
  creator: "Techmoa",
  publisher: "Techmoa",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://techmoa.dev",
    title: "Techmoa - 기술 블로그 모음집",
    description:
      "토스, 카카오, 우아한형제들 등 다양한 IT 기업과 개발자들의 최신 기술 블로그를 한곳에서 모아보는 Techmoa",
    siteName: "Techmoa",
    images: [
      {
        url: "/ogImage.png",
        width: 1200,
        height: 630,
        alt: "Techmoa - 기술 블로그 모음집",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Techmoa - 기술 블로그 모음집",
    description:
      "국내외 IT·개발 기술 블로그의 최신 포스트를 Techmoa에서 한눈에 확인하세요.",
    images: ["/ogImage.png"],
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  verification: {
    other: {
      "naver-site-verification": "8b48897b4d8eb63c4a776125be8b5c429fcabb1f",
    },
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css"
        />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppOverlayProvider>
            {children}
            <Toaster />
            <Analytics />
          </AppOverlayProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
