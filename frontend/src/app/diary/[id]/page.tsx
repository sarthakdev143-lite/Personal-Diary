import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import DiaryEditorClient from "@/components/DiaryEditorClient";
import { authOptions } from "@/lib/auth";

type DiaryEditorPageProps = {
    params: Promise<{ id: string }>;
};

export default async function DiaryEditorPage({ params }: DiaryEditorPageProps) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const { id } = await params;

    return <DiaryEditorClient diaryId={id} />;
}
