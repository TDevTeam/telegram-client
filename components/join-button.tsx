"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { useTelegramStore } from "@/context/telegram-store"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"

interface JoinButtonProps {
  chatId: string
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function JoinButton({ chatId, variant = "default", size = "default", className }: JoinButtonProps) {
  const { chats, activeAccount, addMember, updateChat } = useTelegramStore()
  const [showDialog, setShowDialog] = React.useState(false)
  const [joining, setJoining] = React.useState(false)
  const [enableNotifications, setEnableNotifications] = React.useState(true)
  const [username, setUsername] = React.useState(activeAccount.username)

  const chat = chats.find((c) => c.id === chatId)

  // Check if user is already a member
  const isMember = React.useMemo(() => {
    if (!chat || !chat.members) return false
    return chat.members.some((member) => member.id === activeAccount.id)
  }, [chat, activeAccount.id])

  const handleJoin = async () => {
    if (!chat) return

    setJoining(true)

    // Simulate network request
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Add current user as a member
    addMember(chatId, {
      id: activeAccount.id,
      name: activeAccount.name,
      username: username,
      avatar: activeAccount.avatar,
      role: "member",
      online: true,
    })

    // Update notification settings
    if (!enableNotifications) {
      updateChat(chatId, { muted: true })
    }

    setJoining(false)
    setShowDialog(false)
  }

  if (!chat) return null

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setShowDialog(true)}
        disabled={isMember}
      >
        {isMember ? "Joined" : "Join"}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Join {chat.name}</DialogTitle>
            <DialogDescription>
              {chat.type === "group"
                ? "Join this group to participate in the conversation."
                : "Subscribe to this channel to receive updates."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your visible username"
              />
              <p className="text-sm text-muted-foreground">This is how you'll appear to other members.</p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="notifications"
                checked={enableNotifications}
                onCheckedChange={(checked) => setEnableNotifications(checked as boolean)}
              />
              <Label htmlFor="notifications" className="text-sm font-normal">
                Enable notifications
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleJoin} disabled={joining}>
              {joining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                `Join ${chat.type === "group" ? "Group" : "Channel"}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

