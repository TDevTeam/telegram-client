"use client"

import { useState } from "react"
import { useTelegramStore } from "@/context/telegram-store"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Trash2, Reply, Forward, Copy, Heart, ThumbsUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface MessageProps {
  message: {
    id: string
    sender: string
    content: string
    time: string
    avatar: string
    reactions: Record<string, number>
    isRead?: boolean
    replyTo?: {
      id: string
      content: string
      sender: string
    }
  }
  isCurrentUser: boolean
  chatId: string
}

// Update the Message component to highlight mentions
export function Message({ message, isCurrentUser, chatId }: MessageProps) {
  const { activeAccount, addReaction, deleteMessage } = useTelegramStore()
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // Check if this message mentions the current user
  const hasMention = !isCurrentUser && message.content.includes(`@${activeAccount.username}`)

  const handleReactionSelect = async (emoji: string) => {
    await addReaction(chatId, message.id, emoji)
    setShowEmojiPicker(false)
  }

  const handleDeleteMessage = async () => {
    await deleteMessage(chatId, message.id)
  }

  return (
    <div className={cn("group flex w-full gap-2", isCurrentUser ? "justify-end" : "justify-start")}>
      {!isCurrentUser && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={message.avatar} />
          <AvatarFallback>{message.sender[0]}</AvatarFallback>
        </Avatar>
      )}
      <div className="flex max-w-[80%] flex-col">
        {!isCurrentUser && <span className="mb-1 text-xs font-medium">{message.sender}</span>}

        {message.replyTo && (
          <div className="mb-1 rounded border-l-2 border-primary/50 bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
            <div className="font-medium">{message.replyTo.sender}</div>
            <div className="truncate">{message.replyTo.content}</div>
          </div>
        )}

        <div className="relative">
          <div
            className={cn(
              "rounded-lg px-3 py-2",
              isCurrentUser
                ? "bg-primary text-primary-foreground"
                : hasMention
                  ? "bg-red-100 dark:bg-red-900/30"
                  : "bg-muted",
            )}
          >
            {/* Highlight mentions in the message content */}
            {hasMention ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: message.content.replace(
                    new RegExp(`(@${activeAccount.username})`, "g"),
                    '<span class="font-bold text-red-500">$1</span>',
                  ),
                }}
              />
            ) : (
              message.content
            )}
            <span className="ml-2 inline-block text-xs opacity-70">{message.time}</span>
          </div>

          {/* Reactions */}
          {Object.keys(message.reactions).length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {Object.entries(message.reactions).map(([emoji, count]) => (
                <div
                  key={emoji}
                  className="flex items-center rounded-full bg-background px-1.5 py-0.5 text-xs shadow-sm"
                >
                  <span>{emoji}</span>
                  <span className="ml-1 text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Quick reaction buttons */}
          <div className="absolute -top-8 right-0 hidden items-center rounded-full bg-background p-1 shadow group-hover:flex">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleReactionSelect("❤️")}>
              <Heart className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleReactionSelect("👍")}>
              <ThumbsUp className="h-4 w-4" />
            </Button>
          </div>

          {/* Message actions */}
          <div className="absolute -right-10 top-0 hidden group-hover:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="flex items-center gap-2">
                  <Reply className="h-4 w-4" />
                  <span>Reply</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <Forward className="h-4 w-4" />
                  <span>Forward</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  <span>Copy Text</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center gap-2 text-destructive focus:text-destructive"
                  onClick={handleDeleteMessage}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {isCurrentUser && message.isRead && <span className="mt-1 self-end text-xs text-muted-foreground">Read</span>}
      </div>
      {isCurrentUser && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={message.avatar} />
          <AvatarFallback>{message.sender[0]}</AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}

