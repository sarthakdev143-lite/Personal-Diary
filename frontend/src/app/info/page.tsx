"use client";

// import { useEffect, useRef, useState } from "react";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Button } from "@/components/ui/button";
import LenisProvider from "@/components/LenisProvider";

const InfoPage = () => {
    const infoParentRef = useRef<HTMLDivElement>(null);

    // const [_isMouseMoving, setIsMouseMoving] = useState(false);
    // const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    // const buttonRef = useRef<HTMLButtonElement>(null);
    // const buttonTween = useRef<gsap.core.Tween | null>(null);

    // useEffect(() => {
    //     const handleMouseMove = (e: MouseEvent) => {
    //         setIsMouseMoving(true);

    //         // Animate position with GSAP
    //         if (buttonRef.current) {
    //             buttonTween.current = gsap.to(buttonRef.current, {
    //                 x: e.clientX - 40,
    //                 y: e.clientY - 20,
    //                 duration: 0.8,
    //                 ease: 'power2.out'
    //             });
    //         }

    //         // Animate opacity with GSAP for better synchronization
    //         gsap.to(buttonRef.current, {
    //             opacity: 1,
    //             duration: 0.5,
    //             ease: 'power2.out'
    //         });

    //         if (timeoutRef.current) {
    //             clearTimeout(timeoutRef.current);
    //         }
    //         timeoutRef.current = setTimeout(() => {
    //             gsap.to(buttonRef.current, {
    //                 opacity: 0,
    //                 duration: 0.8,
    //                 ease: 'power2.out'
    //             });
    //         }, 2000);
    //     };

    //     window.addEventListener('mousemove', handleMouseMove);
    //     return () => {
    //         window.removeEventListener('mousemove', handleMouseMove);
    //         buttonTween.current?.kill();
    //         if (timeoutRef.current) {
    //             clearTimeout(timeoutRef.current);
    //         }
    //     };
    // }, []);

    useGSAP(() => {
        gsap.to(infoParentRef.current, {
            opacity: 1,
            duration: 1,
            ease: 'power2.out'
        });
    }, []);

    return (
        <>
            <LenisProvider>
                <div id="info-parent" ref={infoParentRef} className="w-full h-auto bg-black/25 absolute backdrop-blur-lg opacity-0 flex flex-col">
                    <div
                        className="w-full h-screen flex flex-col items-center justify-center select-none"
                        style={{ textShadow: "0px 4px 12px rgba(0,0,0,0.2)" }}
                    >
                        <h1 className="text-4xl font-bold text-center text-white/80 mix-blend-difference italic">
                            Your Private Digital Diary – Safe, Secure, and Serene
                        </h1>
                        <p className="text-lg text-center text-white/60 mix-blend-difference mt-2">
                            Scribble your thoughts, ideas, and todos in a clean and minimal interface.
                        </p>

                        <div className="mt-4 flex gap-3">
                            <Button
                                className="pointer-events-auto mix-blend-difference bg-white/80 text-black transition-all duration-300 
                       text-md font-semibold rounded-sm hover:-translate-y-1 hover:bg-white/75 hover:shadow-lg 
                       hover:shadow-white/15 hover:text-black/90 hover:rounded-md hover:scale-x-100 scale-x-95"
                                size={'lg'}
                            >
                                Start Writing
                            </Button>
                            <Button
                                className="pointer-events-auto mix-blend-difference border border-white/70 text-white/80 transition-all 
                       duration-300 text-md font-semibold rounded-sm hover:-translate-y-1 bg-transparent hover:bg-white/15 
                       hover:shadow-lg hover:shadow-white/15 hover:text-white hover:rounded-md hover:scale-x-100 scale-x-95"
                                size={'lg'}
                            >
                                Try Demo
                            </Button>
                        </div>
                    </div>

                    <div className="w-full h-screen">
                        
                    </div>
                    {/* <div className="w-full h-screen absolute z-10 overflow-hidden pointer-events-none">
                        <Button
                            ref={buttonRef}
                            variant={'secondary'}
                            className="text-base capitalize rounded absolute mix-blend-darken z-40 shadow-md shadow-gray-500/30"
                            style={{
                                pointerEvents: 'none',
                                left: 0,
                                top: 0,
                                opacity: 0,
                                filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1)) drop-shadow(0 4px 4px rgba(0, 0, 0, 0.06))'
                            }}
                        >
                            start writing
                        </Button>
                    </div> */}
                </div>
            </LenisProvider>
        </>
    );
};

export default InfoPage;