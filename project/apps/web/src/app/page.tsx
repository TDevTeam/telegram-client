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
  Image,
  Mic,
  File,
  Volume2,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useTheme } from "next-themes"
import { TypingIndicator } from "@/components/typing-indicator"
import type { Account, Chat, Message, NavigationTarget, NotificationSettings } from "@/types/telegram"

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
  const [hasMoreMessages, setHasMoreMessages] = useState<Record<string, Record<string, boolean>>>({})
  const [nextCursor, setNextCursor] = useState<Record<string, Record<string, string | undefined>>>({})

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
        const readyAccount = accountsData.find((acc) => acc.setupStatus === "ready")
        if (readyAccount) {
          const firstAccountId = readyAccount.id
          console.log("Selecting first ready account:", firstAccountId)
          setSelectedAccount(firstAccountId)
          setLoading((prev) => ({ ...prev, chats: true }))
          socketInstance.emit("getChats", firstAccountId)
        }
      }
    })

    socketInstance.on(
      "chats",
      ({
        accountId,
        items,
        hasMore,
        nextCursor,
      }: { accountId: string; items: Chat[]; hasMore: boolean; nextCursor?: string }) => {
        console.log("Received chats for account:", accountId, items, hasMore, nextCursor)
        setLoading((prev) => ({ ...prev, chats: false }))
        chatsLoadedRef.current = true

        // Ensure items is an array
        const chatArray = Array.isArray(items) ? items : []

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
      },
    )

    socketInstance.on(
      "messages",
      ({
        accountId,
        chatId,
        items,
        hasMore,
        nextCursor,
      }: { accountId: string; chatId: string; items: Message[]; hasMore: boolean; nextCursor?: string }) => {
        console.log("Received messages for account/chat:", accountId, chatId, items, hasMore, nextCursor)
        setLoading((prev) => ({ ...prev, messages: false }))

        // Ensure items is an array
        const messageArray = Array.isArray(items) ? items : []

        setMessages((prev) => ({
          ...prev,
          [accountId]: {
            ...(prev[accountId] || {}),
            [chatId]: messageArray,
          },
        }))

        // Store pagination info
        setHasMoreMessages((prev) => ({
          ...prev,
          [accountId]: {
            ...(prev[accountId] || {}),
            [chatId]: hasMore,
          },
        }))

        setNextCursor((prev) => ({
          ...prev,
          [accountId]: {
            ...(prev[accountId] || {}),
            [chatId]: nextCursor,
          },
        }))

        scrollToBottom()
      },
    )

    // Replace the existing "messageReceived" event handler with this improved version:
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
        } else {
          // Add to notifications
          setNotifications((prev) => [...prev, { accountId, chatId, message, read: false }])

          // Get account and chat info for the notification
          const account = accounts.find((a) => a.id === accountId)
          const chat = chats[accountId]?.find((c) => c.id === chatId)

          // Show toast notification
          toast({
            title: (
              <div className="flex items-center gap-2">
                <span className="bg-primary account-badge text-white">
                  {account?.displayName.split(" ")[0] || "Account"}
                </span>
                <span>{chat?.title || "New message"}</span>
              </div>
            ),
            description: message.text?.length > 50 ? `${message.text.substring(0, 50)}...` : message.text,
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
        }

        // Always update the chat's lastMessage property and move the chat to the top of the list
        setChats((prev) => {
          const accountChats = prev[accountId] || []

          // Find the chat that received the message
          const updatedChat = accountChats.find((c) => c.id === chatId)
          if (!updatedChat) return prev // Chat not found

          // Create updated chat with new lastMessage and incremented unread count
          // (only increment unread if we're not currently viewing this chat)
          const chatWithUpdatedMessage = {
            ...updatedChat,
            lastMessage: message,
            unreadCount:
              selectedAccount === accountId && selectedChat === chatId
                ? updatedChat.unreadCount || 0
                : (updatedChat.unreadCount || 0) + 1,
          }

          // Remove the chat from its current position
          const filteredChats = accountChats.filter((c) => c.id !== chatId)

          // Return updated chats with the updated chat at the beginning (top)
          return {
            ...prev,
            [accountId]: [chatWithUpdatedMessage, ...filteredChats],
          }
        })

        // Update account unread count if we're not currently viewing this chat
        if (!(selectedAccount === accountId && selectedChat === chatId)) {
          setAccounts((prev) =>
            prev.map((account) =>
              account.id === accountId ? { ...account, unreadCount: (account.unreadCount || 0) + 1 } : account,
            ),
          )
        }
      },
    )

    // Also update the messageSent handler to ensure proper chat ordering
    // Find the "messageSent" event handler and enhance it:

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

            // Update the lastMessage in the chat and move the chat to the top of the list
            setChats((prev) => {
              const accountChats = prev[accountId] || []

              // Find the chat that received the message
              const updatedChat = accountChats.find((c) => c.id === chatId)
              if (!updatedChat) return prev // Chat not found

              // Create updated chat with new lastMessage
              const chatWithUpdatedMessage = {
                ...updatedChat,
                lastMessage: message,
              }

              // Remove the chat from its current position
              const filteredChats = accountChats.filter((c) => c.id !== chatId)

              // Return updated chats with the updated chat at the beginning (top)
              return {
                ...prev,
                [accountId]: [chatWithUpdatedMessage, ...filteredChats],
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

    socketInstance.on(
      "setupStatus",
      ({
        accountId,
        status,
        error,
      }: { accountId: string; status: "initializing" | "connecting" | "ready" | "error"; error?: string }) => {
        console.log("Account setup status update:", accountId, status, error)

        setAccounts((prev) =>
          prev.map((account) =>
            account.id === accountId ? { ...account, setupStatus: status, setupError: error } : account,
          ),
        )
      },
    )

    socketInstance.on(
      "notificationSettings",
      ({
        accountId,
        chatId,
        settings,
        success,
      }: { accountId: string; chatId: string; settings: NotificationSettings; success: boolean }) => {
        if (success) {
          setChats((prev) => {
            const accountChats = prev[accountId] || []
            return {
              ...prev,
              [accountId]: accountChats.map((chat) =>
                chat.id === chatId ? { ...chat, notificationSettings: settings } : chat,
              ),
            }
          })
        }
      },
    )

    socketInstance.on(
      "mediaLoaded",
      ({
        accountId,
        chatId,
        messageId,
        mediaKey,
        success,
        error,
      }: {
        accountId: string
        chatId: string
        messageId: string
        mediaKey?: string
        success: boolean
        error?: string
      }) => {
        if (success && mediaKey) {
          // Update the message with the loaded media URL
          setMessages((prev) => {
            const accountMessages = prev[accountId] || {}
            const chatMessages = accountMessages[chatId] || []

            return {
              ...prev,
              [accountId]: {
                ...accountMessages,
                [chatId]: chatMessages.map((msg) =>
                  msg.id === messageId && msg.media
                    ? { ...msg, media: { ...msg.media, url: `/api/media/${mediaKey}` } }
                    : msg,
                ),
              },
            }
          })
        } else if (error) {
          toast({
            title: "Error loading media",
            description: error,
            variant: "destructive",
          })
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

  // Load more messages
  const loadMoreMessages = useCallback(() => {
    if (selectedAccount && selectedChat && socket && hasMoreMessages[selectedAccount]?.[selectedChat]) {
      const cursor = nextCursor[selectedAccount]?.[selectedChat]
      socket.emit("getMessages", selectedAccount, selectedChat, 20, cursor)
    }
  }, [selectedAccount, selectedChat, socket, hasMoreMessages, nextCursor])

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

  // Render media icon based on type
  const renderMediaIcon = useCallback((type: string) => {
    switch (type) {
      case "photo":
        return <Image className="h-4 w-4" />
      case "video":
        return <Image className="h-4 w-4" />
      case "voice":
        return <Mic className="h-4 w-4" />
      case "audio":
        return <Volume2 className="h-4 w-4" />
      case "document":
      default:
        return <File className="h-4 w-4" />
    }
  }, [])

  // Handle media load
  const handleLoadMedia = useCallback(
    (accountId: string, chatId: string, messageId: string, mediaType: string) => {
      if (socket) {
        socket.emit("loadMedia", {
          accountId,
          chatId,
          messageId,
          type: mediaType,
        })
      }
    },
    [socket],
  )

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="bg-background border-b border-border py-3 px-6 flex justify-between items-center sticky top-0 z-10">
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
                            disabled={account.setupStatus !== "ready"}
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
                                  {account.setupStatus !== "ready" && (
                                    <span className="ml-1">({account.setupStatus})</span>
                                  )}
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
                          {/* Update the chat list items in the sidebar */}
                          {chats[selectedAccount].map((chat) => (
                            <div
                              key={chat.id}
                              className={`chat-list-item ${selectedChat === chat.id ? "active" : ""}`}
                              onClick={() => handleChatSelect(chat.id)}
                            >
                              <Avatar className="h-10 w-10 flex-shrink-0">
                                {chat.avatar ? (
                                  <AvatarImage src={chat.avatar} alt={chat.title} />
                                ) : (
                                  <AvatarFallback>{getInitials(chat.title)}</AvatarFallback>
                                )}
                              </Avatar>
                              <div className="flex flex-col flex-1 min-w-0">
                                <div className="flex justify-between items-center w-full">
                                  <span className="font-medium truncate flex items-center gap-1">
                                    {chat.title}
                                    {(chat.isGroup || chat.isSupergroup) && <Users className="h-3 w-3 ml-1" />}
                                  </span>
                                  {chat.unreadCount > 0 && (
                                    <span className="unread-badge ml-2">{chat.unreadCount}</span>
                                  )}
                                </div>
                                {chat.lastMessage && (
                                  <div className="text-xs text-muted-foreground mt-1 truncate w-full flex items-center gap-1">
                                    {chat.lastMessage.media && renderMediaIcon(chat.lastMessage.media.type)}
                                    {chat.lastMessage.text ||
                                      (chat.lastMessage.media ? `[${chat.lastMessage.media.type}]` : "")}
                                  </div>
                                )}
                              </div>
                            </div>
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
            <MessageSquare className="h-6 w-6 text-primary" /> Telegram Manager
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Notification indicator */}
          {notifications.filter((n) => !n.read).length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {/* Update the notification badge in the header */}
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 flex items-center justify-center p-0 min-w-5 h-5 text-xs"
                  >
                    {notifications.filter((n) => !n.read).length}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="p-3 font-semibold border-b flex items-center justify-between">
                  <span>Notifications</span>
                  <Badge variant="outline" className="font-normal">
                    {notifications.filter((n) => !n.read).length} unread
                  </Badge>
                </div>
                <ScrollArea className="h-80">
                  {notifications
                    .filter((n) => !n.read)
                    .map((notification, index) => {
                      const chat = chats[notification.accountId]?.find((c) => c.id === notification.chatId)
                      const account = accounts.find((a) => a.id === notification.accountId)

                      return (
                        <div
                          key={index}
                          className="p-3 border-b cursor-pointer hover:bg-accent transition-colors"
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
                          <div className="mt-1 text-sm">
                            {notification.message.media && renderMediaIcon(notification.message.media.type)}
                            {notification.message.text ||
                              (notification.message.media ? `[${notification.message.media.type}]` : "")}
                          </div>
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

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="transition-colors"
                >
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

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
                      disabled={account.setupStatus !== "ready"}
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
                            {account.setupStatus !== "ready" && <span className="ml-1">({account.setupStatus})</span>}
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
                  {/* Update the chat list items in the sidebar */}
                  {chats[selectedAccount].map((chat) => (
                    <div
                      key={chat.id}
                      className={`chat-list-item ${selectedChat === chat.id ? "active" : ""}`}
                      onClick={() => handleChatSelect(chat.id)}
                    >
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        {chat.avatar ? (
                          <AvatarImage src={chat.avatar} alt={chat.title} />
                        ) : (
                          <AvatarFallback>{getInitials(chat.title)}</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex justify-between items-center w-full">
                          <span className="font-medium truncate flex items-center gap-1">
                            {chat.title}
                            {(chat.isGroup || chat.isSupergroup) && <Users className="h-3 w-3 ml-1" />}
                          </span>
                          {chat.unreadCount > 0 && <span className="unread-badge ml-2">{chat.unreadCount}</span>}
                        </div>
                        {chat.lastMessage && (
                          <div className="text-xs text-muted-foreground mt-1 truncate w-full flex items-center gap-1">
                            {chat.lastMessage.media && renderMediaIcon(chat.lastMessage.media.type)}
                            {chat.lastMessage.text ||
                              (chat.lastMessage.media ? `[${chat.lastMessage.media.type}]` : "")}
                          </div>
                        )}
                      </div>
                    </div>
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
                      <div className="text-xs text-muted-foreground flex items-center">
                        <span className="mr-1">
                          {typingUsers[selectedAccount][selectedChat].length === 1
                            ? `${typingUsers[selectedAccount][selectedChat][0]} is typing`
                            : `${typingUsers[selectedAccount][selectedChat].length} people are typing`}
                        </span>
                        <TypingIndicator />
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
                            <DropdownMenuItem
                              onClick={() =>
                                socket?.emit("markAsUnread", { accountId: selectedAccount, chatId: selectedChat })
                              }
                            >
                              Mark as Unread
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                socket?.emit("getNotificationSettings", {
                                  accountId: selectedAccount,
                                  chatId: selectedChat,
                                })
                              }
                            >
                              Notification Settings
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

              <ScrollArea className="flex-1 p-5">
                {hasMoreMessages[selectedAccount]?.[selectedChat] && (
                  <div className="text-center mb-4">
                    <Button variant="outline" size="sm" onClick={loadMoreMessages} disabled={loading.messages}>
                      {loading.messages ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Load more messages
                    </Button>
                  </div>
                )}

                {loading.messages ? (
                  <div className="flex flex-col gap-4">
                    <div className="h-20 bg-muted animate-pulse rounded-md"></div>
                    <div className="h-20 bg-muted animate-pulse rounded-md self-end"></div>
                    <div className="h-20 bg-muted animate-pulse rounded-md"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Update the message rendering section in the main content area */}
                    {messages[selectedAccount]?.[selectedChat]?.length > 0 ? (
                      groupMessagesByDate(messages[selectedAccount][selectedChat]).map(([date, dateMessages]) => (
                        <div key={date} className="space-y-3">
                          <div className="text-center">
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md">{date}</span>
                          </div>

                          {dateMessages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${message.isFromMe ? "justify-end" : "justify-start"} message-container`}
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
                                    className={`reply-reference ${
                                      message.isFromMe ? "reply-reference-from-me" : "reply-reference-from-other"
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
                                  className={`message-bubble ${message.replyTo ? "rounded-t-none" : ""} ${
                                    message.isFromMe ? "message-bubble-from-me" : "message-bubble-from-other"
                                  }`}
                                >
                                  {/* Message media */}
                                  {message.media && (
                                    <div className="mb-2">
                                      {message.media.url ? (
                                        message.media.type === "photo" || message.media.type === "video" ? (
                                          <img
                                            src={message.media.url || "/placeholder.svg"}
                                            alt={message.media.type}
                                            className="rounded-md max-w-full max-h-60 object-contain"
                                          />
                                        ) : message.media.type === "voice" || message.media.type === "audio" ? (
                                          <audio controls className="w-full">
                                            <source src={message.media.url} type={message.media.mimeType} />
                                            Your browser does not support the audio element.
                                          </audio>
                                        ) : (
                                          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                                            <File className="h-5 w-5" />
                                            <div className="flex-1 overflow-hidden">
                                              <div className="truncate font-medium">
                                                {message.media.fileName || "Document"}
                                              </div>
                                              <div className="text-xs text-muted-foreground">
                                                {message.media.mimeType}
                                              </div>
                                            </div>
                                            <Button variant="outline" size="sm" asChild>
                                              <a
                                                href={message.media.url}
                                                download
                                                target="_blank"
                                                rel="noopener noreferrer"
                                              >
                                                Download
                                              </a>
                                            </Button>
                                          </div>
                                        )
                                      ) : (
                                        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                                          {renderMediaIcon(message.media.type)}
                                          <span className="text-sm">{message.media.type}</span>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              handleLoadMedia(
                                                selectedAccount,
                                                selectedChat,
                                                message.id,
                                                message.media.type,
                                              )
                                            }
                                          >
                                            Load
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Sticker */}
                                  {message.sticker && (
                                    <div className="mb-2">
                                      {message.sticker.thumbnail ? (
                                        <img
                                          src={message.sticker.thumbnail || "/placeholder.svg"}
                                          alt={message.sticker.emoji || "Sticker"}
                                          className="max-w-[128px] max-h-[128px]"
                                        />
                                      ) : (
                                        <div className="flex items-center justify-center w-24 h-24 bg-muted rounded-md">
                                          <span className="text-2xl">{message.sticker.emoji || "🌟"}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Message text */}
                                  {message.text && <div>{message.text}</div>}

                                  {/* Message metadata */}
                                  <div className="message-metadata">
                                    {message.edited && <Edit className="h-3 w-3" />}
                                    {message.forwarded && <Forward className="h-3 w-3" />}
                                    {formatTime(message.timestamp)}
                                    {message.isFromMe &&
                                      (message.id.startsWith("temp-") ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : message.readState?.isRead ? (
                                        <CheckCheck className="h-3 w-3" />
                                      ) : (
                                        <CheckCheck className="h-3 w-3 text-muted-foreground/50" />
                                      ))}
                                  </div>
                                </div>

                                {/* Message actions */}
                                <div
                                  className={`message-actions ${
                                    message.isFromMe ? "message-actions-from-me" : "message-actions-from-other"
                                  }`}
                                >
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 rounded-full"
                                          onClick={() => setReplyingTo(message)}
                                        >
                                          <Reply className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" align="center">
                                        Reply
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
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

              {/* Update the message input area */}
              <div className="p-4 border-t border-border bg-background sticky bottom-0 z-10">
                <form onSubmit={handleSendMessage} className="flex gap-3 items-center">
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
                    className="flex-1 rounded-full bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-10 w-10 rounded-full"
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

