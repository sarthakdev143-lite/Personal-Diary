function dayKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function writingStreak(dates: Date[], now = new Date()): number {
    const days = new Set(
        dates.filter((date) => !Number.isNaN(date.getTime())).map((date) => dayKey(date))
    );
    const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (!days.has(dayKey(cursor))) {
        cursor.setDate(cursor.getDate() - 1);
        if (!days.has(dayKey(cursor))) return 0;
    }

    let streak = 0;
    while (days.has(dayKey(cursor))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}
