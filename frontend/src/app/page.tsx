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
          <div className="pointer-events-none relative z-10 bg-black/45 px-4 backdrop-blur-md max-xs:px-2">
            <Landing />
          </div>
          <WhyChooseThis />
        </div>
        <div className="h-screen w-full pointer-events-none"></div>
      </LenisProvider>
    </>
  );
};