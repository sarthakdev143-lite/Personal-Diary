"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Loader2, LogIn, Mail } from "lucide-react"
import { motion } from "framer-motion"

import Google from './Google.png'
import Github from './Github.png'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { ToastAction } from "@/components/ui/toast"
import Image from "next/image"

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState<{
        google: boolean
        github: boolean
    }>({
        google: false,
        github: false,
    })
    const { toast } = useToast()

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

    return (
        <div className="flex min-h-screen overflow-hidden items-center justify-center bg-black/25 dark p-4 backdrop-blur-md">
            <div className="absolute inset-0 bg-[url('/placeholder.svg?height=50&width=50')] opacity-[0.02] pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-transparent to-purple-500/5 pointer-events-none" />
            <Toaster />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                <Card className="border-border/30 bg-card/80 backdrop-blur-xl shadow-2xl">
                    <CardHeader className="space-y-1">
                        <div className="flex justify-center mb-2">
                            <div className="rounded-full bg-indigo-500/10 p-3 ring-1 ring-indigo-500/20">
                                <LogIn className="h-6 w-6 text-indigo-400" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold text-center">Welcome!</CardTitle>
                        <CardDescription className="text-center text-muted-foreground/80">
                            Please Signin / Signup to Continue
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-2">
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                                variant="outline"
                                className="relative text-base tracking-[0.02em] py-5 w-full bg-background/50 hover:bg-background/80 border border-border/30 text-foreground"
                                onClick={() => handleLogin("google")}
                                disabled={isLoading.google || isLoading.github}
                            >
                                {isLoading.google ? (
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                ) : (
                                    <Image src={Google} alt="Google" width={20} height={20} className="bg-white rounded-full p-[0.2rem]" />
                                )}
                                Continue with Google
                            </Button>
                        </motion.div>

                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                                variant="outline"
                                className="relative w-full text-base tracking-[0.02em] py-5 bg-background/50 hover:bg-background/80 border border-border/30 text-foreground"
                                onClick={() => handleLogin("github")}
                                disabled={isLoading.google || isLoading.github}
                            >
                                {isLoading.github ? (
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                ) : (
                                    <Image src={Github} alt="Github" width={20} height={20} className="bg-white rounded-full p-[0.2rem]" />
                                )}
                                Continue with GitHub
                            </Button>
                        </motion.div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border/20" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="px-2 text-muted-foreground/70">Or continue with</span>
                            </div>
                        </div>

                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                                variant="default"
                                className="relative w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                                onClick={() => {
                                    toast({
                                        title: "Coming soon",
                                        description: "Email login will be available soon.",
                                        action: <ToastAction altText="Acknowledgment button">Got it</ToastAction>,
                                    })
                                }}
                            >
                                <Mail className="mr-2 h-4 w-4" />
                                Continue with Email
                            </Button>
                        </motion.div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2">
                        <div className="text-center text-sm text-muted-foreground/70">
                            By continuing, you agree to our{" "}
                            <a href="#" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4">
                                Terms of Service
                            </a>{" "}
                            and{" "}
                            <a href="#" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4">
                                Privacy Policy
                            </a>
                            .
                        </div>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    )
}

