"use client";

import { useRef } from "react";
import LenisProvider from "@/components/LenisProvider";
import Landing from "@/components/info/Landing";
import WhyChooseThis from "@/components/info/WhyChooseThis";

export default function Home() {
  const infoParentRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <LenisProvider>
        <div id="info-parent" ref={infoParentRef} className="w-full">
          <div className="hero-screen pointer-events-none relative z-10 flex min-h-screen items-safe-center justify-center px-4 pb-28 pt-24">
            <div className="hero-card min-w-0 max-w-[min(48rem,100%)] rounded-3xl border border-white/25 bg-zinc-950 px-8 py-10 shadow-2xl max-xs:px-5">
              <Landing />
            </div>
          </div>
          <WhyChooseThis />
        </div>
      </LenisProvider>
    </>
  );
};