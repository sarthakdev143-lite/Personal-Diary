import type { Metadata } from "next";

import Pricing from "@/components/Pricing";

export const metadata: Metadata = {
    title: "Pricing • Diary",
};

export default function PricingPage() {
    return (
        <div className="relative z-10 mx-auto min-h-screen max-w-5xl px-6 pb-16 pt-28">
            <Pricing />
        </div>
    );
}
