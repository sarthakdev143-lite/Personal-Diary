import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import DiaryDashboardClient from "@/components/DiaryDashboardClient";
import { authOptions } from "@/lib/auth";

export default async function DiaryPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    return <DiaryDashboardClient />;
}
