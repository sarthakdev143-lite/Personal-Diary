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
        <div id="info-parent" ref={infoParentRef} className="w-full h-auto backdrop-blur-lg flex flex-col max-xs:px-2 px-4">
          <Landing />
          <WhyChooseThis />
        </div>
        <div className="h-screen w-full pointer-events-none"></div>
      </LenisProvider>
    </>
  );
};