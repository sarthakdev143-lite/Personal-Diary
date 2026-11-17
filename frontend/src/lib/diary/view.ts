export type DiaryListResult<T> = {
    key: string;
    diaries: readonly T[];
    error: string | null;
};

export function emptyDiaryListMessage(): string {
    return "No diaries yet. Add one, or import a backup.";
}

export function diaryOpenError(error: string): { title: string; detail: string } {
    if (error === "Diary not found" || error === "Invalid diary id") {
        return {
            title: "This diary is not here",
            detail: "That address does not open one of your diaries.",
        };
    }
    return {
        title: "This diary could not be opened",
        detail: "Go back to your diaries and try again.",
    };
}

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

export function diaryMatchCount(input: {
    typed: string;
    loaded: string;
    current: boolean;
    error: boolean;
    count: number;
}): number | null {
    if (!input.loaded.trim() || !input.current || input.error) return null;
    if (input.typed.trim() !== input.loaded.trim()) return null;
    return input.count;
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
