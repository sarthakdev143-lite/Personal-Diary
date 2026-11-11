import { useState } from "react";

import { Button } from "./ui/button";
import { useVault } from "@/context/VaultContext";
import { useToast } from "@/hooks/use-toast";
import { THEMES } from "@/lib/plans";

const NewDiaryForm = ({
    formActive,
    setFormActive,
    onDiaryCreated,
}: {
    formActive: boolean;
    setFormActive: React.Dispatch<React.SetStateAction<boolean>>;
    onDiaryCreated?: () => void;
}) => {
    const { seal, account, refresh } = useVault();
    const { toast } = useToast();
    const plan = account?.plan ?? "free";
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [theme, setTheme] = useState<string>(THEMES[0].url);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!formActive) return null;

    const validate = () => {
        const nextTitle = title.trim();
        if (nextTitle.length < 3) return "Title must be at least 3 characters.";
        if (nextTitle.length > 80) return "Keep the title under 80 characters.";
        if (description.trim().length > 280) return "Keep the description under 280 characters.";
        return null;
    };

    const handleFinishForm = async (event: React.FormEvent) => {
        event.preventDefault();
        const problem = validate();
        setError(problem);
        if (problem || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const response = await fetch("/api/diaries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: await seal(title.trim()),
                    description: await seal(description.trim()),
                    theme,
                }),
            });
            const data = await response.json().catch(() => null) as { error?: string } | null;
            if (!response.ok) throw new Error(data?.error || "Failed to create diary.");

            setTitle("");
            setDescription("");
            setTheme(THEMES[0].url);
            setFormActive(false);
            onDiaryCreated?.();
            await refresh();
        } catch (caught) {
            toast({
                title: "Unable to create diary",
                description: caught instanceof Error ? caught.message : "Something went wrong. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-4 sm:items-center">
            <form onSubmit={handleFinishForm} className="w-full max-w-md rounded-lg border border-[#2e2a24] bg-[#161410] p-5 text-[#e8e2d6]">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg">New diary</h2>
                    <button type="button" onClick={() => setFormActive(false)} className="text-sm text-[#b7b0a4]">Close</button>
                </div>
                <label className="mt-4 block text-sm" htmlFor="new-diary-title">Title</label>
                <input
                    id="new-diary-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="mt-1 w-full rounded border border-[#3a342c] bg-[#100e0c] px-3 py-2 text-sm"
                    placeholder="Title"
                />
                <label className="mt-4 block text-sm" htmlFor="new-diary-description">Description</label>
                <textarea
                    id="new-diary-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded border border-[#3a342c] bg-[#100e0c] px-3 py-2 text-sm"
                    placeholder="Optional"
                />
                <fieldset className="mt-4">
                    <legend className="text-sm">Cover</legend>
                    <div className="mt-2 flex gap-2">
                        {THEMES.map((item) => (
                            <button
                                key={item.url}
                                type="button"
                                disabled={item.pro && plan !== "pro"}
                                onClick={() => setTheme(item.url)}
                                className={`rounded border px-3 py-2 text-sm ${theme === item.url ? "border-[#e8e2d6]" : "border-[#3a342c]"} disabled:opacity-40`}
                            >
                                {item.name}{item.pro && plan !== "pro" ? " · Pro" : ""}
                            </button>
                        ))}
                    </div>
                </fieldset>
                {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
                <Button type="submit" disabled={isSubmitting} className="mt-5">
                    {isSubmitting ? "Creating..." : "Create diary"}
                </Button>
            </form>
        </div>
    );
};

export default NewDiaryForm;
