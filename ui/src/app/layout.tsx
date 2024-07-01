"use client"
import { BlackButton, GreyText, Section } from "@/components/components";
import { useGet } from "@/hooks/ReactQuery";
import { Tabs } from "@/hooks/Tabs";
import { useTabs } from "@/hooks/useTabs";
import ReactQueryProvider from "@/providers/ReactQueryProvider";
import type { Metadata, Viewport } from "next";
import React from "react";
import { TbLockCancel, TbLockCheck } from "react-icons/tb";
import "./globals.css";
import { Banner } from "@/components/Banner";

// export const metadata: Metadata = {
//   title: "mountainpass/hooked",
//   description: "Scripting evolved.",
// };

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  console.debug('Re-rendering Layout...')

  // hooks

  type TabTypes = 'Overview' | 'Env' | 'Scripts' | 'Triggers' | 'Imports' | 'Plugins'
  const TAB_VALUES: TabTypes[] = ['Imports', 'Env', 'Scripts', 'Triggers'];
  const tabs = useTabs<TabTypes>(TAB_VALUES, TAB_VALUES[0])

  return (
    <html lang="en">
      <body>
        <ReactQueryProvider>

          <main className="flex flex-col items-center gap-4">

            <Banner />

            <div className="flex flex-col items-center gap-4 w-full px-4 pb-4 max-w-[1000px]">

              <Tabs {...tabs} />

              {children}

            </div>
          </main>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
