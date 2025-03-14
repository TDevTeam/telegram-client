import type React from "react"
import type { Metadata } from "next"
import { TelegramStoreProvider } from "@/context/telegram-store"
import { ThemeProvider } from "@/components/theme-provider"
import "@/app/globals.css"

export const metadata: Metadata = {
  title: "Multi-Account Telegram Client",
  description: "A Next.js 15 application for managing multiple Telegram accounts",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <TelegramStoreProvider>{children}</TelegramStoreProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}



import './globals.css'