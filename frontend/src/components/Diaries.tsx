"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Diary = {
    _id: string;
    title: string;
    description: string;
    theme: string;
    createdAt: string;
};

const SKELETON_COUNT = 3;

const truncateDescription = (description: string, maxLength = 110) => {
    if (description.length <= maxLength) return description;
    return `${description.slice(0, maxLength).trimEnd()}...`;
};

const Diaries = () => {
    const { data: session, status } = useSession();
    const [diaries, setDiaries] = useState<Diary[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (status === "loading") return;

        if (!session) {
            setIsLoading(false);
            return;
        }

        let isMounted = true;

        const fetchDiaries = async () => {
            setIsLoading(true);

            try {
                const response = await fetch("/api/diaries", {
                    method: "GET",
                    cache: "no-store",
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch diaries: ${response.status}`);
                }

                const data: unknown = await response.json();

                if (!isMounted) return;
                setDiaries(Array.isArray(data) ? (data as Diary[]) : []);
            } catch {
                if (!isMounted) return;
                setDiaries([]);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchDiaries();

        return () => {
            isMounted = false;
        };
    }, [session, status]);

    if (isLoading) {
        return (
            <>
                {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
                    <div
                        key={`diary-skeleton-${index}`}
                        className="h-36 w-full max-w-xs animate-pulse rounded-xl bg-zinc-700/30"
                    />
                ))}
            </>
        );
    }

    if (!diaries.length) {
        return null;
    }

    return (
        <>
            {diaries.map((diary) => (
                <article
                    key={diary._id}
                    className="flex h-36 w-full max-w-xs flex-col justify-between rounded-xl border border-white/10 bg-zinc-600/10 p-6 text-white/80 shadow-lg"
                >
                    <div className="space-y-2 overflow-hidden">
                        <h2 className="truncate text-lg font-medium text-white">{diary.title}</h2>
                        <p className="text-sm leading-6 text-zinc-300">
                            {truncateDescription(diary.description || "No description")}
                        </p>
                    </div>
                </article>
            ))}
        </>
    );
};

export default Diaries;
