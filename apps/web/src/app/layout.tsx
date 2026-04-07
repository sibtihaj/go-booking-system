import type { Metadata } from "next";
import { Geist_Mono, Inter, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IB Scheduling — Modern Booking",
  description: "Next.js + Supabase Auth + Go booking API",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col antialiased selection:bg-emerald-500/30 selection:text-emerald-900">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100 via-background to-background dark:from-emerald-900/20" />
          <div className="fixed inset-0 -z-10 bg-[url('/noise.svg')] opacity-[0.02] mix-blend-overlay pointer-events-none" />
          <div className="flex min-h-screen flex-1 flex-col">
            <div className="flex flex-1 flex-col">{children}</div>
            <SiteFooter />
          </div>
          <Toaster richColors closeButton position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
