"use client"

import { Button, type ButtonProps } from "@/components/ui/button"
import { useTelegramStore } from "@/context/telegram-store"

interface JoinButtonProps extends ButtonProps {
  chatId: string
  onJoin?: () => void
}

export function JoinButton({ chatId, onJoin, ...props }: JoinButtonProps) {
  const { publicGroups, chats, requestJoinGroup } = useTelegramStore()

  // Find the chat in either public groups or user's chats
  const publicGroup = publicGroups.find((g) => g.id === chatId)
  const userChat = chats.find((c) => c.id === chatId)

  const chat = userChat || publicGroup

  if (!chat) return null

  const handleJoin = () => {
    if (onJoin) {
      onJoin()
    } else {
      requestJoinGroup(chatId)
    }
  }

  // If user is already a member or has a pending request
  if (chat.joinStatus === "member") {
    return null
  }

  if (chat.joinStatus === "pending") {
    return (
      <Button variant="outline" disabled {...props}>
        Pending Approval
      </Button>
    )
  }

  return (
    <Button onClick={handleJoin} {...props}>
      {chat.privacy === "private" ? "Request to Join" : chat.type === "group" ? "Join Group" : "Join Channel"}
    </Button>
  )
}

