"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import LenisProvider from "@/components/LenisProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const DiaryDashboard = () => {
    const infoParentRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        gsap.fromTo(infoParentRef.current,
            { opacity: 0 }, {
            opacity: 1,
            duration: 0.5,
            ease: 'power2.out'
        });
    }, []);

    return (
        <LenisProvider>
            <div
                id="info-parent"
                ref={infoParentRef}
                className="w-full min-h-screen pt-32 bg-black/25 relative backdrop-blur-lg flex flex-col max-xs:px-3 px-4 text-white text-3xl"
            >
                <div className="w-full flex max-w-[95%] mx-auto items-center justify-between gap-3 mb-6">
                    <Input
                        type="text"
                        placeholder="Search Diary and Notes..."
                        className="w-full max-xs:w-full text-base p-5 py-6 bg-white/10 border border-white/15 focus:border-white/50 outline-none rounded-xl text-white placeholder:text-zinc-400"
                    />
                    <Button
                        className="bg-blue-500 hover:bg-blue-600 text-white text-lg font-medium px-5 py-3 rounded-xl transition-all"
                    >
                        + Add New Diary
                    </Button>
                </div>
            </div>
        </LenisProvider>
    );
}

export default DiaryDashboard;
