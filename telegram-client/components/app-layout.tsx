"use client"

import { useState, useEffect } from "react"
import { AccountSidebar } from "@/components/account-sidebar"
import { ChatList } from "@/components/chat-list"
import { ChatView } from "@/components/chat-view"
import { TelegramStoreProvider } from "@/context/telegram-store"

export function AppLayout() {
  const [mounted, setMounted] = useState(false)

  // This ensures hydration issues are avoided
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <TelegramStoreProvider>
      <div className="flex h-screen">
        <AccountSidebar />
        <ChatList />
        <div className="flex-1">
          <ChatView />
        </div>
      </div>
    </TelegramStoreProvider>
  )
}

