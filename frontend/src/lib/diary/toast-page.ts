export function toastsForPage<T extends { page: string }>(toasts: readonly T[], page: string): T[] {
    return toasts.filter((toast) => toast.page === page);
}

export function toastContent<T extends { page: string }>(toast: T): Omit<T, "page"> {
    const content = { ...toast };
    delete (content as Partial<T>).page;
    return content;
}
