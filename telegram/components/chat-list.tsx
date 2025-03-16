"use client"

import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import { useState, useEffect } from "react"
import type React from "react"

import { Search, Plus, Filter, ChevronDown, Users, Megaphone } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
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
import { useTelegramStore } from "@/context/telegram-store"
import { NotificationStatus } from "@/components/notification-status"
import { useContextMenu, ContextMenu, createContextMenuItems } from "@/components/context-menu"
import { JoinButton } from "@/components/join-button"

// Mock contacts for adding to groups
const mockContacts = [
  { id: "c1", name: "Emma Thompson", avatar: "/placeholder.svg?height=40&width=40" },
  { id: "c2", name: "Michael Brown", avatar: "/placeholder.svg?height=40&width=40" },
  { id: "c3", name: "Olivia Davis", avatar: "/placeholder.svg?height=40&width=40" },
  { id: "c4", name: "James Wilson", avatar: "/placeholder.svg?height=40&width=40" },
  { id: "c5", name: "Sophia Martinez", avatar: "/placeholder.svg?height=40&width=40" },
]

// Mock available groups and channels
const availableGroups = [
  {
    id: "g1",
    name: "Tech Enthusiasts",
    type: "group",
    memberCount: 150,
    description: "A group for tech lovers.",
    avatar: "/placeholder.svg?height=40&width=40",
    privacy: "public",
  },
  {
    id: "g2",
    name: "Book Club",
    type: "group",
    memberCount: 80,
    description: "Discussing our favorite books.",
    avatar: "/placeholder.svg?height=40&width=40",
    privacy: "private",
  },
  {
    id: "c1",
    name: "News Channel",
    type: "channel",
    subscriberCount: 1200,
    description: "Breaking news updates.",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "c2",
    name: "Music Updates",
    type: "channel",
    subscriberCount: 800,
    description: "Latest music releases.",
    avatar: "/placeholder.svg?height=40&width=40",
  },
]

export function ChatList() {
  const {
    activeAccount,
    chats,
    activeChat,
    setActiveChat,
    addChat,
    updateChat,
    getFilteredChats,
    publicGroups,
    requestJoinGroup,
    removeChat,
    getPendingJoinRequests,
  } = useTelegramStore()

  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateChatDialog, setShowCreateChatDialog] = useState(false)
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false)
  const [showNewChannelDialog, setShowNewChannelDialog] = useState(false)
  const [showAddContactDialog, setShowAddContactDialog] = useState(false)
  const [showJoinGroupDialog, setShowJoinGroupDialog] = useState(false)
  const [newChatName, setNewChatName] = useState("")
  const [newChatType, setNewChatType] = useState<"private" | "group" | "channel">("private")
  const [newChatIsPrivate, setNewChatIsPrivate] = useState(false)
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [channelName, setChannelName] = useState("")
  const [channelDescription, setChannelDescription] = useState("")
  const [groupPrivacy, setGroupPrivacy] = useState<"public" | "private">("public")
  const [filteredChats, setFilteredChats] = useState(getFilteredChats())
  const [activeTab, setActiveTab] = useState("all")

  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu()

  // Update filtered chats when active account changes
  useEffect(() => {
    setFilteredChats(getFilteredChats())
  }, [activeAccount, chats, getFilteredChats])

  // Filter chats based on search query
  useEffect(() => {
    if (searchQuery) {
      setFilteredChats(getFilteredChats().filter((chat) => chat.name.toLowerCase().includes(searchQuery.toLowerCase())))
    } else {
      setFilteredChats(getFilteredChats())
    }
  }, [searchQuery, getFilteredChats])

  // Filter chats based on active tab
  useEffect(() => {
    const allChats = getFilteredChats()

    if (activeTab === "all") {
      setFilteredChats(allChats)
    } else if (activeTab === "private") {
      setFilteredChats(allChats.filter((chat) => chat.type === "private"))
    } else if (activeTab === "groups") {
      setFilteredChats(allChats.filter((chat) => chat.type === "group"))
    } else if (activeTab === "channels") {
      setFilteredChats(allChats.filter((chat) => chat.type === "channel"))
    }
  }, [activeTab, getFilteredChats])

  const handleCreateChat = () => {
    if (newChatName.trim()) {
      // This would trigger a backend API call to create a new chat
      addChat({
        name: newChatName,
        lastMessage: "",
        time: "Just now",
        avatar: "/placeholder.svg?height=40&width=40",
        online: false,
        type: newChatType,
        muted: false,
        pinned: false,
        memberCount: newChatType === "group" ? 1 : undefined,
        subscriberCount: newChatType === "channel" ? 1 : undefined,
        description: `New ${newChatType}`,
        createdBy: activeAccount.name,
        createdAt: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        privacy: newChatIsPrivate ? "private" : "public",
        joinStatus: "member",
      })
      setShowCreateChatDialog(false)
      setNewChatName("")
      setNewChatType("private")
      setNewChatIsPrivate(false)
    }
  }

  const handleCreateGroup = () => {
    if (groupName.trim() && selectedContacts.length > 0) {
      // This would trigger a backend API call to create a new group
      // The backend would handle creating the group in Telegram
      setGroupName("")
      setGroupDescription("")
      setSelectedContacts([])
      setGroupPrivacy("public")
      setShowNewGroupDialog(false)
    }
  }

  const handleCreateChannel = () => {
    if (channelName.trim()) {
      // This would trigger a backend API call to create a new channel
      // The backend would handle creating the channel in Telegram
      setChannelName("")
      setChannelDescription("")
      setShowNewChannelDialog(false)
    }
  }

  const handleContactSelect = (contactId: string) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId],
    )
  }

  const handleChatAction = (chatId: string, action: "mute" | "unmute" | "pin" | "unpin" | "delete") => {
    // These would trigger backend API calls to perform the actions
    switch (action) {
      case "mute":
        updateChat(chatId, { muted: true })
        break
      case "unmute":
        updateChat(chatId, { muted: false })
        break
      case "pin":
        updateChat(chatId, { pinned: true })
        break
      case "unpin":
        updateChat(chatId, { pinned: false })
        break
      case "delete":
        removeChat(chatId)
        break
    }
  }

  const handleChatClick = (chatId: string) => {
    setActiveChat(chatId)
  }

  const handlePinChat = (chatId: string, isPinned: boolean) => {
    // This would trigger a backend API call to pin/unpin the chat
    updateChat(chatId, { pinned: !isPinned })
  }

  const handleMuteChat = (chatId: string, isMuted: boolean) => {
    // This would trigger a backend API call to mute/unmute the chat
    updateChat(chatId, { muted: !isMuted })
  }

  const handleJoinGroup = (groupId: string) => {
    // This would trigger a backend API call to join the group
    requestJoinGroup(groupId)
    setShowJoinGroupDialog(false)
  }

  const handleChatContextMenu = (e: React.MouseEvent, chat: (typeof filteredChats)[0]) => {
    const items = createContextMenuItems({
      isMuted: chat.muted,
      isPinned: chat.pinned,
      onMute: () => handleChatAction(chat.id, chat.muted ? "unmute" : "mute"),
      onPin: () => handleChatAction(chat.id, chat.pinned ? "unpin" : "pin"),
      onDelete: () => handleChatAction(chat.id, "delete"),
    })

    showContextMenu(e, { chat, items })
  }

  return (
    <>
      <div className="flex h-full w-80 flex-col border-r">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">{activeAccount.name}</h2>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowJoinGroupDialog(true)}>
              <Users className="h-4 w-4" />
              <span className="sr-only">Join Group</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowCreateChatDialog(true)}>
              <Plus className="h-4 w-4" />
              <span className="sr-only">New Chat</span>
            </Button>
          </div>
        </div>
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Tabs defaultValue="all" className="flex-1" onValueChange={setActiveTab}>
          <div className="px-2">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="private">Private</TabsTrigger>
              <TabsTrigger value="groups">Groups</TabsTrigger>
              <TabsTrigger value="channels">Channels</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="flex-1 p-0 m-0">
            <ScrollArea className="h-[calc(100vh-140px)]">
              <div className="flex flex-col gap-0.5 p-2">
                {filteredChats
                  .filter((chat) => chat.pinned)
                  .map((chat) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      isActive={activeChat?.id === chat.id}
                      onClick={() => handleChatClick(chat.id)}
                      onPin={() => handlePinChat(chat.id, chat.pinned)}
                      onMute={() => handleMuteChat(chat.id, chat.muted)}
                      onContextMenu={(e) => handleChatContextMenu(e, chat)}
                    />
                  ))}

                {filteredChats.filter((chat) => chat.pinned).length > 0 && <Separator className="my-2" />}

                {filteredChats
                  .filter((chat) => !chat.pinned)
                  .map((chat) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      isActive={activeChat?.id === chat.id}
                      onClick={() => handleChatClick(chat.id)}
                      onPin={() => handlePinChat(chat.id, chat.pinned)}
                      onMute={() => handleMuteChat(chat.id, chat.muted)}
                      onContextMenu={(e) => handleChatContextMenu(e, chat)}
                    />
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="private" className="flex-1 p-0 m-0">
            <ScrollArea className="h-[calc(100vh-140px)]">
              <div className="flex flex-col gap-0.5 p-2">
                {filteredChats
                  .filter((chat) => chat.type === "private")
                  .map((chat) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      isActive={activeChat?.id === chat.id}
                      onClick={() => handleChatClick(chat.id)}
                      onPin={() => handlePinChat(chat.id, chat.pinned)}
                      onMute={() => handleMuteChat(chat.id, chat.muted)}
                      onContextMenu={(e) => handleChatContextMenu(e, chat)}
                    />
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="groups" className="flex-1 p-0 m-0">
            <ScrollArea className="h-[calc(100vh-140px)]">
              <div className="flex flex-col gap-0.5 p-2">
                {filteredChats
                  .filter((chat) => chat.type === "group")
                  .map((chat) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      isActive={activeChat?.id === chat.id}
                      onClick={() => handleChatClick(chat.id)}
                      onPin={() => handlePinChat(chat.id, chat.pinned)}
                      onMute={() => handleMuteChat(chat.id, chat.muted)}
                      onContextMenu={(e) => handleChatContextMenu(e, chat)}
                    />
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="channels" className="flex-1 p-0 m-0">
            <ScrollArea className="h-[calc(100vh-140px)]">
              <div className="flex flex-col gap-0.5 p-2">
                {filteredChats
                  .filter((chat) => chat.type === "channel")
                  .map((chat) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      isActive={activeChat?.id === chat.id}
                      onClick={() => handleChatClick(chat.id)}
                      onPin={() => handlePinChat(chat.id, chat.pinned)}
                      onMute={() => handleMuteChat(chat.id, chat.muted)}
                      onContextMenu={(e) => handleChatContextMenu(e, chat)}
                    />
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Chat Dialog */}
      <Dialog open={showCreateChatDialog} onOpenChange={setShowCreateChatDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Create New {newChatType === "private" ? "Chat" : newChatType === "group" ? "Group" : "Channel"}
            </DialogTitle>
            <DialogDescription>
              {newChatType === "private"
                ? "Start a conversation with a contact."
                : newChatType === "group"
                  ? "Create a group to chat with multiple people."
                  : "Create a channel to broadcast messages to a large audience."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <Button
                variant={newChatType === "private" ? "default" : "outline"}
                onClick={() => setNewChatType("private")}
                className="flex flex-col items-center justify-center h-20 gap-2"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback>P</AvatarFallback>
                </Avatar>
                <span>Private</span>
              </Button>
              <Button
                variant={newChatType === "group" ? "default" : "outline"}
                onClick={() => setNewChatType("group")}
                className="flex flex-col items-center justify-center h-20 gap-2"
              >
                <Users className="h-8 w-8" />
                <span>Group</span>
              </Button>
              <Button
                variant={newChatType === "channel" ? "default" : "outline"}
                onClick={() => setNewChatType("channel")}
                className="flex flex-col items-center justify-center h-20 gap-2"
              >
                <Megaphone className="h-8 w-8" />
                <span>Channel</span>
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                {newChatType === "private" ? "Contact Name" : newChatType === "group" ? "Group Name" : "Channel Name"}
              </Label>
              <Input
                id="name"
                placeholder={
                  newChatType === "private"
                    ? "Enter contact name"
                    : newChatType === "group"
                      ? "Enter group name"
                      : "Enter channel name"
                }
                value={newChatName}
                onChange={(e) => setNewChatName(e.target.value)}
              />
            </div>

            {newChatType !== "private" && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="private">Private {newChatType}</Label>
                  <p className="text-sm text-muted-foreground">
                    {newChatType === "group"
                      ? "Only people with an invite link can join"
                      : "Only people with an invite link can subscribe"}
                  </p>
                </div>
                <Switch id="private" checked={newChatIsPrivate} onCheckedChange={setNewChatIsPrivate} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateChatDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateChat} disabled={!newChatName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Group Dialog */}
      <Dialog open={showJoinGroupDialog} onOpenChange={setShowJoinGroupDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Join Group or Channel</DialogTitle>
            <DialogDescription>Browse and join public groups and channels.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="relative mb-4">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search groups and channels" className="pl-8" />
            </div>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {publicGroups.map((group) => (
                  <div key={group.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={group.avatar} alt={group.name} />
                        <AvatarFallback>{group.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{group.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {group.type === "group"
                            ? `${group.memberCount} members`
                            : `${group.subscriberCount} subscribers`}
                        </p>
                      </div>
                    </div>
                    <JoinButton
                      chatId={group.id}
                      size="sm"
                      variant="outline"
                      onJoin={() => handleJoinGroup(group.id)}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Context Menu */}
      {contextMenu.show && contextMenu.data && (
        <ContextMenu items={contextMenu.data.items} x={contextMenu.x} y={contextMenu.y} onClose={hideContextMenu} />
      )}
    </>
  )
}

interface ChatItemProps {
  chat: {
    id: string
    name: string
    lastMessage: string
    time: string
    unread: number
    avatar: string
    online: boolean
    type: "private" | "group" | "channel"
    muted: boolean
    pinned: boolean
    joinStatus?: "member" | "pending" | "none"
    hasMentions?: boolean
    accountId?: string
  }
  isActive: boolean
  onClick: () => void
  onPin: () => void
  onMute: () => void
  onContextMenu: (e: React.MouseEvent) => void
}

// Update the ChatItem component to show mentions
function ChatItem({ chat, isActive, onClick, onPin, onMute, onContextMenu }: ChatItemProps) {
  const { activeAccount } = useTelegramStore()

  // Check if this chat has mentions for the current user
  const hasMentions = chat.hasMentions && chat.accountId === activeAccount.id

  return (
    <div
      className={`flex cursor-pointer items-center justify-between rounded-md p-2 ${
        isActive ? "bg-muted" : "hover:bg-muted/50"
      }`}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar>
            <AvatarImage src={chat.avatar} alt={chat.name} />
            <AvatarFallback>{chat.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          {chat.online && chat.type === "private" && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background"></span>
          )}
          {hasMentions && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-red-500 ring-2 ring-background"></span>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center justify-between">
            <h3 className="font-medium truncate">{chat.name}</h3>
            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{chat.time}</span>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground truncate">
              {chat.joinStatus === "pending" ? "Waiting for approval..." : chat.lastMessage}
            </p>
            <div className="flex items-center gap-1 ml-2">
              {chat.pinned && <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>}
              <NotificationStatus chatId={chat.id} size="sm" />
              {chat.unread > 0 && (
                <Badge
                  className={`ml-auto h-5 min-w-[20px] px-1 ${chat.muted ? "bg-muted text-muted-foreground" : ""}`}
                >
                  {chat.unread}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
            <Filter className="h-4 w-4" />
            <span className="sr-only">More</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              onPin()
            }}
          >
            {chat.pinned ? "Unpin" : "Pin"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              onMute()
            }}
          >
            {chat.muted ? "Unmute" : "Mute"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>Mark as read</DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>Archive</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={(e) => e.stopPropagation()}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

