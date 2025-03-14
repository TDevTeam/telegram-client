"use client"

import * as React from "react"
import { Bell, BellOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTelegramStore } from "@/context/telegram-store"

interface NotificationStatusProps {
  accountId?: string
  chatId?: string
  className?: string
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
}

export function NotificationStatus({
  accountId,
  chatId,
  className,
  showLabel = false,
  size = "md",
}: NotificationStatusProps) {
  const { accounts, chats, updateAccount, updateChat } = useTelegramStore()

  // Determine if we're showing account or chat notification status
  const isAccount = !!accountId
  const isMuted = React.useMemo(() => {
    if (isAccount) {
      const account = accounts.find((a) => a.id === accountId)
      return account?.muted || false
    } else if (chatId) {
      const chat = chats.find((c) => c.id === chatId)
      return chat?.muted || false
    }
    return false
  }, [isAccount, accountId, chatId, accounts, chats])

  const toggleMute = () => {
    if (isAccount && accountId) {
      updateAccount(accountId, { muted: !isMuted })
    } else if (chatId) {
      updateChat(chatId, { muted: !isMuted })
    }
  }

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggleMute}
            className={cn("flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-muted", className)}
          >
            {isMuted ? <BellOff className={sizeClasses[size]} /> : <Bell className={sizeClasses[size]} />}
            {showLabel && <span className="text-sm">{isMuted ? "Muted" : "Notifications on"}</span>}
          </button>
        </TooltipTrigger>
        <TooltipContent>{isMuted ? "Unmute notifications" : "Mute notifications"}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

