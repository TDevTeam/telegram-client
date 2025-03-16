"use client"

import { BellOff, AtSign } from "lucide-react"
import { useTelegramStore } from "@/context/telegram-store"

interface NotificationStatusProps {
  chatId: string
  size?: "sm" | "md" | "lg"
  showMentions?: boolean
}

export function NotificationStatus({ chatId, size = "md", showMentions = true }: NotificationStatusProps) {
  const { chats } = useTelegramStore()

  const chat = chats.find((c) => c.id === chatId)

  if (!chat) return null

  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  // Check if this chat has mentions
  const hasMentions = chat.hasMentions && showMentions

  return (
    <div className="flex items-center gap-1">
      {chat.muted && <BellOff className={`${sizeClasses[size]} text-muted-foreground`} />}
      {hasMentions && <AtSign className={`${sizeClasses[size]} text-red-500`} />}
    </div>
  )
}

