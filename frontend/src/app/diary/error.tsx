"use client";

export default function DiaryDashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="fixed inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/60 px-4 text-center text-white">
            <h2 className="text-xl font-semibold">Unable to load your diaries</h2>
            <p className="max-w-md text-sm text-zinc-300">{error.message || "Unexpected error occurred."}</p>
            <button
                type="button"
                onClick={reset}
                className="rounded border border-zinc-500 px-4 py-2 text-sm hover:bg-zinc-800"
            >
                Try again
            </button>
        </div>
    );
}
