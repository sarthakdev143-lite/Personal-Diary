export type DiaryListResult<T> = {
    key: string;
    diaries: readonly T[];
    error: string | null;
};

export function diaryListView<T>(input: {
    status: "loading" | "authenticated" | "unauthenticated";
    result: DiaryListResult<T> | null;
    requestKey: string;
}): { diaries: readonly T[]; error: string | null; loading: boolean } {
    const current = input.result?.key === input.requestKey ? input.result : null;
    const previous = input.result && !input.result.error && !current ? input.result.diaries : null;
    if (input.status === "loading" || (input.status === "authenticated" && !current && !previous)) {
        return { diaries: [], error: null, loading: true };
    }
    if (current?.error) return { diaries: [], error: current.error, loading: false };
    return { diaries: current ? current.diaries : previous ?? [], error: null, loading: false };
}
