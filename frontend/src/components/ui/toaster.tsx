"use client"

import { useLayoutEffect } from "react"
import { usePathname } from "next/navigation"

import { keepToastsForPage, useToast } from "@/hooks/use-toast"
import { toastContent, toastsForPage } from "@/lib/diary/toast-page"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster({ viewportClassName }: { viewportClassName?: string }) {
  const pathname = usePathname()
  const { toasts } = useToast()
  const visible = toastsForPage(toasts, pathname)

  useLayoutEffect(() => {
    keepToastsForPage(pathname)
  }, [pathname])

  return (
    <ToastProvider>
      {visible.map(function (item) {
        const { id, title, description, action, ...props } = toastContent(item)
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport className={viewportClassName} />
    </ToastProvider>
  )
}
