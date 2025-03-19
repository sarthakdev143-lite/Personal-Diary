'use client'

import { SessionProvider } from "next-auth/react"
import { useEffect } from "react"

export function Providers({ children }: { children: React.ReactNode }) {

  useEffect(() => {
    if (sessionStorage.getItem("dev_warning")) return
    alert("This Awesome Project is still under development. 👨‍💻 \nSurf with caution. 🚧")
    sessionStorage.setItem("dev_warning", "true")
  }, [])

  return <SessionProvider>{children}</SessionProvider>
}

