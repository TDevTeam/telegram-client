"use client"

import { useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useTelegramStore } from "@/context/telegram-store"
import { AccountSidebar } from "@/components/account-sidebar"
import { ChatList } from "@/components/chat-list"
import { ChatView } from "@/components/chat-view"

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const { loginState, activeAccount, setActiveChat } = useTelegramStore()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (loginState.step !== "complete" && !activeAccount.sessionString) {
      router.push("/login")
    }
  }, [loginState, activeAccount, router])

  // Set active chat based on URL parameter
  useEffect(() => {
    if (params.id && typeof params.id === "string") {
      setActiveChat(params.id)
    }
  }, [params.id, setActiveChat])

  if (loginState.step !== "complete" && !activeAccount.sessionString) {
    return null
  }

  return (
    <div className="flex h-svh w-full bg-background">
      <AccountSidebar />
      <ChatList />
      <main className="flex flex-1 flex-col">
        <ChatView />
      </main>
    </div>
  )
}

