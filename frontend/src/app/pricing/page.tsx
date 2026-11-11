import type { Metadata } from "next";

import Pricing from "@/components/Pricing";

export const metadata: Metadata = {
    title: "Pricing • Diary",
};

export default function PricingPage() {
    return (
        <div className="relative z-10 mx-auto min-h-screen max-w-5xl bg-[#12110f] px-6 pb-16 pt-28 text-[#d5cdc0]">
            <Pricing />
        </div>
    );
}
