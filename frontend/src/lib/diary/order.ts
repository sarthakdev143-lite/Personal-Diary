export type DiarySortable = {
    pinned?: boolean | null;
    updatedAt?: Date | string | null;
    createdAt?: Date | string | null;
};

function diaryTime(value: Date | string | null | undefined): number {
    if (value instanceof Date) {
        const time = value.getTime();
        return Number.isNaN(time) ? 0 : time;
    }
    if (typeof value !== "string") return 0;
    const time = Date.parse(value);
    return Number.isNaN(time) ? 0 : time;
}

export function compareDiaries(a: DiarySortable, b: DiarySortable): number {
    const byPin = Number(b.pinned === true) - Number(a.pinned === true);
    if (byPin !== 0) return byPin;
    const byUpdated = diaryTime(b.updatedAt) - diaryTime(a.updatedAt);
    if (byUpdated !== 0) return byUpdated;
    return diaryTime(b.createdAt) - diaryTime(a.createdAt);
}
