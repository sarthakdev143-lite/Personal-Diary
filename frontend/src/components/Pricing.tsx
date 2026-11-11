"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useVault } from "@/context/VaultContext";
import { limits, PRICES } from "@/lib/plans";

const primaryAction = "block w-full bg-[#f3ecdf] px-4 py-2 text-center text-sm text-[#161410] disabled:opacity-50";
const quietAction = "block w-full border border-[#3a342c] px-4 py-2 text-center text-sm text-[#d5cdc0]";

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
        <section className="mx-auto flex w-full max-w-5xl flex-col px-0 py-16 text-[#d5cdc0]">
            <h2 id="pricing" className="story-serif text-4xl leading-none text-[#f3ecdf]">Pricing</h2>
            <p className="mt-3 max-w-2xl text-[#d5cdc0]">
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
                        <Link href={phase === "anonymous" || phase === "loading" ? "/login" : "/diary"} className={primaryAction}>
                            Start writing
                        </Link>
                    }
                />
                <PlanCard
                    title="Pro monthly"
                    price={PRICES.month.label}
                    detail="per month"
                    points={proPoints(proLimits)}
                    action={pro
                        ? <Link href="/account" className={quietAction}>Manage plan</Link>
                        : <button type="button" className={primaryAction} disabled={pending !== null} onClick={() => checkout("month")}>{pending === "month" ? "Starting..." : "Upgrade monthly"}</button>}
                />
                <PlanCard
                    title="Pro yearly"
                    price={PRICES.year.label}
                    detail="per year"
                    points={proPoints(proLimits)}
                    action={pro
                        ? <Link href="/account" className={quietAction}>Manage plan</Link>
                        : <button type="button" className={primaryAction} disabled={pending !== null} onClick={() => checkout("year")}>{pending === "year" ? "Starting..." : "Upgrade yearly"}</button>}
                />
            </div>
            {error && <p className="mt-4 text-sm text-[#d5cdc0]">{error}</p>}
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
        <article className="flex flex-col border border-[#3a342c] bg-[#12110f] p-6 text-left">
            <h3 className="story-serif text-2xl text-[#f3ecdf]">{title}</h3>
            <p className="story-serif mt-3 text-3xl text-[#f3ecdf]">{price}</p>
            <p className="text-sm text-[#8f877c]">{detail}</p>
            <ul className="mt-5 flex flex-1 flex-col gap-2 text-sm text-[#d5cdc0]">
                {points.map((point) => <li key={point}>{point}</li>)}
            </ul>
            <div className="mt-6">{action}</div>
        </article>
    );
}
