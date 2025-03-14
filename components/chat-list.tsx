"use client"

import { useState } from "react"
import { Search, Plus, Users, Megaphone, UserPlus, BellOff, Bell, Pin, PinOff, Trash2 } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useTelegramStore } from "@/context/telegram-store"

// Mock contacts for adding to groups
const mockContacts = [
  { id: "c1", name: "Emma Thompson", avatar: "/placeholder.svg?height=40&width=40" },
  { id: "c2", name: "Michael Brown", avatar: "/placeholder.svg?height=40&width=40" },
  { id: "c3", name: "Olivia Davis", avatar: "/placeholder.svg?height=40&width=40" },
  { id: "c4", name: "James Wilson", avatar: "/placeholder.svg?height=40&width=40" },
  { id: "c5", name: "Sophia Martinez", avatar: "/placeholder.svg?height=40&width=40" },
]

export function ChatList() {
  const { 
    chats, 
    activeChat, 
    setActiveChat, 
    updateChat, 
    removeChat, 
    addChat 
  } = useTelegramStore()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false)
  const [showNewChannelDialog, setShowNewChannelDialog] = useState(false)
  const [showAddContactDialog, setShowAddContactDialog] = useState(false)
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [channelName, setChannelName] = useState("")
  const [channelDescription, setChannelDescription] = useState("")
  
  const filteredChats = chats
    .sort((a, b) => {
      // Sort pinned chats first
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    })
    .filter(chat => 
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (activeTab === "all" || 
       (activeTab === "private" && chat.type === "private") ||
       (activeTab === "groups" && chat.type === "group") ||
       (activeTab === "channels" && chat.type === "channel"))
    )

  const handleCreateGroup = () => {
    if (groupName.trim() && selectedContacts.length > 0) {
      // Create members array from selected contacts
      const members = selectedContacts.map(contactId => {
        const contact = mockContacts.find(c => c.id === contactId)
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
        createdAt: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        members: members,
      })
      
      setGroupName("")
      setGroupDescription("")
      setSelectedContacts([])
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
        createdAt: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        members: [{
          id: "current-user",
          name: "You",
          username: "@you",
          avatar: "/placeholder.svg?height=40&width=40",
          role: "admin",
          online: true,
        }],
      })
      
      setChannelName("")
      setChannelDescription("")
      setShowNewChannelDialog(false)
    }
  }

  const handleContactSelect = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  const handleChatAction = (chatId: string, action: 'mute' | 'unmute' | 'pin' | 'unpin' | 'delete') => {
    switch (action) {
      case 'mute':
        updateChat(chatId, { muted: true });
        break;
      case 'unmute':
        updateChat(chatId, { muted: false });
        break;
      case 'pin':
        updateChat(chatId, { pinned: true });
        break;
      case 'unpin':
        updateChat(chatId, { pinned: false });
        break;
      case 'delete':
        removeChat(chatId);
        break;
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search chats..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="mt-4 flex justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setShowNewGroupDialog(true)}>
                <Users className="mr-2 h-4 w-4" />
                New Group
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowNewChannelDialog(true)}>
                <Megaphone className="mr-2 h-4 w-4" />
                New Channel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowAddContactDialog(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Contact
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Tabs defaultValue="all" className="flex-1">
        <div className="px-4">
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1" onClick={() => setActiveTab("all")}>
              All
            </TabsTrigger>
            <TabsTrigger value="private" className="flex-1" onClick={() => setActiveTab("private")}>
              Private
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex-1" onClick={() => setActiveTab("groups")}>
              Groups
            </TabsTrigger>
            <TabsTrigger value="channels" className="flex-1" onClick={() => setActiveTab("channels")}>
              Channels
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="all" className="flex-1 overflow-auto p-0">
          <div className="flex flex-col gap-0.5">
            {filteredChats.map((chat) => (
              <div key={chat.id} className="relative group">
                <Button
                  variant="ghost"
                  className={`flex h-auto w-full items-center justify-start gap-3 rounded-none p-3 text-left ${chat.pinned ? 'bg-muted/50' : ''} ${activeChat?.id === chat.id ? 'bg-accent' : ''}`}
                  onClick={() => setActiveChat(chat.id)}
                >
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={chat.avatar} alt={chat.name} />
                      <AvatarFallback>{chat.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    {chat.online && chat.type === "private" && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></span>
                    )}
                    {chat.type === "group" && chat.isAdmin && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-blue-500 border-2 border-background"></span>
                    )}
                    {chat.type === "channel" && chat.isAdmin && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-purple-500 border-2 border-background"></span>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{chat.name}</span>
                        {chat.pinned && <Pin className="h-3 w-3 text-muted-foreground" />}
                        {chat.muted && <BellOff className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      <span className="text-xs text-muted-foreground">{chat.time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground truncate">
                        {chat.lastMessage}
                      </span>
                      {chat.unread > 0 && (
                        <span className={`ml-2 flex h-5 w-5 items-center justify-center rounded-full text-xs ${chat.muted ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'}`}>
                          {chat.unread}
                        </span>
                      )}
                    </div>
                    {(chat.type === "group" || chat.type === "channel") && (
                      <div className="text-xs text-muted-foreground">
                        {chat.type === "group" ? `${chat.memberCount} members` : `${chat.subscriberCount} subscribers`}
                        {chat.isAdmin && " • Admin"}
                      </div>
                    )}
                  </div>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="sr-only">More</span>
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                        <path d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                      </svg>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {chat.muted ? (
                      <DropdownMenuItem onClick={() => handleChatAction(chat.id, 'unmute')}>
                        <Bell className="mr-2 h-4 w-4" />
                        Unmute
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => handleChatAction(chat.id, 'mute')}>
                        <BellOff className="mr-2 h-4 w-4" />
                        Mute
                      </DropdownMenuItem>
                    )}
                    
                    {chat.pinned ? (
                      <DropdownMenuItem onClick={() => handleChatAction(chat.id, 'unpin')}>
                        <PinOff className="mr-2 h-4 w-4" />
                        Unpin
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => handleChatAction(chat.id, 'pin')}>
                        <Pin className="mr-2 h-4 w-4" />
                        Pin
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => handleChatAction(chat.id, 'delete')}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {chat.type === "private" 
                        ? "Delete Chat" 
                        : chat.isAdmin 
                          ? `Delete ${chat.type === "group" ? "Group" : "Channel"}` 
                          : `Leave ${chat.type === "group" ? "Group" : "Channel"}`
                      }
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="private" className="flex-1 overflow-auto p-0">
          <div className="flex flex-col gap-0.5">
            {filteredChats
              .filter(chat => chat.type === "private")
              .map((chat) => (
                <div key={chat.id} className="relative group">
                  <Button
                    variant="ghost"
                    className={`flex h-auto w-full items-center justify-start gap-3 rounded-none p-3 text-left ${chat.pinned ? 'bg-muted/50' : ''} ${activeChat?.id === chat.id ? 'bg-accent' : ''}`}
                    onClick={() => setActiveChat(chat.id)}
                  >
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={chat.avatar} alt={chat.name} />
                        <AvatarFallback>{chat.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      {chat.online && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></span>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{chat.name}</span>
                          {chat.pinned && <Pin className="h-3 w-3 text-muted-foreground" />}
                          {chat.muted && <BellOff className="h-3 w-3 text-muted-foreground" />}
                        </div>
                        <span className="text-xs text-muted-foreground">{chat.time}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground truncate">
                          {chat.lastMessage}
                        </span>
                        {chat.unread > 0 && (
                          <span className={`ml-2 flex h-5 w-5 items-center justify-center rounded-full text-xs ${chat.muted ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'}`}>
                            {chat.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="sr-only">More</span>
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                          <path d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/>
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {chat.muted ? (
                        <DropdownMenuItem onClick={() => handleChatAction(chat.id, 'unmute')}>
                          <Bell className="mr-2 h-4 w-4" />
                          Unmute
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleChatAction(chat.id, 'mute')}>
                          <BellOff className="mr-2 h-4 w-4" />
                          Mute
                        </DropdownMenuItem>
                      )}
                      
                      {chat.pinned ? (
                        <DropdownMenuItem onClick={() => handleChatAction(chat.id, 'unpin')}>
                          <PinOff className="mr-2 h-4 w-4" />
                          Unpin
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleChatAction(chat.id, 'pin')}>
                          <Pin className="mr-2 h-4 w-4" />
                          Pin
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleChatAction(chat.id, 'delete')}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Chat
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
          </div>
        </TabsContent>
        <TabsContent value="groups" className="flex-1 overflow-auto p-0">
          <div className="flex flex-col gap-0.5">
            {filteredChats
              .filter(chat => chat.type === "group")
              .map((chat) => (
                <div key={chat.id} className="relative group">
                  <Button
                    variant="ghost"
                    className={`flex h-auto w-full items-center justify-start gap-3 rounded-none p-3 text-left ${chat.pinned ? 'bg-muted/50' : ''} ${activeChat?.id === chat.id ? 'bg-accent' : ''}`}
                    onClick={() => setActiveChat(chat.id)}
                  >
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={chat.avatar} alt={chat.name} />
                        <AvatarFallback>{chat.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      {chat.isAdmin && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-blue-500 border-2 border-background"></span>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{chat.name}</span>
                          {chat.pinned && <Pin className="h-3 w-3 text-muted-foreground" />}
                          {chat.muted && <BellOff className="h-3 w-3 text-muted-foreground" />}
                        </div>
                        <span className="text-xs text-muted-foreground">{chat.time}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground truncate">
                          {chat.lastMessage}
                        </span>
                        {chat.unread > 0 && (
                          <span className={`ml-2 flex h-5 w-5 items-center justify-center rounded-full text-xs ${chat.muted ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'}`}>
                            {chat.unread}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {chat.memberCount} members
                        {chat.isAdmin && " • Admin"}
                      </div>
                    </div>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="sr-only">More</span>
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                          <path d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {chat.muted ? (
                        <DropdownMenuItem onClick={() => handleChatAction(chat.id, 'unmute')}>
                          <Bell className="mr-2 h-4 w-4" />
                          Unmute
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleChatAction(chat.id, 'mute')}>
                          <BellOff className="mr-2 h-4 w-4" />
                          Mute
                        </DropdownMenuItem>
                      )}
                      
                      {chat.pinned ? (
                        <DropdownMenuItem onClick={() => handleChatAction(chat.id, 'unpin')}>
                          <PinOff className="mr-2 h-4 w-4" />
                          Unpin
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleChatAction(chat.id, 'pin')}>
                          <Pin className="mr-2 h-4 w-4" />
                          Pin
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleChatAction(chat.id, 'delete')}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {chat.isAdmin ? "Delete Group" : "Leave Group"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
          </div>
        </TabsContent>
        <TabsContent value="channels" className="flex-1 overflow-auto p-0">
          <div className="flex flex-col gap-0.5">
            {filteredChats
              .filter(chat => chat.type === "channel")
              .map((chat) => (
                <div key={chat.id} className="relative group">
                  <Button
                    variant="ghost"
                    className={`flex h-auto w-full items-center justify-start gap-3 rounded-none p-3 text-left ${chat.pinned ? 'bg-muted/50' : ''} ${activeChat?.id === chat.id ? 'bg-accent' : ''}`}
                    onClick={() => setActiveChat(chat.id)}
                  >
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={chat.avatar} alt={chat.name} />
                        <AvatarFallback>{chat.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      {chat.isAdmin && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-purple-500 border-2 border-background"></span>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{chat.name}</span>
                          {chat.pinned && <Pin className="h-3 w-3 text-muted-foreground" />}
                          {chat.muted && <BellOff className="h-3 w-3 text-muted-foreground" />}
                        </div>
                        <span className="text-xs text-muted-foreground">{chat.time}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground truncate">
                          {chat.lastMessage}
                        </span>
                        {chat.unread > 0 && (
                          <span className={`ml-2 flex h-5 w-5 items-center justify-center rounded-full text-xs ${chat.muted ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'}`}>
                            {chat.unread}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {chat.subscriberCount} subscribers
                        {chat.isAdmin && " • Admin"}
                      </div>
                    </div>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="sr-only">More</span>
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                          <path d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.\

