import type { Metadata } from "next";

import Pricing from "@/components/Pricing";

export const metadata: Metadata = {
    title: "Pricing • Diary",
};

export default function PricingPage() {
    return (
        <div className="relative z-10 min-h-screen bg-black/45 px-4 pb-16 pt-28">
            <Pricing />
        </div>
    );
}
