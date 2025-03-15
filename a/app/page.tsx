"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTelegramStore } from "@/context/telegram-store"
import { AccountSidebar } from "@/components/account-sidebar"
import { ChatList } from "@/components/chat-list"
import { ChatView } from "@/components/chat-view"

export default function HomePage() {
  const router = useRouter()
  const { loginState, activeAccount, activeChat } = useTelegramStore()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (loginState.step !== "complete" && !activeAccount.sessionString) {
      router.push("/login")
    }
  }, [loginState, activeAccount, router])

  if (loginState.step !== "complete" && !activeAccount.sessionString) {
    return null
  }

  return (
    <div className="flex h-svh w-full bg-background">
      <AccountSidebar />
      <ChatList />
      <main className="flex flex-1 flex-col">
        {activeChat ? (
          <ChatView />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-4 text-center">
            <div className="max-w-md space-y-4">
              <h2 className="text-2xl font-bold">Welcome to Multi-Telegram</h2>
              <p className="text-muted-foreground">
                Select a chat from the list to start messaging, or create a new conversation.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

