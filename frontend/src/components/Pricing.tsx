"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useVault } from "@/context/VaultContext";
import { limits, PRICES } from "@/lib/plans";

export default function Pricing() {
    const router = useRouter();
    const { account, phase } = useVault();
    const [pending, setPending] = useState<null | "month" | "year">(null);
    const [error, setError] = useState<string | null>(null);
    const pro = account?.plan === "pro";
    const freeLimits = limits("free");
    const proLimits = limits("pro");

    async function checkout(interval: "month" | "year") {
        setError(null);
        if (phase === "anonymous" || phase === "loading") {
            router.push("/login");
            return;
        }
        setPending(interval);
        try {
            const response = await fetch("/api/billing/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ interval }),
            });
            const data = await response.json() as { url?: string; error?: string };
            if (response.status === 401) {
                router.push("/login");
                return;
            }
            if (!response.ok || !data.url) throw new Error(data.error || "Could not start checkout.");
            window.location.href = data.url;
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not start checkout.");
        } finally {
            setPending(null);
        }
    }

    return (
        <section className="mx-auto flex w-full max-w-5xl flex-col px-0 py-16">
            <h2 id="pricing" className="text-2xl font-normal">Pricing</h2>
            <p className="mt-3 max-w-2xl text-[#b7b0a4]">
                Free is one diary. Pro raises the limits. Export is included on both plans.
            </p>
            <div className="mt-8 grid w-full gap-4 md:grid-cols-3">
                <PlanCard
                    title="Free"
                    price="$0"
                    detail="For a single private diary"
                    points={[
                        `${freeLimits.diaries} diary`,
                        `${freeLimits.entriesPerDiary} entries in that diary`,
                        `${freeLimits.maxPlaintextChars.toLocaleString()} characters per entry`,
                        "Paper cover",
                        "Markdown export",
                    ]}
                    action={
                        <Button asChild className="w-full">
                            <Link href={phase === "anonymous" || phase === "loading" ? "/login" : "/diary"}>Start writing</Link>
                        </Button>
                    }
                />
                <PlanCard
                    title="Pro monthly"
                    price={PRICES.month.label}
                    detail="per month"
                    points={proPoints(proLimits)}
                    action={pro
                        ? <Button asChild variant="outline" className="w-full border-white/20 bg-transparent text-white"><Link href="/account">Manage plan</Link></Button>
                        : <Button className="w-full" disabled={pending !== null} onClick={() => checkout("month")}>{pending === "month" ? "Starting..." : "Upgrade monthly"}</Button>}
                />
                <PlanCard
                    title="Pro yearly"
                    price={PRICES.year.label}
                    detail="per year"
                    points={proPoints(proLimits)}
                    action={pro
                        ? <Button asChild variant="outline" className="w-full border-white/20 bg-transparent text-white"><Link href="/account">Manage plan</Link></Button>
                        : <Button className="w-full" disabled={pending !== null} onClick={() => checkout("year")}>{pending === "year" ? "Starting..." : "Upgrade yearly"}</Button>}
                />
            </div>
            {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
        </section>
    );
}

function proPoints(proLimits: ReturnType<typeof limits>) {
    return [
        `${proLimits.diaries} diaries`,
        `${proLimits.entriesPerDiary.toLocaleString()} entries per diary`,
        `${proLimits.maxPlaintextChars.toLocaleString()} characters per entry`,
        "All covers",
        "Pin diaries",
        "Markdown export",
    ];
}

function PlanCard({
    title,
    price,
    detail,
    points,
    action,
}: {
    title: string;
    price: string;
    detail: string;
    points: string[];
    action: React.ReactNode;
}) {
    return (
        <article className="flex flex-col rounded-lg border border-[#2e2a24] bg-[#181612] p-6 text-left">
            <h3 className="text-lg text-white/80">{title}</h3>
            <p className="mt-3 text-3xl font-semibold">{price}</p>
            <p className="text-sm text-white/50">{detail}</p>
            <ul className="mt-5 flex flex-1 flex-col gap-2 text-sm text-white/75">
                {points.map((point) => <li key={point}>{point}</li>)}
            </ul>
            <div className="mt-6">{action}</div>
        </article>
    );
}
