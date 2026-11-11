"use client"

import { FormEvent, useEffect, useState } from "react"
import { signIn } from "next-auth/react"
import { Loader2 } from "lucide-react"
import Image from "next/image"

import Google from "./Google.png"
import Github from "./Github.png"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { normalizeEmail } from "@/lib/email"
import { createVault, openVault, passwordError } from "@/lib/vault"
import { forgetRawKey, rememberRawKey } from "@/lib/vault-session"

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
        <div className="flex min-h-screen items-center justify-center px-4 pt-16">
            <Toaster />
            <div className="w-full max-w-md">
                <Card className="border-border/30 bg-card/80 shadow-2xl backdrop-blur-xl">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-normal">
                            {mode === "signup" ? "Create account" : "Sign in"}
                        </CardTitle>
                        <CardDescription className="text-center text-muted-foreground/80">
                            The password encrypts the diary in this browser. If you forget it, the entries cannot be recovered.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-2">
                        <form onSubmit={submit} className="space-y-3">
                            {mode === "signup" && (
                                <Input
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder="Name"
                                    autoComplete="name"
                                    className="border-white/15 text-white"
                                    required
                                />
                            )}
                            <Input
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="Email"
                                autoComplete="email"
                                className="border-white/15 text-white"
                                required
                            />
                            <Input
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder="Password"
                                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                                className="border-white/15 text-white"
                                minLength={10}
                                required
                            />
                            <Button type="submit" disabled={pending} className="w-full bg-indigo-600 text-white hover:bg-indigo-700">
                                {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {mode === "signup" ? "Create account" : "Sign in"}
                            </Button>
                        </form>
                        <button
                            type="button"
                            className="w-full text-center text-sm text-indigo-300 underline-offset-4 hover:underline"
                            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                        >
                            {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
                        </button>

                        {showOauth && (
                            <>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-border/20" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="px-2 text-muted-foreground/70">Or</span>
                                    </div>
                                </div>
                                {oauth.google && (
                                    <Button
                                        variant="outline"
                                        className="relative w-full border border-border/30 bg-background/50 py-5 text-base tracking-[0.02em] text-foreground hover:bg-background/80"
                                        onClick={() => oauthSignIn("google")}
                                        disabled={oauthLoading !== null}
                                    >
                                        {oauthLoading === "google" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Image src={Google} alt="" width={20} height={20} className="rounded-full bg-white p-[0.2rem]" />}
                                        Continue with Google
                                    </Button>
                                )}
                                {oauth.github && (
                                    <Button
                                        variant="outline"
                                        className="relative w-full border border-border/30 bg-background/50 py-5 text-base tracking-[0.02em] text-foreground hover:bg-background/80"
                                        onClick={() => oauthSignIn("github")}
                                        disabled={oauthLoading !== null}
                                    >
                                        {oauthLoading === "github" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Image src={Github} alt="" width={20} height={20} className="rounded-full bg-white p-[0.2rem]" />}
                                        Continue with GitHub
                                    </Button>
                                )}
                            </>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2">
                        <div className="text-center text-sm text-muted-foreground/70">
                            By continuing, you agree to our{" "}
                            <a href="/terms" className="text-indigo-400 underline underline-offset-4 hover:text-indigo-300">Terms</a>
                            {" "}and{" "}
                            <a href="/privacy" className="text-indigo-400 underline underline-offset-4 hover:text-indigo-300">Privacy</a>.
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
