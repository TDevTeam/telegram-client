"use client"

import type React from "react"
import { useEffect, useState, useRef, useCallback } from "react"
import { io, type Socket } from "socket.io-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  MessageSquare,
  Send,
  Users,
  Bell,
  Loader2,
  X,
  Menu,
  Moon,
  Sun,
  Clock,
  Lock,
  Forward,
  Reply,
  Edit,
  CheckCheck,
  MoreVertical,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useTheme } from "next-themes"

// Types
interface Account {
  id: string
  displayName: string
  isOnline: boolean
  avatar?: string
  phoneNumber: string
  unreadCount: number
  lastSeen?: Date
}

interface Chat {
  id: string
  title: string
  unreadCount: number
  lastMessage?: Message
  isGroup: boolean
  avatar?: string
  permissions?: ChatPermissions
  cooldown?: number // Cooldown in seconds
  participants?: ChatParticipant[]
}

interface Message {
  id: string
  text: string
  isFromMe: boolean // Note: backend uses isFromMe, not fromMe
  timestamp: number
  media?: string
  sender?: {
    id: string
    name: string
    avatar?: string
  }
  replyTo?: string
  edited?: boolean
  forwarded?: boolean
}

interface ChatPermissions {
  canSendMessages: boolean
  canSendMedia: boolean
  canInviteUsers: boolean
  canPinMessages: boolean
}

interface ChatParticipant {
  id: string
  name: string
  avatar?: string
  role: "admin" | "member" | "creator"
}

interface NavigationTarget {
  accountId: string
  chatId: string
  notificationIndex?: number
}

export default function TelegramManager() {
  // Theme
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()

  // State
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [chats, setChats] = useState<Record<string, Chat[]>>({})
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, Record<string, Message[]>>>({})
  const [messageInput, setMessageInput] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Record<string, Record<string, string[]>>>({})
  const [cooldowns, setCooldowns] = useState<Record<string, Record<string, number>>>({})
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [notifications, setNotifications] = useState<
    {
      accountId: string
      chatId: string
      message: Message
      read: boolean
    }[]
  >([])
  const [loading, setLoading] = useState<{
    accounts: boolean
    chats: boolean
    messages: boolean
  }>({
    accounts: false,
    chats: false,
    messages: false,
  })

  // Navigation target ref for handling notification clicks
  const navigationTargetRef = useRef<NavigationTarget | null>(null)
  const chatsLoadedRef = useRef<boolean>(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Connect to socket
  useEffect(() => {
    console.log("Connecting to socket server...")
    const socketInstance = io("http://localhost:3001", {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
      withCredentials: true,
    })

    socketInstance.on("connect", () => {
      console.log("Connected to server")
      setConnected(true)
      setLoading((prev) => ({ ...prev, accounts: true }))
      socketInstance.emit("getAccounts")
    })

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from server")
      setConnected(false)
    })

    socketInstance.on("accounts", (accountsData: Account[]) => {
      console.log("Received accounts:", accountsData)
      setAccounts(accountsData)
      setLoading((prev) => ({ ...prev, accounts: false }))

      if (accountsData.length > 0 && !selectedAccount) {
        const firstAccountId = accountsData[0].id
        console.log("Selecting first account:", firstAccountId)
        setSelectedAccount(firstAccountId)
        setLoading((prev) => ({ ...prev, chats: true }))
        socketInstance.emit("getChats", firstAccountId)
      }
    })

    socketInstance.on("chats", ({ accountId, chats: chatsData }: { accountId: string; chats: Chat[] | any }) => {
      console.log("Received chats for account:", accountId, chatsData)
      setLoading((prev) => ({ ...prev, chats: false }))
      chatsLoadedRef.current = true

      // Ensure chatsData is an array
      const chatArray = Array.isArray(chatsData) ? chatsData : []

      setChats((prev) => ({ ...prev, [accountId]: chatArray }))

      // Initialize cooldowns for chats
      const newCooldowns: Record<string, number> = {}

      // Safely iterate over chats
      if (Array.isArray(chatArray)) {
        chatArray.forEach((chat) => {
          if (chat && chat.cooldown) {
            newCooldowns[chat.id] = 0
          }
        })
      }

      setCooldowns((prev) => ({
        ...prev,
        [accountId]: {
          ...(prev[accountId] || {}),
          ...newCooldowns,
        },
      }))

      // Check if we have a pending navigation target
      if (navigationTargetRef.current && navigationTargetRef.current.accountId === accountId) {
        console.log("Navigating to target chat after chats loaded:", navigationTargetRef.current)
        const { chatId } = navigationTargetRef.current
        setSelectedChat(chatId)
        setLoading((prev) => ({ ...prev, messages: true }))
        socketInstance.emit("getMessages", accountId, chatId)
        socketInstance.emit("markAsRead", { accountId, chatId })

        // Clear the navigation target
        navigationTargetRef.current = null
      } else if (chatArray.length > 0 && !selectedChat) {
        const firstChatId = chatArray[0].id
        console.log("Selecting first chat:", firstChatId)
        setSelectedChat(firstChatId)
        setLoading((prev) => ({ ...prev, messages: true }))
        socketInstance.emit("getMessages", accountId, firstChatId)
      }
    })

    socketInstance.on(
      "messages",
      ({ accountId, chatId, messages: messagesData }: { accountId: string; chatId: string; messages: Message[] }) => {
        console.log("Received messages for account/chat:", accountId, chatId, messagesData)
        setLoading((prev) => ({ ...prev, messages: false }))

        // Ensure messagesData is an array
        const messageArray = Array.isArray(messagesData) ? messagesData : []

        setMessages((prev) => ({
          ...prev,
          [accountId]: {
            ...(prev[accountId] || {}),
            [chatId]: messageArray,
          },
        }))
        scrollToBottom()
      },
    )

    socketInstance.on(
      "messageSent",
      ({
        accountId,
        chatId,
        success,
        error,
        message,
      }: { accountId: string; chatId: string; success: boolean; error?: string; message?: Message }) => {
        console.log("Message sent status:", success, error, message)
        setSendingMessage(false)

        if (!success && error) {
          toast({
            title: "Error sending message",
            description: error,
            variant: "destructive",
          })
        } else {
          setMessageInput("")
          setReplyingTo(null)

          // If we received a message back from the server, add it to our messages
          if (message) {
            setMessages((prev) => {
              const accountMessages = prev[accountId] || {}
              const chatMessages = accountMessages[chatId] || []

              // Find and remove the optimistic message if it exists
              const filteredMessages = chatMessages.filter(
                (m) => !(m.isFromMe && m.text === message.text && Math.abs(m.timestamp - message.timestamp) < 10000),
              )

              return {
                ...prev,
                [accountId]: {
                  ...accountMessages,
                  [chatId]: [...filteredMessages, message],
                },
              }
            })

            // Update the lastMessage in the chat
            setChats((prev) => {
              const accountChats = prev[accountId] || []
              return {
                ...prev,
                [accountId]: accountChats.map((chat) =>
                  chat.id === chatId ? { ...chat, lastMessage: message } : chat,
                ),
              }
            })
          }

          // If the chat has a cooldown, set it
          const chat = chats[accountId]?.find((c) => c.id === chatId)
          if (chat?.cooldown) {
            setCooldowns((prev) => ({
              ...prev,
              [accountId]: {
                ...(prev[accountId] || {}),
                [chatId]: chat.cooldown || 0,
              },
            }))
          }
        }
      },
    )

    // Handle real-time events
    socketInstance.on(
      "messageReceived",
      ({ accountId, chatId, message }: { accountId: string; chatId: string; message: Message }) => {
        console.log("New message received:", accountId, chatId, message)

        // Update messages if we're currently viewing this chat
        if (selectedAccount === accountId && selectedChat === chatId) {
          setMessages((prev) => {
            const accountMessages = prev[accountId] || {}
            const chatMessages = accountMessages[chatId] || []
            return {
              ...prev,
              [accountId]: {
                ...accountMessages,
                [chatId]: [...chatMessages, message],
              },
            }
          })
          scrollToBottom()

          // Mark as read
          socketInstance.emit("markAsRead", { accountId, chatId })
        }

        // Add to notifications
        setNotifications((prev) => [...prev, { accountId, chatId, message, read: false }])

        // Show toast notification
        toast({
          title: `New message in ${chats[accountId]?.find((c) => c.id === chatId)?.title || "Chat"}`,
          description: message.text.length > 50 ? `${message.text.substring(0, 50)}...` : message.text,
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigateToChat(accountId, chatId)
              }}
            >
              View
            </Button>
          ),
        })

        // Update chat unread count and lastMessage
        setChats((prev) => {
          const accountChats = prev[accountId] || []
          return {
            ...prev,
            [accountId]: accountChats.map((chat) =>
              chat.id === chatId
                ? {
                    ...chat,
                    unreadCount: (chat.unreadCount || 0) + 1,
                    lastMessage: message,
                  }
                : chat,
            ),
          }
        })

        // Update account unread count
        setAccounts((prev) =>
          prev.map((account) =>
            account.id === accountId ? { ...account, unreadCount: (account.unreadCount || 0) + 1 } : account,
          ),
        )
      },
    )

    socketInstance.on(
      "typingStatus",
      ({ accountId, chatId, users }: { accountId: string; chatId: string; users: string[] }) => {
        console.log("Typing status update:", accountId, chatId, users)

        setTypingUsers((prev) => ({
          ...prev,
          [accountId]: {
            ...(prev[accountId] || {}),
            [chatId]: users || [],
          },
        }))
      },
    )

    socketInstance.on(
      "unreadCountUpdated",
      ({ accountId, chatId, unreadCount }: { accountId: string; chatId: string; unreadCount: number }) => {
        console.log("Unread count updated:", accountId, chatId, unreadCount)

        setChats((prev) => {
          const accountChats = prev[accountId] || []
          return {
            ...prev,
            [accountId]: accountChats.map((chat) => (chat.id === chatId ? { ...chat, unreadCount } : chat)),
          }
        })

        // Update account total unread count
        updateAccountUnreadCount(accountId)
      },
    )

    socketInstance.on(
      "markedAsRead",
      ({ accountId, chatId, success }: { accountId: string; chatId: string; success: boolean }) => {
        if (success) {
          // Update chat unread count
          setChats((prev) => {
            const accountChats = prev[accountId] || []
            return {
              ...prev,
              [accountId]: accountChats.map((chat) => (chat.id === chatId ? { ...chat, unreadCount: 0 } : chat)),
            }
          })

          // Update account total unread count
          updateAccountUnreadCount(accountId)
        }
      },
    )

    socketInstance.on("error", ({ type, message }: { type: string; message: string }) => {
      console.error(`Error (${type}):`, message)
      toast({
        title: `Error: ${type}`,
        description: message,
        variant: "destructive",
      })

      // Reset loading states
      setLoading({
        accounts: false,
        chats: false,
        messages: false,
      })
    })

    // Debug all incoming events
    socketInstance.onAny((event, ...args) => {
      console.log(`Received event: ${event}`, args)
    })

    setSocket(socketInstance)

    return () => {
      console.log("Disconnecting socket...")
      socketInstance.disconnect()
    }
  }, [])

  // Navigation function
  const navigateToChat = useCallback(
    (accountId: string, chatId: string, notificationIndex?: number) => {
      console.log("Navigating to chat:", accountId, chatId)

      // Close mobile menu
      setMobileMenuOpen(false)

      // Mark notification as read if provided
      if (notificationIndex !== undefined) {
        setNotifications((prev) => prev.map((n, i) => (i === notificationIndex ? { ...n, read: true } : n)))
      }

      // If we're already on the right account, just select the chat
      if (selectedAccount === accountId) {
        setSelectedChat(chatId)
        setLoading((prev) => ({ ...prev, messages: true }))
        socket?.emit("getMessages", accountId, chatId)
        socket?.emit("markAsRead", { accountId, chatId })
      } else {
        // We need to change account first, then select the chat after chats are loaded
        navigationTargetRef.current = { accountId, chatId, notificationIndex }
        setSelectedAccount(accountId)
        setLoading((prev) => ({ ...prev, chats: true }))
        socket?.emit("getChats", accountId)
      }
    },
    [selectedAccount, socket],
  )

  // Update account unread count based on chats
  const updateAccountUnreadCount = useCallback(
    (accountId: string) => {
      setAccounts((prev) =>
        prev.map((account) => {
          if (account.id === accountId) {
            const accountChats = chats[accountId] || []
            const totalUnread = accountChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0)
            return { ...account, unreadCount: totalUnread }
          }
          return account
        }),
      )
    },
    [chats],
  )

  // Handle cooldown timers
  useEffect(() => {
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current)
    }

    cooldownIntervalRef.current = setInterval(() => {
      setCooldowns((prev) => {
        const updated = { ...prev }
        let hasChanges = false

        Object.keys(updated).forEach((accountId) => {
          Object.keys(updated[accountId] || {}).forEach((chatId) => {
            if (updated[accountId][chatId] > 0) {
              updated[accountId][chatId] -= 1
              hasChanges = true
            }
          })
        })

        return hasChanges ? updated : prev
      })
    }, 1000)

    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current)
      }
    }
  }, [])

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, selectedAccount, selectedChat, scrollToBottom])

  // Handle account selection
  const handleAccountSelect = useCallback(
    (accountId: string) => {
      console.log("Selecting account:", accountId)
      setSelectedAccount(accountId)
      setSelectedChat(null)
      setMobileMenuOpen(false)
      setLoading((prev) => ({ ...prev, chats: true }))
      chatsLoadedRef.current = false
      if (socket) {
        socket.emit("getChats", accountId)
      }
    },
    [socket],
  )

  // Handle chat selection
  const handleChatSelect = useCallback(
    (chatId: string) => {
      console.log("Selecting chat:", chatId)
      if (selectedAccount && socket) {
        setSelectedChat(chatId)
        setMobileMenuOpen(false)
        setLoading((prev) => ({ ...prev, messages: true }))
        socket.emit("getMessages", selectedAccount, chatId)
        socket.emit("markAsRead", { accountId: selectedAccount, chatId })

        // Mark notifications as read
        setNotifications((prev) =>
          prev.map((n) => (n.accountId === selectedAccount && n.chatId === chatId ? { ...n, read: true } : n)),
        )
      }
    },
    [selectedAccount, socket],
  )

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (selectedAccount && selectedChat && socket) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      socket.emit("setTyping", {
        accountId: selectedAccount,
        chatId: selectedChat,
        isTyping: true,
      })

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("setTyping", {
          accountId: selectedAccount,
          chatId: selectedChat,
          isTyping: false,
        })
      }, 3000)
    }
  }, [selectedAccount, selectedChat, socket])

  // Send message
  const handleSendMessage = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (messageInput.trim() && selectedAccount && selectedChat && socket) {
        // Check if we can send messages
        const chat = chats[selectedAccount]?.find((c) => c.id === selectedChat)

        // Check permissions
        if (chat?.permissions && !chat.permissions.canSendMessages) {
          toast({
            title: "Cannot send message",
            description: "You don't have permission to send messages in this chat",
            variant: "destructive",
          })
          return
        }

        // Check cooldown
        if (cooldowns[selectedAccount]?.[selectedChat] > 0) {
          toast({
            title: "Cooldown active",
            description: `You can send another message in ${cooldowns[selectedAccount][selectedChat]} seconds`,
            variant: "destructive",
          })
          return
        }

        console.log("Sending message:", messageInput)
        setSendingMessage(true)

        const messageData: any = {
          accountId: selectedAccount,
          chatId: selectedChat,
          message: messageInput.trim(),
        }

        // Add reply info if replying
        if (replyingTo) {
          messageData.replyToId = replyingTo.id
        }

        socket.emit("sendMessage", messageData)

        // Add the message to the UI directly (optimistic update)
        const newMessage: Message = {
          id: `temp-${Date.now()}`,
          text: messageInput.trim(),
          timestamp: Date.now(),
          isFromMe: true,
          replyTo: replyingTo?.id,
        }

        setMessages((prev) => {
          const accountMessages = prev[selectedAccount] || {}
          const chatMessages = accountMessages[selectedChat] || []
          return {
            ...prev,
            [selectedAccount]: {
              ...accountMessages,
              [selectedChat]: [...chatMessages, newMessage],
            },
          }
        })
        scrollToBottom()
      }
    },
    [messageInput, selectedAccount, selectedChat, socket, chats, cooldowns, replyingTo, toast, scrollToBottom],
  )

  // Format timestamp
  const formatTime = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }, [])

  // Format date
  const formatDate = useCallback((timestamp: number) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    }
  }, [])

  // Get initials for avatar
  const getInitials = useCallback((name: string) => {
    if (!name) return "??"
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }, [])

  // Find message by ID
  const findMessageById = useCallback(
    (accountId: string, chatId: string, messageId: string): Message | undefined => {
      return messages[accountId]?.[chatId]?.find((msg) => msg.id === messageId)
    },
    [messages],
  )

  // Get total unread count for an account
  const getAccountUnreadCount = useCallback(
    (accountId: string) => {
      const accountChats = chats[accountId] || []
      if (!Array.isArray(accountChats)) {
        console.error("Expected chats[accountId] to be an array but got:", typeof accountChats)
        return 0
      }
      return accountChats.reduce((total, chat) => total + (chat.unreadCount || 0), 0)
    },
    [chats],
  )

  // Group messages by date
  const groupMessagesByDate = useCallback(
    (messages: Message[]) => {
      if (!Array.isArray(messages)) return []

      const groups: { [date: string]: Message[] } = {}

      messages.forEach((message) => {
        const dateStr = formatDate(message.timestamp)
        if (!groups[dateStr]) {
          groups[dateStr] = []
        }
        groups[dateStr].push(message)
      })

      return Object.entries(groups)
    },
    [formatDate],
  )

  // Check if user can send messages
  const canSendMessages = useCallback(() => {
    if (!selectedAccount || !selectedChat) return false

    const chat = chats[selectedAccount]?.find((c) => c.id === selectedChat)
    if (!chat) return false

    // Check permissions
    if (chat.permissions && !chat.permissions.canSendMessages) return false

    // Check cooldown
    if (cooldowns[selectedAccount]?.[selectedChat] > 0) return false

    return true
  }, [selectedAccount, selectedChat, chats, cooldowns])

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="bg-background border-b border-border py-3 px-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px]">
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-border flex justify-between items-center">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5" /> Accounts
                  </h2>
                </div>
                <ScrollArea className="flex-1">
                  {loading.accounts ? (
                    <div className="p-4 flex flex-col gap-4">
                      <div className="h-12 bg-muted animate-pulse rounded-md"></div>
                      <div className="h-12 bg-muted animate-pulse rounded-md"></div>
                      <div className="h-12 bg-muted animate-pulse rounded-md"></div>
                    </div>
                  ) : accounts.length > 0 ? (
                    <div className="p-2">
                      {accounts.map((account) => (
                        <div key={account.id} className="relative group">
                          <Button
                            variant={selectedAccount === account.id ? "default" : "ghost"}
                            className="w-full justify-start mb-1 text-left pr-10"
                            onClick={() => handleAccountSelect(account.id)}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <Avatar className="h-8 w-8">
                                {account.avatar ? (
                                  <AvatarImage src={account.avatar} alt={account.displayName} />
                                ) : (
                                  <AvatarFallback>{getInitials(account.displayName)}</AvatarFallback>
                                )}
                              </Avatar>
                              <div className="truncate flex-1">
                                <div className="flex items-center justify-between">
                                  <span>{account.displayName}</span>
                                  {account.unreadCount > 0 && (
                                    <Badge variant="destructive" className="ml-2">
                                      {account.unreadCount}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <span>+{account.phoneNumber}</span>
                                  <div
                                    className={`h-2 w-2 rounded-full ${account.isOnline ? "bg-green-500" : "bg-gray-400"}`}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      {connected ? "No accounts found" : "Connecting..."}
                    </div>
                  )}
                </ScrollArea>

                {selectedAccount && (
                  <>
                    <Separator />
                    <div className="p-4 border-b border-border">
                      <h2 className="text-lg font-semibold">Chats</h2>
                    </div>
                    <ScrollArea className="flex-1">
                      {loading.chats ? (
                        <div className="p-4 flex flex-col gap-4">
                          <div className="h-16 bg-muted animate-pulse rounded-md"></div>
                          <div className="h-16 bg-muted animate-pulse rounded-md"></div>
                          <div className="h-16 bg-muted animate-pulse rounded-md"></div>
                        </div>
                      ) : chats[selectedAccount]?.length > 0 ? (
                        <div className="p-2">
                          {chats[selectedAccount].map((chat) => (
                            <Button
                              key={chat.id}
                              variant={selectedChat === chat.id ? "default" : "ghost"}
                              className="w-full justify-start mb-1 text-left h-auto py-3"
                              onClick={() => handleChatSelect(chat.id)}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <Avatar className="h-8 w-8">
                                  {chat.avatar ? (
                                    <AvatarImage src={chat.avatar} alt={chat.title} />
                                  ) : (
                                    <AvatarFallback>{getInitials(chat.title)}</AvatarFallback>
                                  )}
                                </Avatar>
                                <div className="flex flex-col items-start flex-1">
                                  <div className="flex justify-between w-full">
                                    <span className="font-medium truncate flex items-center gap-1">
                                      {chat.title}
                                      {chat.isGroup && <Users className="h-3 w-3" />}
                                    </span>
                                    {chat.unreadCount > 0 && (
                                      <Badge variant="destructive" className="ml-2">
                                        {chat.unreadCount}
                                      </Badge>
                                    )}
                                  </div>
                                  {chat.lastMessage && (
                                    <div className="text-xs text-muted-foreground mt-1 truncate w-full">
                                      {chat.lastMessage.text}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-muted-foreground">
                          {connected ? "No chats found" : "Loading chats..."}
                        </div>
                      )}
                    </ScrollArea>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" /> Telegram Manager
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Notification indicator */}
          {notifications.filter((n) => !n.read).length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0"
                  >
                    {notifications.filter((n) => !n.read).length}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="p-2 font-semibold border-b">Notifications</div>
                <ScrollArea className="h-80">
                  {notifications
                    .filter((n) => !n.read)
                    .map((notification, index) => {
                      const chat = chats[notification.accountId]?.find((c) => c.id === notification.chatId)
                      const account = accounts.find((a) => a.id === notification.accountId)

                      return (
                        <div
                          key={index}
                          className="p-2 border-b cursor-pointer hover:bg-accent"
                          onClick={() => {
                            navigateToChat(notification.accountId, notification.chatId, index)
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              {chat?.avatar ? (
                                <AvatarImage src={chat.avatar} alt={chat.title} />
                              ) : (
                                <AvatarFallback>{chat ? getInitials(chat.title) : "?"}</AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <div className="font-medium">{chat?.title || "Unknown chat"}</div>
                              <div className="text-xs text-muted-foreground">
                                {account?.displayName || "Unknown account"}
                              </div>
                            </div>
                          </div>
                          <div className="mt-1 text-sm">{notification.message.text}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatTime(notification.message.timestamp)}
                          </div>
                        </div>
                      )
                    })}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <div className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}></div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar - Accounts */}
        <div className="w-64 border-r border-border hidden md:flex flex-col">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" /> Accounts
            </h2>
          </div>
          <ScrollArea className="flex-1">
            {loading.accounts ? (
              <div className="p-4 flex flex-col gap-4">
                <div className="h-12 bg-muted animate-pulse rounded-md"></div>
                <div className="h-12 bg-muted animate-pulse rounded-md"></div>
                <div className="h-12 bg-muted animate-pulse rounded-md"></div>
              </div>
            ) : accounts.length > 0 ? (
              <div className="p-2">
                {accounts.map((account) => (
                  <div key={account.id} className="relative group">
                    <Button
                      variant={selectedAccount === account.id ? "default" : "ghost"}
                      className="w-full justify-start mb-1 text-left pr-10"
                      onClick={() => handleAccountSelect(account.id)}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Avatar className="h-8 w-8">
                          {account.avatar ? (
                            <AvatarImage src={account.avatar} alt={account.displayName} />
                          ) : (
                            <AvatarFallback>{getInitials(account.displayName)}</AvatarFallback>
                          )}
                        </Avatar>
                        <div className="truncate flex-1">
                          <div className="flex items-center justify-between">
                            <span>{account.displayName}</span>
                            {account.unreadCount > 0 && (
                              <Badge variant="destructive" className="ml-2">
                                {account.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <span>+{account.phoneNumber}</span>
                            <div
                              className={`h-2 w-2 rounded-full ${account.isOnline ? "bg-green-500" : "bg-gray-400"}`}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                {connected ? "No accounts found" : "Connecting..."}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Sidebar - Chats */}
        {selectedAccount && (
          <div className="w-72 border-r border-border hidden md:flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-semibold">Chats</h2>
            </div>
            <ScrollArea className="flex-1">
              {loading.chats ? (
                <div className="p-4 flex flex-col gap-4">
                  <div className="h-16 bg-muted animate-pulse rounded-md"></div>
                  <div className="h-16 bg-muted animate-pulse rounded-md"></div>
                  <div className="h-16 bg-muted animate-pulse rounded-md"></div>
                </div>
              ) : chats[selectedAccount]?.length > 0 ? (
                <div className="p-2">
                  {chats[selectedAccount].map((chat) => (
                    <Button
                      key={chat.id}
                      variant={selectedChat === chat.id ? "default" : "ghost"}
                      className="w-full justify-start mb-1 text-left h-auto py-3"
                      onClick={() => handleChatSelect(chat.id)}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Avatar className="h-8 w-8">
                          {chat.avatar ? (
                            <AvatarImage src={chat.avatar} alt={chat.title} />
                          ) : (
                            <AvatarFallback>{getInitials(chat.title)}</AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex flex-col items-start flex-1">
                          <div className="flex justify-between w-full">
                            <span className="font-medium truncate flex items-center gap-1">
                              {chat.title}
                              {chat.isGroup && <Users className="h-3 w-3" />}
                            </span>
                            {chat.unreadCount > 0 && (
                              <Badge variant="destructive" className="ml-2">
                                {chat.unreadCount}
                              </Badge>
                            )}
                          </div>
                          {chat.lastMessage && (
                            <div className="text-xs text-muted-foreground mt-1 truncate w-full">
                              {chat.lastMessage.text}
                            </div>
                          )}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  {connected ? "No chats found" : "Loading chats..."}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Main content - Messages */}
        <div className="flex-1 flex flex-col">
          {selectedAccount && selectedChat ? (
            <>
              <div className="p-3 border-b border-border flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    {chats[selectedAccount]?.find((c) => c.id === selectedChat)?.avatar ? (
                      <AvatarImage
                        src={chats[selectedAccount]?.find((c) => c.id === selectedChat)?.avatar || ""}
                        alt={chats[selectedAccount]?.find((c) => c.id === selectedChat)?.title || "Chat"}
                      />
                    ) : (
                      <AvatarFallback>
                        {getInitials(chats[selectedAccount]?.find((c) => c.id === selectedChat)?.title || "Chat")}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <h2 className="font-semibold truncate">
                      {chats[selectedAccount]?.find((c) => c.id === selectedChat)?.title || "Chat"}
                    </h2>

                    {/* Typing indicator */}
                    {typingUsers[selectedAccount]?.[selectedChat]?.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {typingUsers[selectedAccount][selectedChat].length === 1
                          ? `${typingUsers[selectedAccount][selectedChat][0]} is typing...`
                          : `${typingUsers[selectedAccount][selectedChat].length} people are typing...`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Chat info and permissions */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2">
                        {cooldowns[selectedAccount]?.[selectedChat] > 0 && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            {cooldowns[selectedAccount][selectedChat]}s
                          </div>
                        )}

                        {chats[selectedAccount]?.find((c) => c.id === selectedChat)?.permissions?.canSendMessages ===
                          false && <Lock className="h-4 w-4 text-muted-foreground" />}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                socket?.emit("markAsRead", { accountId: selectedAccount, chatId: selectedChat })
                              }
                            >
                              Mark as Read
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {cooldowns[selectedAccount]?.[selectedChat] > 0
                        ? `Cooldown: ${cooldowns[selectedAccount][selectedChat]} seconds remaining`
                        : chats[selectedAccount]?.find((c) => c.id === selectedChat)?.permissions?.canSendMessages ===
                            false
                          ? "You cannot send messages in this chat"
                          : "Chat info"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <ScrollArea className="flex-1 p-4">
                {loading.messages ? (
                  <div className="flex flex-col gap-4">
                    <div className="h-20 bg-muted animate-pulse rounded-md"></div>
                    <div className="h-20 bg-muted animate-pulse rounded-md self-end"></div>
                    <div className="h-20 bg-muted animate-pulse rounded-md"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages[selectedAccount]?.[selectedChat]?.length > 0 ? (
                      groupMessagesByDate(messages[selectedAccount][selectedChat]).map(([date, dateMessages]) => (
                        <div key={date} className="space-y-3">
                          <div className="text-center">
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md">{date}</span>
                          </div>

                          {dateMessages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${message.isFromMe ? "justify-end" : "justify-start"}`}
                            >
                              <div className="relative group max-w-[70%]">
                                {!message.isFromMe && message.sender && (
                                  <div className="flex items-center mb-1">
                                    <Avatar className="h-6 w-6 mr-1">
                                      {message.sender.avatar ? (
                                        <AvatarImage src={message.sender.avatar} alt={message.sender.name} />
                                      ) : (
                                        <AvatarFallback>{getInitials(message.sender.name)}</AvatarFallback>
                                      )}
                                    </Avatar>
                                    <span className="text-xs font-medium">{message.sender.name}</span>
                                  </div>
                                )}

                                {/* Reply reference */}
                                {message.replyTo && (
                                  <div
                                    className={`text-xs p-2 rounded-t-lg border-l-2 ${
                                      message.isFromMe
                                        ? "bg-primary/20 border-primary-foreground"
                                        : "bg-card/50 border-card-foreground/30"
                                    }`}
                                  >
                                    <div className="font-medium">
                                      {findMessageById(selectedAccount, selectedChat, message.replyTo)?.sender?.name ||
                                        "Reply to"}
                                    </div>
                                    <div className="truncate">
                                      {findMessageById(selectedAccount, selectedChat, message.replyTo)?.text ||
                                        "Message"}
                                    </div>
                                  </div>
                                )}

                                <div
                                  className={`p-3 rounded-lg ${message.replyTo ? "rounded-t-none" : ""} ${
                                    message.isFromMe
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-card text-card-foreground border border-border"
                                  }`}
                                >
                                  {/* Message media */}
                                  {message.media && (
                                    <div className="mb-2">
                                      <img
                                        src={message.media || "/placeholder.svg"}
                                        alt="Media"
                                        className="rounded-md max-w-full max-h-60 object-contain"
                                      />
                                    </div>
                                  )}

                                  {/* Message text */}
                                  <div>{message.text || ""}</div>

                                  {/* Message metadata */}
                                  <div className="text-xs mt-1 flex justify-end items-center gap-1">
                                    {message.edited && <Edit className="h-3 w-3" />}
                                    {message.forwarded && <Forward className="h-3 w-3" />}
                                    {formatTime(message.timestamp)}
                                    {message.isFromMe &&
                                      (message.id.startsWith("temp-") ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <CheckCheck className="h-3 w-3" />
                                      ))}
                                  </div>
                                </div>

                                {/* Message actions */}
                                <div
                                  className={`absolute top-0 ${message.isFromMe ? "left-0 -translate-x-full" : "right-0 translate-x-full"} opacity-0 group-hover:opacity-100 transition-opacity`}
                                >
                                  <div className="flex flex-col gap-1 p-1 bg-background border border-border rounded-md shadow-sm">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => setReplyingTo(message)}
                                    >
                                      <Reply className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-8">No messages yet</div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Reply indicator */}
              {replyingTo && (
                <div className="p-2 border-t border-border bg-muted/30 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Reply className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Replying to {replyingTo.sender?.name || (replyingTo.isFromMe ? "yourself" : "message")}
                      </div>
                      <div className="text-sm truncate max-w-[200px] md:max-w-[400px]">{replyingTo.text}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setReplyingTo(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="p-3 border-t border-border">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value)
                      handleTyping()
                    }}
                    placeholder={
                      !canSendMessages()
                        ? cooldowns[selectedAccount]?.[selectedChat] > 0
                          ? `Cooldown: ${cooldowns[selectedAccount][selectedChat]}s remaining`
                          : "You cannot send messages in this chat"
                        : "Type a message..."
                    }
                    disabled={sendingMessage || !canSendMessages()}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={sendingMessage || !messageInput.trim() || !canSendMessages()}
                  >
                    {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              {selectedAccount
                ? "Select a chat to start messaging"
                : accounts.length > 0
                  ? "Select an account"
                  : "No accounts available"}
            </div>
          )}
        </div>
      </main>

      <Toaster />
    </div>
  )
}

