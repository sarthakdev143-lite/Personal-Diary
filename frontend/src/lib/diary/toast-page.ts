export function toastsForPage<T extends { page: string }>(toasts: readonly T[], page: string): T[] {
    return toasts.filter((toast) => toast.page === page);
}

export function toastContent<T extends { page: string }>(toast: T): Omit<T, "page"> {
    const content = { ...toast };
    delete (content as Partial<T>).page;
    return content;
}

/** Pixels between the screen bottom and a notice, so the notice sits above the bottom bars. */
export function toastClearance(viewportHeight: number, tops: readonly number[]): number {
    if (!Number.isFinite(viewportHeight) || viewportHeight <= 0 || tops.length === 0) return 96;
    const top = Math.min(...tops.filter((value) => Number.isFinite(value)));
    if (!Number.isFinite(top)) return 96;
    return Math.max(0, Math.ceil(viewportHeight - top));
}
