import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import DiaryDashboardClient from "@/components/DiaryDashboardClient";
import { authOptions } from "@/lib/auth";
import { openedDiaryQuery } from "@/lib/diary/search";

type DiaryPageProps = {
    searchParams: Promise<{ q?: string | string[] }>;
};

export default async function DiaryPage({ searchParams }: DiaryPageProps) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const params = await searchParams;
    const requested = Array.isArray(params.q) ? params.q[0] : params.q;

    return <DiaryDashboardClient initialQuery={openedDiaryQuery(requested ?? null)} />;
}
