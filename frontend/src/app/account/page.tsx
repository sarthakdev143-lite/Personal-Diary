import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import AccountClient from "@/components/AccountClient";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
    title: "Account • Diary",
};

type AccountPageProps = {
    searchParams: Promise<{ billing?: string }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const params = await searchParams;
    return <AccountClient billing={params.billing ?? null} />;
}
