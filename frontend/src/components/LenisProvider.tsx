"use client";

import { ReactNode, useEffect } from "react";
import Lenis from "@studio-freight/lenis";

interface LenisProviderProps {
    children: ReactNode;
}

const LenisProvider = ({ children }: LenisProviderProps) => {
    useEffect(() => {
        const lenis = new Lenis({
            duration: 1, 
            easing: (t: number) => 1 - Math.pow(1 - t, 3), 
            touchMultiplier: 2, 
        });

        function raf(time: number) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);

        return () => {
            lenis.destroy();
        };
    }, []);

    return <>{children}</>;
};

export default LenisProvider;
