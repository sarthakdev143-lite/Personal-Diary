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

export function diaryFieldReady(typed: string, loaded: string, current: boolean): boolean {
    return typed.trim() === loaded.trim() && current;
}

export function diaryEnterChoice(ready: boolean, ids: readonly string[]): string | "wait" | null {
    if (!ready) return "wait";
    return ids[0] ?? null;
}

export function diaryPendingOpen(input: {
    pending: string | null;
    typed: string;
    loaded: string;
    current: boolean;
    ids: readonly string[];
}): { openId: string | null; pending: string | null } {
    if (input.pending === null) return { openId: null, pending: null };
    const pending = input.pending.trim();
    if (input.typed.trim() !== pending) return { openId: null, pending: null };
    if (!diaryFieldReady(input.typed, input.loaded, input.current)) return { openId: null, pending };
    return { openId: input.ids[0] ?? null, pending: null };
}
