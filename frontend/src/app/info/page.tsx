"use client";

// import { useEffect, useRef, useState } from "react";
import { useRef } from "react";
// import { Button } from '@/components/ui/button';
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

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
            duration: 0.75,
            ease: 'power2.out'
        });
    }, []);

    return (
        <>
            <div id="info-parent" ref={infoParentRef} className="w-full h-screen bg-black/10 absolute pointer-events-none backdrop-blur-md opacity-0">
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
        </>
    );
};

export default InfoPage;