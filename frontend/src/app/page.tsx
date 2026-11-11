"use client";

import { useRef } from "react";
import LenisProvider from "@/components/LenisProvider";
import Link from "next/link";

import Landing from "@/components/info/Landing";
import WhyChooseThis from "@/components/info/WhyChooseThis";
import Pricing from "@/components/Pricing";

export default function Home() {
  const infoParentRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <LenisProvider>
        <div id="info-parent" ref={infoParentRef} className="relative z-10 flex h-auto w-full flex-col bg-black/55 px-4 backdrop-blur-lg max-xs:px-2">
          <Landing />
          <WhyChooseThis />
          <Pricing />
          <footer className="mx-auto flex w-full max-w-3xl justify-center gap-6 pb-16 text-sm text-white/60">
            <Link href="/pricing">Pricing</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </footer>
        </div>
        <div className="h-screen w-full pointer-events-none"></div>
      </LenisProvider>
    </>
  );
};