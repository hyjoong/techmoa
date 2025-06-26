import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: {
    default: "Techgom - 기술 블로그 모음집",
    template: "%s | Techgom",
  },
  description:
    "토스, 무신사, 우아한형제들, 카카오 등 국내 주요 기업과 개발자들의 기술 블로그를 한곳에서 모아보세요.",
  keywords: [
    "기술 블로그",
    "개발 블로그",
    "프론트엔드",
    "백엔드",
    "개발자",
    "기술 아티클",
    "토스 기술블로그",
    "우아한형제들",
    "카카오 기술블로그",
    "무신사",
    "당근마켓",
    "뱅크샐러드",
  ],
  authors: [{ name: "Techgom Team" }],
  creator: "Techgom",
  publisher: "Techgom",
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
    url: "https://techgom.vercel.app",
    title: "Techgom - 기술 블로그 모음집",
    description:
      "국내 주요 기업과 개발자들의 기술 블로그를 한곳에서 모아보세요.",
    siteName: "Techgom",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Techgom - 기술 블로그 모음집",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Techgom - 기술 블로그 모음집",
    description:
      "국내 주요 기업과 개발자들의 기술 블로그를 한곳에서 모아보세요.",
    images: ["/og-image.png"],
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  verification: {
    google: "your-google-verification-code",
    other: {
      "naver-site-verification": "your-naver-verification-code",
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
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
