"use client"

import { useState } from "react"
import { useTelegramStore } from "@/context/telegram-store"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Phone, Video, Search, MoreVertical, BellOff, BellRing, Pin, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { ChatType } from "@/context/telegram-store"

interface ChatHeaderProps {
  chat: ChatType
}

export function ChatHeader({ chat }: ChatHeaderProps) {
  const { toggleMuteChat, togglePinChat, removeChat } = useTelegramStore()
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const handleToggleMute = async () => {
    await toggleMuteChat(chat.id)
  }

  const handleTogglePin = async () => {
    await togglePinChat(chat.id)
  }

  const handleDeleteChat = () => {
    removeChat(chat.id)
  }

  return (
    <div className="flex h-16 items-center justify-between border-b border-border px-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={chat.avatar} />
          <AvatarFallback>{chat.name[0]}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-medium">{chat.name}</h2>
            {chat.online && <Badge variant="outline" className="bg-green-500 h-2 w-2 rounded-full p-0" />}
          </div>
          <p className="text-xs text-muted-foreground">{chat.online ? "online" : "last seen recently"}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon">
          <Phone className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <Video className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(!isSearchOpen)}>
          <Search className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleToggleMute}>
              {chat.muted ? (
                <>
                  <BellRing className="mr-2 h-4 w-4" />
                  <span>Unmute</span>
                </>
              ) : (
                <>
                  <BellOff className="mr-2 h-4 w-4" />
                  <span>Mute</span>
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleTogglePin}>
              <Pin className="mr-2 h-4 w-4" />
              <span>{chat.pinned ? "Unpin" : "Pin"}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDeleteChat} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete Chat</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

