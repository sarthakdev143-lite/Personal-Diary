export default function TermsPage() {
    return (
        <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-28 text-zinc-100 mix-blend-difference">
            <h1 className="text-3xl font-semibold">Terms of Service</h1>
            <p className="text-sm leading-7 text-zinc-300">
                By using this app, you agree not to abuse the service, attempt unauthorized access, or upload
                unlawful content. We may update these terms as the product evolves.
            </p>
            <p className="text-sm leading-7 text-zinc-300">
                This project is provided on an "as is" basis without warranties. For issues or support, contact the
                project owner.
            </p>
        </div>
    );
}
