"use client";

import { ReactNode, useEffect } from "react";
import Lenis from "lenis";

interface LenisProviderProps {
    children: ReactNode;
}

const LenisProvider = ({ children }: LenisProviderProps) => {
    useEffect(() => {
        const lenis = new Lenis({
            duration: 1,
            easing: (value) => Math.min(1, 1.001 - Math.pow(2, -10 * value)),
            touchMultiplier: 2,
            smoothWheel: true,
            syncTouch: true,
        });

        let rafId = 0;
        const onAnimationFrame = (time: number) => {
            lenis.raf(time);
            rafId = window.requestAnimationFrame(onAnimationFrame);
        };

        rafId = window.requestAnimationFrame(onAnimationFrame);

        return () => {
            window.cancelAnimationFrame(rafId);
            lenis.destroy();
        };
    }, []);

    return <>{children}</>;
};

export default LenisProvider;
