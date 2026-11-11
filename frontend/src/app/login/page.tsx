"use client"

import { FormEvent, useEffect, useState } from "react"
import { signIn } from "next-auth/react"
import Image from "next/image"

import Google from "./Google.png"
import Github from "./Github.png"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { normalizeEmail } from "@/lib/email"
import { createVault, openVault, passwordError } from "@/lib/vault"
import { forgetRawKey, rememberRawKey } from "@/lib/vault-session"

const fieldClass = "w-full border border-[#3a342c] bg-transparent px-3 py-2 text-sm text-[#d5cdc0] placeholder:text-[#8f877c] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#f3ecdf]"
const primaryClass = "w-full bg-[#f3ecdf] px-4 py-2 text-sm text-[#161410] disabled:opacity-50"
const quietClass = "flex w-full items-center justify-center gap-3 border border-[#3a342c] px-4 py-2 text-sm text-[#d5cdc0] disabled:opacity-50"

export default function LoginPage() {
    const { toast } = useToast()
    const [mode, setMode] = useState<"signin" | "signup">("signup")
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [pending, setPending] = useState(false)
    const [oauth, setOauth] = useState<{ google: boolean; github: boolean }>({ google: false, github: false })
    const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null)

    useEffect(() => {
        fetch("/api/auth/providers")
            .then((response) => response.json())
            .then((data: { google?: unknown; github?: unknown }) => {
                setOauth({ google: Boolean(data.google), github: Boolean(data.github) })
            })
            .catch(() => setOauth({ google: false, github: false }))
    }, [])

    async function submit(event: FormEvent) {
        event.preventDefault()
        const problem = passwordError(password)
        const normalized = normalizeEmail(email)
        if (!normalized) {
            toast({ title: "Check the email", description: "Enter a valid email.", variant: "destructive" })
            return
        }
        if (problem) {
            toast({ title: "Check the password", description: problem, variant: "destructive" })
            return
        }
        if (mode === "signup" && (name.trim().length < 1 || name.trim().length > 80)) {
            toast({ title: "Check the name", description: "Enter a name up to 80 characters.", variant: "destructive" })
            return
        }

        setPending(true)
        try {
            if (mode === "signup") {
                const created = await createVault(password)
                const response = await fetch("/api/auth/signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: normalized,
                        name: name.trim(),
                        authVerifier: created.authVerifier,
                        kdfSalt: created.kdfSalt,
                        wrappedDataKey: created.wrappedDataKey,
                        wrapIv: created.wrapIv,
                    }),
                })
                const data = await response.json().catch(() => null) as { error?: string } | null
                if (!response.ok) throw new Error(data?.error || "Could not create the account.")
                rememberRawKey(created.rawKey)
                const result = await signIn("credentials", {
                    email: normalized,
                    verifier: created.authVerifier,
                    redirect: false,
                })
                if (result?.error) {
                    forgetRawKey()
                    throw new Error("Account created, but sign-in failed. Try signing in.")
                }
            } else {
                const materialResponse = await fetch("/api/auth/material", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: normalized }),
                })
                const material = await materialResponse.json().catch(() => null) as {
                    error?: string
                    kdfSalt?: string
                    wrappedDataKey?: string
                    wrapIv?: string
                } | null
                if (!materialResponse.ok || !material?.kdfSalt || !material.wrappedDataKey || !material.wrapIv) {
                    throw new Error(material?.error || "Email or password is incorrect.")
                }
                const opened = await openVault(password, {
                    kdfSalt: material.kdfSalt,
                    wrappedDataKey: material.wrappedDataKey,
                    wrapIv: material.wrapIv,
                })
                rememberRawKey(opened.rawKey)
                const result = await signIn("credentials", {
                    email: normalized,
                    verifier: opened.authVerifier,
                    redirect: false,
                })
                if (result?.error) {
                    forgetRawKey()
                    throw new Error("Email or password is incorrect.")
                }
            }
            window.location.assign("/diary")
        } catch (error) {
            toast({
                title: mode === "signup" ? "Could not create the account" : "Could not sign in",
                description: error instanceof Error ? error.message : "Try again.",
                variant: "destructive",
            })
        } finally {
            setPending(false)
        }
    }

    async function oauthSignIn(provider: "google" | "github") {
        setOauthLoading(provider)
        try {
            await signIn(provider, { callbackUrl: "/diary" })
        } catch (error) {
            console.error("Login failed", error)
            toast({ title: "Authentication failed", description: "There was a problem signing you in. Please try again.", variant: "destructive" })
            setOauthLoading(null)
        }
    }

    const showOauth = oauth.google || oauth.github

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#12110f] px-4 pt-16">
            <Toaster />
            <div className="w-full max-w-md">
                <h1 className="story-serif text-4xl leading-none text-[#f3ecdf]">
                    {mode === "signup" ? "Create account" : "Sign in"}
                </h1>
                <p className="mt-3 text-sm leading-6 text-[#d5cdc0]">
                    The password encrypts the diary in this browser. If you forget it, the entries cannot be recovered.
                </p>
                <form onSubmit={submit} className="mt-8 space-y-3">
                    {mode === "signup" && (
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Name"
                            autoComplete="name"
                            className={fieldClass}
                            required
                        />
                    )}
                    <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="Email"
                        autoComplete="email"
                        className={fieldClass}
                        required
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Password"
                        autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        className={fieldClass}
                        minLength={10}
                        required
                    />
                    <button type="submit" disabled={pending} className={primaryClass}>
                        {mode === "signup" ? "Create account" : "Sign in"}
                    </button>
                </form>
                <button
                    type="button"
                    className="mt-4 text-sm text-[#8f877c] underline"
                    onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                >
                    {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
                </button>

                {showOauth && (
                    <div className="mt-8 space-y-3">
                        <div className="flex items-center gap-3 text-xs text-[#8f877c]">
                            <span className="h-px flex-1 bg-[#3a342c]" />
                            Or
                            <span className="h-px flex-1 bg-[#3a342c]" />
                        </div>
                        {oauth.google && (
                            <button
                                type="button"
                                className={quietClass}
                                onClick={() => oauthSignIn("google")}
                                disabled={oauthLoading !== null}
                            >
                                <Image src={Google} alt="" width={16} height={16} />
                                Continue with Google
                            </button>
                        )}
                        {oauth.github && (
                            <button
                                type="button"
                                className={quietClass}
                                onClick={() => oauthSignIn("github")}
                                disabled={oauthLoading !== null}
                            >
                                <Image src={Github} alt="" width={16} height={16} />
                                Continue with GitHub
                            </button>
                        )}
                    </div>
                )}
                <p className="mt-8 text-sm text-[#8f877c]">
                    By continuing, you agree to our{" "}
                    <a href="/terms" className="text-[#d5cdc0] underline">Terms</a>
                    {" "}and{" "}
                    <a href="/privacy" className="text-[#d5cdc0] underline">Privacy</a>.
                </p>
            </div>
        </div>
    )
}
