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
      // Create members array from selected contacts
      const members = selectedContacts.map((contactId) => {
        const contact = mockContacts.find((c) => c.id === contactId)
        return {
          id: contactId,
          name: contact?.name || "",
          username: `@${contact?.name.toLowerCase().replace(/\s/g, "")}`,
          avatar: contact?.avatar || "",
          role: "member",
          online: Math.random() > 0.5, // Random online status
        }
      })

      // Add current user as admin
      members.unshift({
        id: "current-user",
        name: "You",
        username: "@you",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "admin",
        online: true,
      })

      // Add the new group
      addChat({
        name: groupName,
        lastMessage: "Group created",
        time: "Just now",
        avatar: "/placeholder.svg?height=40&width=40",
        online: false,
        type: "group",
        isAdmin: true,
        memberCount: members.length,
        muted: false,
        pinned: false,
        description: groupDescription,
        createdBy: "You",
        createdAt: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        members: members,
        privacy: groupPrivacy,
        joinStatus: "member",
      })

      setGroupName("")
      setGroupDescription("")
      setSelectedContacts([])
      setGroupPrivacy("public")
      setShowNewGroupDialog(false)
    }
  }

  const handleCreateChannel = () => {
    if (channelName.trim()) {
      // Add the new channel
      addChat({
        name: channelName,
        lastMessage: "Channel created",
        time: "Just now",
        avatar: "/placeholder.svg?height=40&width=40",
        online: false,
        type: "channel",
        isAdmin: true,
        subscriberCount: 1,
        muted: false,
        pinned: false,
        description: channelDescription,
        createdBy: "You",
        createdAt: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        members: [
          {
            id: "current-user",
            name: "You",
            username: "@you",
            avatar: "/placeholder.svg?height=40&width=40",
            role: "admin",
            online: true,
          },
        ],
        privacy: "public",
        joinStatus: "member",
      })

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
    updateChat(chatId, { pinned: !isPinned })
  }

  const handleMuteChat = (chatId: string, isMuted: boolean) => {
    updateChat(chatId, { muted: !isMuted })
  }

  const handleJoinGroup = (groupId: string) => {
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

      {/* New Group Dialog */}
      <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>Create a group to chat with multiple people at once.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                placeholder="Enter group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="group-description">Description (optional)</Label>
              <Input
                id="group-description"
                placeholder="What's this group about?"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Privacy</Label>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="public"
                    name="privacy"
                    checked={groupPrivacy === "public"}
                    onChange={() => setGroupPrivacy("public")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="public" className="font-normal">
                    Public
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="private"
                    name="privacy"
                    checked={groupPrivacy === "private"}
                    onChange={() => setGroupPrivacy("private")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="private" className="font-normal">
                    Private
                  </Label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {groupPrivacy === "public"
                  ? "Anyone can find and join this group"
                  : "People need approval to join this group"}
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Add Members</Label>
              <div className="max-h-[200px] overflow-y-auto border rounded-md p-2">
                {mockContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md">
                    <input
                      type="checkbox"
                      id={`contact-${contact.id}`}
                      checked={selectedContacts.includes(contact.id)}
                      onChange={() => handleContactSelect(contact.id)}
                      className="h-4 w-4"
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={contact.avatar} alt={contact.name} />
                      <AvatarFallback>{contact.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <Label htmlFor={`contact-${contact.id}`} className="font-normal">
                      {contact.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewGroupDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup} disabled={!groupName.trim() || selectedContacts.length === 0}>
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Group Dialog */}
      <Dialog open={showJoinGroupDialog} onOpenChange={setShowJoinGroupDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Join Groups & Channels</DialogTitle>
            <DialogDescription>Discover and join public groups and channels.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="relative mb-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search groups and channels..." className="pl-8" />
            </div>

            <Tabs defaultValue="groups">
              <TabsList className="w-full">
                <TabsTrigger value="groups" className="flex-1">
                  Groups
                </TabsTrigger>
                <TabsTrigger value="channels" className="flex-1">
                  Channels
                </TabsTrigger>
              </TabsList>

              <TabsContent value="groups" className="mt-4">
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {availableGroups
                    .filter((group) => group.type === "group")
                    .map((group) => (
                      <div key={group.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={group.avatar} alt={group.name} />
                            <AvatarFallback>{group.name.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{group.name}</p>
                              {group.privacy === "private" && (
                                <Badge variant="outline" className="text-xs">
                                  Private
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{group.memberCount} members</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{group.description}</p>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => handleJoinGroup(group.id)}>
                          {group.privacy === "public" ? "Join" : "Request"}
                        </Button>
                      </div>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="channels" className="mt-4">
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {availableGroups
                    .filter((group) => group.type === "channel")
                    .map((channel) => (
                      <div key={channel.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={channel.avatar} alt={channel.name} />
                            <AvatarFallback>{channel.name.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{channel.name}</p>
                            <p className="text-xs text-muted-foreground">{channel.subscriberCount} subscribers</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{channel.description}</p>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => handleJoinGroup(channel.id)}>
                          Join
                        </Button>
                      </div>
                    ))}
                </div>
              </TabsContent>
            </Tabs>
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
  }
  isActive: boolean
  onClick: () => void
  onPin: () => void
  onMute: () => void
}

function ChatItem({ chat, isActive, onClick, onPin, onMute }: ChatItemProps) {
  return (
    <div
      className={`flex cursor-pointer items-center justify-between rounded-md p-2 ${
        isActive ? "bg-muted" : "hover:bg-muted/50"
      }`}
      onClick={onClick}
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
              {chat.unread > 0 && !chat.muted && <Badge className="ml-auto h-5 min-w-[20px] px-1">{chat.unread}</Badge>}
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

