"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import LenisProvider from "@/components/LenisProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/ProtectedRoute";

const DiaryDashboard = () => {
    const infoParentRef = useRef<HTMLDivElement>(null);

    const [diaries, setDiaries] = useState([]);

    useGSAP(() => {
        gsap.fromTo(infoParentRef.current,
            { opacity: 0 }, {
            opacity: 1,
            duration: 0.5,
            ease: 'power2.out'
        });
    }, []);

    return (
        <ProtectedRoute>
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
                            className="w-1/2 mx-auto max-xs:w-full text-lg p-6 py-[1.65rem] bg-white/10 border border-white/15 focus:border-white/50 outline-none rounded-xl text-white placeholder:text-zinc-400"
                        />
                        {/* <Button
                            className="bg-white/80 mix-blend-difference text-black text-lg font-medium p-5 hover:bg-white/75 rounded-md transition-all"
                        >
                            + Add New Diary
                        </Button> */}
                    </div>
                </div>
            </LenisProvider>
        </ProtectedRoute>
    );
}

export default DiaryDashboard;
