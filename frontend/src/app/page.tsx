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
          <div className="pointer-events-none relative z-10 flex min-h-screen items-center justify-center px-4 pb-28">
            <div className="max-w-3xl rounded-3xl bg-zinc-950/80 px-8 py-10 shadow-2xl backdrop-blur-md max-xs:px-5">
              <Landing />
            </div>
          </div>
          <WhyChooseThis />
        </div>
        <div className="h-screen w-full pointer-events-none"></div>
      </LenisProvider>
    </>
  );
};