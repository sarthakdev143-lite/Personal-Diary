export default function DiaryDashboardLoading() {
    return (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-zinc-700 border-t-zinc-100" />
        </div>
    );
}
