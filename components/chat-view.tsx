"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import {
  Paperclip,
  Send,
  ImageIcon,
  File,
  Smile,
  Mic,
  Phone,
  Video,
  MoreVertical,
  ArrowLeft,
  Info,
  Settings,
  Users,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useMobile } from "@/hooks/use-mobile"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ProfileView } from "@/components/profile-view"
import { MessageReactions } from "@/components/message-reactions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { GroupInfo } from "@/components/group-info"
import { useTelegramStore } from "@/context/telegram-store"
import { JoinButton } from "@/components/join-button"
import { NotificationStatus } from "@/components/notification-status"
import { useContextMenu, ContextMenu, createContextMenuItems } from "@/components/context-menu"

export function ChatView() {
  const {
    activeChat,
    messages,
    mediaItems,
    addMessage,
    addReaction,
    removeReaction,
    setActiveMember,
    updateChat,
    toggleMuteMember,
    toggleContactStatus,
    updateMessage,
    deleteMessage,
    activeAccount,
  } = useTelegramStore()

  const [messageText, setMessageText] = useState("")
  const isMobile = useMobile()
  const [showInfoSheet, setShowInfoSheet] = useState(false)
  const [showAccountSettingsDialog, setShowAccountSettingsDialog] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [replyingTo, setReplyingTo] = useState<{
    id: string
    content: string
    sender: string
  } | null>(null)

  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu()

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, activeChat?.id])

  // If no active chat is selected, show a placeholder
  if (!activeChat) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md space-y-4">
          <h2 className="text-2xl font-bold">Welcome to Multi-Telegram</h2>
          <p className="text-muted-foreground">
            Select a chat from the list to start messaging, or create a new conversation.
          </p>
        </div>
      </div>
    )
  }

  const chatMessages = messages[activeChat.id] || []
  const chatMedia = mediaItems[activeChat.id] || []

  // Check if user is a member of this chat/group/channel
  const isMember = activeChat.members?.some((member) => member.id === activeAccount.id) || activeChat.type === "private"

  const handleSendMessage = () => {
    if (messageText.trim()) {
      addMessage(activeChat.id, {
        sender: "You",
        senderId: "current-user",
        content: messageText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        avatar: "/placeholder.svg?height=40&width=40",
        reactions: {},
        isRead: true,
        replyTo: replyingTo || undefined,
      })

      setMessageText("")
      setReplyingTo(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    } else if (e.key === "Escape" && replyingTo) {
      setReplyingTo(null)
    }
  }

  const handleAddReaction = (messageId: string, emoji: string) => {
    addReaction(activeChat.id, messageId, emoji)
  }

  const handleRemoveReaction = (messageId: string, emoji: string) => {
    removeReaction(activeChat.id, messageId, emoji)
  }

  const handleMemberClick = (memberId: string) => {
    if (activeChat.members) {
      const member = activeChat.members.find((m) => m.id === memberId)
      if (member) {
        setActiveMember(member)
        setShowInfoSheet(true)
      }
    }
  }

  const handleMessageContextMenu = (e: React.MouseEvent, message: (typeof chatMessages)[0]) => {
    const items = createContextMenuItems({
      onReply: () =>
        setReplyingTo({
          id: message.id,
          content: message.content,
          sender: message.sender,
        }),
      onCopy: () => navigator.clipboard.writeText(message.content),
      onDelete: message.senderId === "current-user" ? () => deleteMessage(activeChat.id, message.id) : undefined,
      onForward: () => {
        // Would implement forwarding functionality
        console.log("Forward message:", message.content)
      },
    })

    showContextMenu(e, { message, items })
  }

  const handleUserContextMenu = (e: React.MouseEvent, memberId: string) => {
    if (!activeChat.members) return

    const member = activeChat.members.find((m) => m.id === memberId)
    if (!member) return

    const items = createContextMenuItems({
      isMuted: member.muted,
      isContact: member.isContact,
      onMute: () => toggleMuteMember(activeChat.id, memberId),
      onToggleContact: () => toggleContactStatus(activeChat.id, memberId),
    })

    showContextMenu(e, { member, items })
  }

  const handleChatMuteToggle = () => {
    updateChat(activeChat.id, { muted: !activeChat.muted })
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-3">
          {isMobile && (
            <Button variant="ghost" size="icon" className="md:hidden">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Sheet open={showInfoSheet} onOpenChange={setShowInfoSheet}>
            <SheetTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 p-2">
                <Avatar>
                  <AvatarImage src={activeChat.avatar} alt={activeChat.name} />
                  <AvatarFallback>{activeChat.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold text-left">{activeChat.name}</h2>
                  <p className="text-xs text-muted-foreground text-left">
                    {activeChat.type === "private"
                      ? activeChat.online
                        ? "online"
                        : "offline"
                      : activeChat.type === "group"
                        ? `${activeChat.memberCount} members`
                        : `${activeChat.subscriberCount} subscribers`}
                  </p>
                </div>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-[350px] sm:w-[400px]">
              {activeChat.type === "private" ? (
                <ProfileView
                  profile={{
                    id: activeChat.id,
                    name: activeChat.name,
                    avatar: activeChat.avatar,
                    status: activeChat.online ? "online" : "offline",
                    type: "private",
                  }}
                  media={chatMedia}
                  mutualGroups={[]}
                  onClose={() => setShowInfoSheet(false)}
                />
              ) : (
                <GroupInfo
                  chat={activeChat}
                  media={chatMedia}
                  onMemberClick={handleMemberClick}
                  onClose={() => setShowInfoSheet(false)}
                />
              )}
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex items-center gap-1">
          <NotificationStatus chatId={activeChat.id} size="md" />

          {!isMember && activeChat.type !== "private" && (
            <JoinButton chatId={activeChat.id} size="sm" variant="outline" />
          )}

          {activeChat.type === "private" && isMember && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Phone className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Call</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Video className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Video Call</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={() => setShowAccountSettingsDialog(true)}>
            <Settings className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowInfoSheet(true)}>
                {activeChat.type === "private" ? (
                  <>
                    <Info className="mr-2 h-4 w-4" />
                    View Profile
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    View {activeChat.type === "group" ? "Group" : "Channel"} Info
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem>Search</DropdownMenuItem>
              <DropdownMenuItem onClick={handleChatMuteToggle}>
                {activeChat.muted ? "Unmute Notifications" : "Mute Notifications"}
              </DropdownMenuItem>
              <DropdownMenuItem>Clear Chat</DropdownMenuItem>
              {activeChat.type === "private" && (
                <DropdownMenuItem className="text-destructive">Block User</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {!isMember && activeChat.type !== "private" && (
          <div className="mb-4 rounded-lg bg-muted p-4 text-center">
            <h3 className="mb-2 font-medium">Join this {activeChat.type}</h3>
            <p className="mb-3 text-sm text-muted-foreground">
              {activeChat.type === "group"
                ? "Join this group to participate in the conversation"
                : "Subscribe to this channel to receive updates"}
            </p>
            <JoinButton chatId={activeChat.id} />
          </div>
        )}

        {replyingTo && (
          <div className="sticky top-0 z-10 mb-2 flex items-center justify-between rounded-md bg-muted p-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-1 rounded-full bg-primary"></div>
              <div className="flex flex-col">
                <span className="text-xs font-medium">{replyingTo.sender}</span>
                <span className="text-xs text-muted-foreground line-clamp-1">{replyingTo.content}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>
              Cancel
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {chatMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderId === "current-user" ? "justify-end" : "justify-start"}`}
              onContextMenu={(e) => handleMessageContextMenu(e, message)}
            >
              <div
                className={`flex max-w-[80%] ${
                  message.senderId === "current-user" ? "flex-row-reverse" : "flex-row"
                } items-end gap-2 group`}
              >
                {message.senderId !== "current-user" && (
                  <Avatar
                    className="h-8 w-8 cursor-pointer"
                    onClick={() => {
                      if (activeChat.type !== "private" && activeChat.members) {
                        handleMemberClick(message.senderId)
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (activeChat.type !== "private" && activeChat.members) {
                        handleUserContextMenu(e, message.senderId)
                      }
                    }}
                  >
                    <AvatarImage src={message.avatar} alt={message.sender} />
                    <AvatarFallback>{message.sender.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                )}
                <div className="relative">
                  {message.replyTo && (
                    <div
                      className={`mb-1 rounded-md bg-muted/50 p-1.5 text-xs ${
                        message.senderId === "current-user" ? "mr-2" : "ml-2"
                      }`}
                    >
                      <div className="font-medium">{message.replyTo.sender}</div>
                      <div className="text-muted-foreground line-clamp-1">{message.replyTo.content}</div>
                    </div>
                  )}
                  <div
                    className={`rounded-lg p-3 ${
                      message.senderId === "current-user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    {activeChat.type !== "private" && message.senderId !== "current-user" && (
                      <p
                        className={`font-medium text-sm ${
                          message.senderId === "current-user" ? "text-primary-foreground" : "text-foreground"
                        }`}
                      >
                        {message.sender}
                      </p>
                    )}
                    <p>{message.content}</p>
                    <div className="flex items-center justify-end gap-1 text-right text-xs">
                      <span
                        className={`${
                          message.senderId === "current-user" ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}
                      >
                        {message.time}
                      </span>
                      {message.senderId === "current-user" && (
                        <span
                          className={`${message.isRead ? "text-primary-foreground/70" : "text-primary-foreground/40"}`}
                        >
                          {message.isRead ? "✓✓" : "✓"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Message reactions */}
                  {Object.keys(message.reactions).length > 0 && (
                    <div
                      className={`absolute ${
                        message.senderId === "current-user" ? "right-0" : "left-0"
                      } -bottom-2 flex gap-1 bg-background rounded-full px-1 py-0.5 border shadow-sm`}
                    >
                      {Object.entries(message.reactions).map(([emoji, count]) => (
                        <div key={emoji} className="flex items-center">
                          <span className="text-xs">{emoji}</span>
                          {count > 1 && <span className="text-xs ml-0.5">{count}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reaction picker */}
                  <MessageReactions
                    messageId={message.id}
                    onAddReaction={handleAddReaction}
                    onRemoveReaction={handleRemoveReaction}
                    align={message.senderId === "current-user" ? "end" : "start"}
                  />
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <Separator />
      {isMember ? (
        <div className="p-4">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Paperclip className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top">
                <DropdownMenuItem>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  <span>Image</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <File className="mr-2 h-4 w-4" />
                  <span>Document</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Input
              placeholder="Type a message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button variant="ghost" size="icon">
              <Smile className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Mic className="h-5 w-5" />
            </Button>
            <Button size="icon" onClick={handleSendMessage} disabled={!messageText.trim()}>
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 text-center">
          <JoinButton chatId={activeChat.id} className="w-full" />
        </div>
      )}

      {/* Account Settings Dialog */}
      <Dialog open={showAccountSettingsDialog} onOpenChange={setShowAccountSettingsDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Account Settings</DialogTitle>
            <DialogDescription>Configure settings for your current account.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive notifications for new messages</p>
              </div>
              <Switch id="notifications" checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dark-mode">Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Switch between light and dark theme</p>
              </div>
              <Switch id="dark-mode" checked={darkMode} onCheckedChange={setDarkMode} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <select
                id="language"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ru">Russian</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowAccountSettingsDialog(false)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Context Menu */}
      {contextMenu.show && contextMenu.data && (
        <ContextMenu items={contextMenu.data.items} x={contextMenu.x} y={contextMenu.y} onClose={hideContextMenu} />
      )}
    </div>
  )
}

