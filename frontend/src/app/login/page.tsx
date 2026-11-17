"use client"

import { useEffect, useState } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import Image from "next/image"

import Google from './Google.png'
import Github from './Github.png'

import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { loginWaitingMessage } from "@/lib/diary/login"

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState<{
        google: boolean
        github: boolean
    }>({
        google: false,
        github: false,
    })
    const { toast } = useToast()
    const { status } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (status === "authenticated") router.replace("/diary")
    }, [status, router])

    const handleLogin = async (provider: "google" | "github") => {
        setIsLoading((prev) => ({ ...prev, [provider]: true }))

        try {
            await signIn(provider, { callbackUrl: "/diary" })
        } catch (error) {
            console.error("Login failed", error)
            toast({
                title: "Authentication failed",
                description: "There was a problem signing you in. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsLoading((prev) => ({ ...prev, [provider]: false }))
        }
    }

    const waiting = loginWaitingMessage(status)
    if (waiting) {
        return (
            <div className="relative z-10 flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-center">
                <p className="text-lg text-zinc-300" role="status">{waiting}</p>
            </div>
        )
    }

    const busy = isLoading.google || isLoading.github

    return (
        <div className="relative z-10 flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-center">
            <Toaster />
            <div className="w-full max-w-sm">
                <h1 className="text-4xl font-bold italic text-white">Sign in</h1>
                <p className="mx-auto mt-2 max-w-sm text-balance text-lg text-zinc-300">
                    Sign in with Google or GitHub to open your diaries.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                    <Button
                        variant="outline"
                        className="h-12 w-full rounded-full border border-white/15 bg-zinc-900 text-base text-zinc-100 hover:border-white/40 hover:bg-zinc-900 hover:text-zinc-100"
                        onClick={() => handleLogin("google")}
                        disabled={busy}
                    >
                        {isLoading.google ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Image src={Google} alt="" width={20} height={20} className="rounded-full bg-white p-[0.2rem]" />
                        )}
                        Continue with Google
                    </Button>
                    <Button
                        variant="outline"
                        className="h-12 w-full rounded-full border border-white/15 bg-zinc-900 text-base text-zinc-100 hover:border-white/40 hover:bg-zinc-900 hover:text-zinc-100"
                        onClick={() => handleLogin("github")}
                        disabled={busy}
                    >
                        {isLoading.github ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Image src={Github} alt="" width={20} height={20} className="rounded-full bg-white p-[0.2rem]" />
                        )}
                        Continue with GitHub
                    </Button>
                </div>
                <p className="mx-auto mt-6 max-w-sm text-balance text-sm text-zinc-400">
                    Entries stay with the account you sign in with.
                </p>
            </div>
        </div>
    )
}
