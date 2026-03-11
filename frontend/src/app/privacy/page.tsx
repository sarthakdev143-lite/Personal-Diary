export default function PrivacyPage() {
    return (
        <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-28 text-zinc-100">
            <h1 className="text-3xl font-semibold">Privacy Policy</h1>
            <p className="text-sm leading-7 text-zinc-300">
                We only store the information required to operate your diary, such as account identity and diary
                content. Authentication is handled through your selected OAuth provider.
            </p>
            <p className="text-sm leading-7 text-zinc-300">
                You can request deletion of your data by removing diaries from the dashboard. This policy will be
                updated as new features are introduced.
            </p>
        </div>
    );
}
