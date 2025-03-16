"use client"

import { useState } from "react"
import { Smile } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface MessageReactionsProps {
  messageId: string
  onAddReaction: (messageId: string, emoji: string) => void
  onRemoveReaction: (messageId: string, emoji: string) => void
  align?: "start" | "center" | "end"
}

// Common Telegram-like reaction emojis
const reactionEmojis = ["👍", "❤️", "🔥", "👏", "😂", "😮", "😢", "🎉", "🚀", "👎"]

export function MessageReactions({
  messageId,
  onAddReaction,
  onRemoveReaction,
  align = "start",
}: MessageReactionsProps) {
  const [open, setOpen] = useState(false)

  const handleReactionClick = (emoji: string) => {
    onAddReaction(messageId, emoji)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div
        className={`absolute ${align === "end" ? "right-0" : "left-0"} -top-8 opacity-0 group-hover:opacity-100 transition-opacity`}
      >
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="h-7 w-7 rounded-full">
            <Smile className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-auto p-2" align={align}>
        <div className="flex gap-1">
          {reactionEmojis.map((emoji) => (
            <button
              key={emoji}
              className="text-lg hover:bg-muted p-1 rounded-md transition-colors"
              onClick={() => handleReactionClick(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

