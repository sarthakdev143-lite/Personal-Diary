import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (!session) {
            router.push("/api/auth/signin");
        }
    }, []);

    if (!session) {
        return <div className="fixed inset-0 bg-black/40 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex flex-col items-center space-y-4">
                <div className="h-16 w-16 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
                <p className="text-base font-medium tracking-wider">Verifying your session...</p>
            </div>
        </div>;
    }

    return <>{children}</>;

}