"use client"

import { BellOff } from "lucide-react"
import { useTelegramStore } from "@/context/telegram-store"

interface NotificationStatusProps {
  chatId: string
  size?: "sm" | "md" | "lg"
}

export function NotificationStatus({ chatId, size = "md" }: NotificationStatusProps) {
  const { chats } = useTelegramStore()

  const chat = chats.find((c) => c.id === chatId)

  if (!chat || !chat.muted) return null

  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  return <BellOff className={`${sizeClasses[size]} text-muted-foreground`} />
}

