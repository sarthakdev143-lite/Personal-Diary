import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/api/auth/signin");
        }
    }, [session, status, router]);

    if (!session) return <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex flex-col items-center space-y-4">
            <div className="h-16 w-16 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
            <p className="text-base font-medium tracking-wider animate-pulse">Verifying your session...</p>
        </div>
    </div>;

    return <>{children}</>;
}