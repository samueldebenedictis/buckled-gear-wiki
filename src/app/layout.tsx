import type { Metadata } from "next";
import { DM_Sans, Unbounded } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { HeaderMenu } from "@/components/header-menu";
import { UserNav } from "@/components/user-nav";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const unbounded = Unbounded({ subsets: ["latin"], weight: ["600", "700", "900"], variable: "--font-unbounded" });

export const metadata: Metadata = {
  title: { default: "Buckled Gear Wiki", template: "%s · Buckled Gear Wiki" },
  description: "Wiki del materiale da trail running della community Buckled.",
  // Finché è una demo i motori di ricerca non la indicizzano: si apre con SITE_INDEXING=on.
  robots: process.env.SITE_INDEXING === "on" ? undefined : { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${dmSans.variable} ${unbounded.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* Come buckled.it: contenuto centrato in 1140 px, 30 px di margine ai lati. */}
        <header className="relative z-40 border-b border-black bg-buckled-yellow px-[30px] text-buckled-green max-lg:py-2.5 max-md:py-[15px]">
          <div className="mx-auto flex min-h-[60px] max-w-[1140px] items-center justify-between gap-3 max-lg:min-h-10">
            <Link href="/" className="font-display text-[20px] leading-[20px] font-black tracking-wide uppercase">
              Buckled Gear Wiki
            </Link>
            {/* Tutte le voci stanno nel burger. */}
            <HeaderMenu>
              <Suspense fallback={null}>
                <UserNav />
              </Suspense>
            </HeaderMenu>
          </div>
        </header>
        {children}
        <footer className="mt-auto border-t border-black bg-buckled-paper px-4 py-6 text-sm text-buckled-green">
          <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-2">
            <span className="font-display font-black uppercase">Buckled Gear Wiki</span>
            <a href="https://buckled.it" className="font-bold underline" target="_blank" rel="noopener noreferrer">
              buckled.it
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
