"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import * as apiClient from "@/lib/api-client"
import wsClient from "@/lib/websocket-client"

// Types
export type AccountType = {
  id: string
  name: string
  username: string
  avatar: string
  unreadCount: number
  muted: boolean
  active: boolean
  phone: string
  bio?: string
  darkMode?: boolean
  apiId?: string
  apiHash?: string
  sessionString?: string
  hasMentions?: boolean
  notificationSettings?: {
    sound: boolean
    preview: boolean
    showBadge: boolean
  }
  language?: string
  privacySettings?: {
    lastSeen: "everybody" | "contacts" | "nobody"
    profilePhoto: "everybody" | "contacts" | "nobody"
    calls: "everybody" | "contacts" | "nobody"
    forwardedMessages: "everybody" | "contacts" | "nobody"
  }
  sessions?: Array<{
    id: string
    deviceName: string
    appName: string
    ip: string
    location: string
    lastActive: string
    current: boolean
  }>
}

export type ChatType = {
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
  isAdmin?: boolean
  memberCount?: number
  subscriberCount?: number
  description?: string
  createdBy?: string
  createdAt?: string
  members?: MemberType[]
  accountId?: string
  privacy?: "public" | "private"
  joinStatus?: "member" | "pending" | "none"
  hasMentions?: boolean
}

export type MessageType = {
  id: string
  sender: string
  senderId: string
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

export type MemberType = {
  id: string
  name: string
  username: string
  avatar: string
  role?: "admin" | "member"
  online?: boolean
  lastSeen?: string
  muted?: boolean
  isContact?: boolean
}

export type MediaItemType = {
  id: string
  type: string
  url?: string
  name?: string
  title?: string
  size?: string
  date: string
}

// Define the NewMessageEvent type
type NewMessageEvent = {
  chatId: string
  message: MessageType
  chat: ChatType
  hasMention: boolean
  accountId: string
}

// Initial data
const initialAccounts: AccountType[] = [
  {
    id: "1",
    name: "Default Account",
    username: "@default",
    avatar: "/placeholder.svg?height=40&width=40",
    unreadCount: 0,
    muted: false,
    active: true,
    phone: "",
    apiId: "20730239", // Default API ID
    apiHash: "72c82b71fc9db0a2808cdbeca34912e7", // Default API Hash
  },
]

// Context type
type TelegramStoreContextType = {
  accounts: AccountType[]
  activeAccount: AccountType
  chats: ChatType[]
  activeChat: ChatType | null
  messages: Record<string, MessageType[]>
  mediaItems: Record<string, MediaItemType[]>
  activeMember: MemberType | null
  publicGroups: ChatType[]
  isLoading: boolean
  error: string | null
  loginState: {
    step: "init" | "phone" | "code" | "password" | "complete"
    phoneNumber: string
    phoneCodeHash: string
  }

  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Authentication
  initializeClient: (accountId: string, apiId: string, apiHash: string) => Promise<void>
  startLogin: (phoneNumber: string) => Promise<void>
  completeLogin: (code: string) => Promise<void>
  complete2FALogin: (password: string) => Promise<void>
  logout: (accountId: string) => Promise<void>

  // Actions
  setActiveAccount: (accountId: string) => void
  setActiveChat: (chatId: string) => void
  setActiveMember: (member: MemberType | null) => void
  addAccount: (account: Omit<AccountType, "id" | "unreadCount" | "active">) => void
  updateAccount: (accountId: string, updates: Partial<AccountType>) => void
  removeAccount: (accountId: string) => void
  addChat: (chat: Omit<ChatType, "id" | "unread">) => void
  updateChat: (chatId: string, updates: Partial<ChatType>) => void
  removeChat: (chatId: string) => void
  addMessage: (chatId: string, message: Omit<MessageType, "id">) => void
  updateMessage: (chatId: string, messageId: string, updates: Partial<MessageType>) => void
  deleteMessage: (chatId: string, messageId: string) => Promise<void>
  addReaction: (chatId: string, messageId: string, emoji: string) => Promise<void>
  removeReaction: (chatId: string, messageId: string, emoji: string) => Promise<void>
  addMember: (chatId: string, member: MemberType) => void
  removeMember: (chatId: string, memberId: string) => void
  updateMember: (chatId: string, memberId: string, updates: Partial<MemberType>) => void
  toggleMuteMember: (chatId: string, memberId: string) => void
  toggleContactStatus: (chatId: string, memberId: string) => void
  getFilteredChats: () => ChatType[]
  markMessageAsRead: (chatId: string, messageId: string) => void
  markAllMessagesAsRead: (chatId: string) => Promise<void>
  requestJoinGroup: (groupId: string) => Promise<void>
  acceptJoinRequest: (groupId: string, memberId: string) => void
  rejectJoinRequest: (groupId: string, memberId: string) => void
  getPendingJoinRequests: () => ChatType[]
  sendMessage: (chatId: string, content: string) => Promise<void>
  fetchChats: () => Promise<void>
  fetchMessages: (chatId: string) => Promise<void>
  getChatFromUrl: () => void
  setTyping: (chatId: string, typing?: boolean) => Promise<void>
  toggleMuteChat: (chatId: string) => Promise<void>
  togglePinChat: (chatId: string) => Promise<void>
  getMedia: (chatId: string) => Promise<void>
  forwardMessage: (fromChatId: string, toChatId: string, messageId: string) => Promise<void>
  updateAccountMentions: (accountId: string, hasMentions: boolean) => void
  updateChatMentions: (chatId: string, hasMentions: boolean) => void
}

// Create context
const TelegramStoreContext = createContext<TelegramStoreContextType | undefined>(undefined)

// Provider component
export function TelegramStoreProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  // State
  const [accounts, setAccounts] = useState<AccountType[]>(initialAccounts)
  const [activeAccount, setActiveAccountState] = useState<AccountType>(initialAccounts[0])
  const [chats, setChats] = useState<ChatType[]>([])
  const [activeChat, setActiveChatState] = useState<ChatType | null>(null)
  const [messages, setMessages] = useState<Record<string, MessageType[]>>({})
  const [mediaItems, setMediaItems] = useState<Record<string, MediaItemType[]>>({})
  const [activeMember, setActiveMemberState] = useState<MemberType | null>(null)
  const [publicGroups, setPublicGroups] = useState<ChatType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fix loginState step type issues
  type LoginStep = "init" | "phone" | "code" | "password" | "complete"

  const [loginState, setLoginState] = useState<{
    step: LoginStep
    phoneNumber: string
    phoneCodeHash: string
  }>({
    step: "init",
    phoneNumber: "",
    phoneCodeHash: "",
  })
  const [wsConnected, setWsConnected] = useState(false)

  // Connect to WebSocket when active account changes
  useEffect(() => {
    if (activeAccount && loginState.step === "complete") {
      wsClient
        .connect(activeAccount.id)
        .then(() => {
          setWsConnected(true)
          console.log("WebSocket connected for account:", activeAccount.id)
        })
        .catch((error) => {
          console.error("WebSocket connection error:", error)
          setWsConnected(false)
        })
    }

    return () => {
      if (wsConnected) {
        wsClient.disconnect()
        setWsConnected(false)
      }
    }
  }, [activeAccount, loginState.step])

  // Set up WebSocket event handlers
  useEffect(() => {
    // Handle new messages
    const handleNewMessage = (data: any) => {
      const { chatId, message, chat, hasMention } = data

      // Add message to chat
      setMessages((prev) => {
        const chatMessages = prev[chatId] || []
        return {
          ...prev,
          [chatId]: [...chatMessages, message],
        }
      })

      // Update chat with new message
      setChats((prev) => {
        return prev.map((c) => {
          if (c.id === chatId) {
            return {
              ...c,
              lastMessage: message.content,
              time: "Just now",
              unread: c.unread + 1,
              hasMentions: c.hasMentions || hasMention,
            }
          }
          return c
        })
      })

      // Update account unread count
      if (data.accountId) {
        setAccounts((prev) => {
          return prev.map((a) => {
            if (a.id === data.accountId) {
              return {
                ...a,
                unreadCount: a.unreadCount + 1,
                hasMentions: a.hasMentions || hasMention,
              }
            }
            return a
          })
        })
      }
    }

    // Handle mentions
    const handleMention = (data: any) => {
      const { accountId, chatId } = data

      // Update account mentions
      setAccounts((prev) => {
        return prev.map((a) => {
          if (a.id === accountId) {
            return {
              ...a,
              hasMentions: true,
            }
          }
          return a
        })
      })

      // Update chat mentions
      setChats((prev) => {
        return prev.map((c) => {
          if (c.id === chatId) {
            return {
              ...c,
              hasMentions: true,
            }
          }
          return c
        })
      })
    }

    // Register WebSocket event handlers
    wsClient.on("new_message", handleNewMessage)
    wsClient.on("mention", handleMention)

    // Clean up event handlers
    return () => {
      wsClient.off("new_message", handleNewMessage)
      wsClient.off("mention", handleMention)
    }
  }, [])

  // Data fetching methods
  const fetchChats = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Type checking for API responses
      // Example for fetchChats:
      const response = await apiClient.fetchChats(activeAccount.id)
      if (typeof response === "object" && response !== null && "success" in response && response.success) {
        if ("chats" in response) {
          setChats(response.chats)
        }
      } else {
        throw new Error(
          typeof response === "object" && response !== null && "error" in response
            ? (response.error as string)
            : "Failed to fetch chats",
        )
      }
    } catch (error) {
      console.error("Error fetching chats:", error)
      setError("Failed to fetch chats")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMessages = async (chatId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.fetchMessages(activeAccount.id, chatId)

      if (typeof response === "object" && response !== null && "success" in response && response.success) {
        if ("messages" in response) {
          setMessages((prev) => ({
            ...prev,
            [chatId]: response.messages,
          }))
        }
      } else {
        throw new Error(
          typeof response === "object" && response !== null && "error" in response
            ? (response.error as string)
            : "Failed to fetch messages",
        )
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
      setError("Failed to fetch messages")
    } finally {
      setIsLoading(false)
    }
  }

  // Load session data from cookies
  useEffect(() => {}, [])

  // Load data from localStorage on mount
  useEffect(() => {}, [])

  // Handle URL changes
  useEffect(() => {}, [])

  // Parse URL to get chat ID
  const getChatFromUrl = useCallback(() => {
    if (pathname) {
      const parts = pathname.split("/")
      const chatIdIndex = parts.indexOf("chat")

      if (chatIdIndex !== -1 && parts.length > chatIdIndex + 1) {
        const chatId = parts[chatIdIndex + 1]

        // Set active chat based on URL
        const chat = chats.find((c) => c.id === chatId)
        if (chat) {
          setActiveChat(chatId)
        }
      }
    }
  }, [pathname, chats])

  // Save data to localStorage when it changes
  useEffect(() => {}, [])

  // Set up event listeners for Telegram updates
  useEffect(() => {}, [])

  // Handle new messages from Telegram
  const handleNewMessage = useCallback((event: NewMessageEvent) => {}, [])

  // Initialize client for active account
  useEffect(() => {}, [])

  // Authentication methods
  const initializeClient = async (accountId: string, apiId: string, apiHash: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.initializeClient(accountId, apiId, apiHash)

      if (typeof response === "object" && response !== null && "success" in response && response.success) {
        // Update account with API credentials and session
        updateAccount(accountId, {
          apiId,
          apiHash,
          sessionString: response.sessionString,
        })

        // Update login state based on whether we had a session
        setLoginState({
          step: response.hasSession ? "complete" : "phone",
          phoneNumber: "",
          phoneCodeHash: "",
        })

        if (response.hasSession) {
          // If we already have a session, fetch data
          await fetchChats()
        }
      } else {
        throw new Error(
          typeof response === "object" && response !== null && "error" in response
            ? (response.error as string)
            : "Failed to initialize client",
        )
      }
    } catch (error) {
      console.error("Error initializing client:", error)
      setError(`Failed to initialize Telegram client: ${error.message}`)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const startLogin = async (phoneNumber: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.startLogin(activeAccount.id, phoneNumber)

      if (typeof response === "object" && response !== null && "success" in response && response.success) {
        setLoginState({
          step: "code",
          phoneNumber,
          phoneCodeHash: response.phoneCodeHash,
        })
      } else {
        throw new Error(
          typeof response === "object" && response !== null && "error" in response
            ? (response.error as string)
            : "Failed to send verification code",
        )
      }
    } catch (error) {
      console.error("Error starting login:", error)
      setError("Failed to send verification code")
    } finally {
      setIsLoading(false)
    }
  }

  const completeLogin = async (code: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.completeLogin(
        activeAccount.id,
        loginState.phoneNumber,
        loginState.phoneCodeHash,
        code,
      )

      if (typeof response === "object" && response !== null && "success" in response && response.success) {
        if (response.requiresPassword) {
          // Move to password step if 2FA is enabled
          setLoginState({
            ...loginState,
            step: "password",
          })
          return
        }

        // Update account with user info and session
        updateAccount(activeAccount.id, {
          name: response.user
            ? `${response.user.firstName || ""} ${response.user.lastName || ""}`.trim()
            : activeAccount.name,
          username: response.user?.username ? `@${response.user.username}` : activeAccount.username,
          phone: loginState.phoneNumber,
          sessionString: response.sessionString,
        })

        setLoginState({
          step: "complete",
          phoneNumber: loginState.phoneNumber,
          phoneCodeHash: loginState.phoneCodeHash,
        })

        // Fetch initial data
        await fetchChats()
      } else {
        throw new Error(
          typeof response === "object" && response !== null && "error" in response
            ? (response.error as string)
            : "Failed to verify code",
        )
      }
    } catch (error) {
      console.error("Error completing login:", error)
      setError("Failed to verify code")
    } finally {
      setIsLoading(false)
    }
  }

  const complete2FALogin = async (password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.complete2FALogin(activeAccount.id, password)

      if (typeof response === "object" && response !== null && "success" in response && response.success) {
        // Update account with user info and session
        updateAccount(activeAccount.id, {
          name: response.user
            ? `${response.user.firstName || ""} ${response.user.lastName || ""}`.trim()
            : activeAccount.name,
          username: response.user?.username ? `@${response.user.username}` : activeAccount.username,
          phone: loginState.phoneNumber,
          sessionString: response.sessionString,
        })

        setLoginState({
          step: "complete",
          phoneNumber: loginState.phoneNumber,
          phoneCodeHash: loginState.phoneCodeHash,
        })

        // Fetch initial data
        await fetchChats()
      } else {
        throw new Error(
          typeof response === "object" && response !== null && "error" in response
            ? (response.error as string)
            : "Failed to verify password",
        )
      }
    } catch (error) {
      console.error("Error completing 2FA login:", error)
      setError("Failed to verify password")
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async (accountId: string) => {
    // This would be implemented to call a backend API to logout
    // For now, just reset the account's session
    updateAccount(accountId, {
      sessionString: undefined,
    })

    setLoginState({
      step: "init",
      phoneNumber: "",
      phoneCodeHash: "",
    })
  }

  const sendMessage = async (chatId: string, content: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.sendMessage(activeAccount.id, chatId, content)

      if (typeof response === "object" && response !== null && "success" in response && response.success) {
        // The backend will send the new message via WebSocket
        // We don't need to update the state here
      } else {
        throw new Error(
          typeof response === "object" && response !== null && "error" in response
            ? (response.error as string)
            : "Failed to send message",
        )
      }
    } catch (error) {
      console.error("Error sending message:", error)
      setError("Failed to send message")

      // Add a temporary message to show in the UI
      addMessage(chatId, {
        sender: "You",
        senderId: "current-user",
        content,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        avatar: activeAccount.avatar,
        reactions: {},
        isRead: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Set typing status
  const setTyping = async (chatId: string, typing = true) => {
    // This would be implemented to call a backend API
    // For now, just log it
    console.log(`Setting typing status for chat ${chatId} to ${typing}`)
  }

  // Actions
  const setActiveAccount = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId)
    if (account) {
      // Update all accounts' active status
      setAccounts(
        accounts.map((a) => ({
          ...a,
          active: a.id === accountId,
        })),
      )
      setActiveAccountState(account)

      // Reset active chat when switching accounts
      setActiveChatState(null)

      // Apply theme settings if account has them
      if (account.darkMode) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }

      // Update URL
      router.push("/")

      // Fetch chats for the new active account
      if (account.sessionString) {
        fetchChats()
      }
    }
  }

  const setActiveChat = (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId)
    if (chat) {
      setActiveChatState(chat)

      // Mark as read
      setChats(chats.map((c) => (c.id === chatId ? { ...c, unread: 0, hasMentions: false } : c)))

      // Mark all messages as read
      if (messages[chatId]) {
        setMessages({
          ...messages,
          [chatId]: messages[chatId].map((message) => ({
            ...message,
            isRead: true,
          })),
        })
      }

      // Mark messages as read on server
      markAllMessagesAsRead(chatId)

      // Fetch messages if needed
      if (!messages[chatId] || messages[chatId].length === 0) {
        fetchMessages(chatId)
      }

      // Update URL
      router.push(`/chat/${chatId}`)

      // Clear mentions for this chat
      updateChatMentions(chatId, false)

      // If this is the active account, clear its mentions flag
      if (chat.accountId === activeAccount.id) {
        updateAccountMentions(activeAccount.id, false)
      }
    }
  }

  const setActiveMember = (member: MemberType | null) => {
    setActiveMemberState(member)
  }

  const addAccount = (account: Omit<AccountType, "id" | "unreadCount" | "active">) => {
    const newAccount: AccountType = {
      ...account,
      id: `account-${Date.now()}`,
      unreadCount: 0,
      active: false,
    }
    setAccounts([...accounts, newAccount])
  }

  const updateAccount = (accountId: string, updates: Partial<AccountType>) => {
    setAccounts(accounts.map((account) => (account.id === accountId ? { ...account, ...updates } : account)))

    // Update activeAccount if it's the one being updated
    if (activeAccount.id === accountId) {
      setActiveAccountState({ ...activeAccount, ...updates })
    }
  }

  const removeAccount = (accountId: string) => {
    setAccounts(accounts.filter((account) => account.id !== accountId))

    // If removing active account, set first remaining account as active
    if (activeAccount.id === accountId && accounts.length > 1) {
      const remainingAccounts = accounts.filter((account) => account.id !== accountId)
      setActiveAccountState(remainingAccounts[0])
      setAccounts(
        remainingAccounts.map((a, i) => ({
          ...a,
          active: i === 0,
        })),
      )
    }

    // Remove all chats associated with this account
    setChats(chats.filter((chat) => chat.accountId !== accountId))
  }

  const addChat = (chat: Omit<ChatType, "id" | "unread">) => {
    const newChat: ChatType = {
      ...chat,
      id: `chat-${Date.now()}`,
      unread: 0,
      accountId: activeAccount.id, // Associate with active account
    }
    setChats([newChat, ...chats])

    // Initialize empty messages array for this chat
    setMessages({
      ...messages,
      [newChat.id]: [],
    })

    // Initialize empty media items array for this chat
    setMediaItems({
      ...mediaItems,
      [newChat.id]: [],
    })
  }

  const updateChat = (chatId: string, updates: Partial<ChatType>) => {
    setChats(chats.map((chat) => (chat.id === chatId ? { ...chat, ...updates } : chat)))

    // Update activeChat if it's the one being updated
    if (activeChat && activeChat.id === chatId) {
      setActiveChatState({ ...activeChat, ...updates })
    }
  }

  const removeChat = (chatId: string) => {
    setChats(chats.filter((chat) => chat.id !== chatId))

    // If removing active chat, set active chat to null
    if (activeChat && activeChat.id === chatId) {
      setActiveChatState(null)
      router.push("/")
    }

    // Remove messages and media items for this chat
    const newMessages = { ...messages }
    delete newMessages[chatId]
    setMessages(newMessages)

    const newMediaItems = { ...mediaItems }
    delete newMediaItems[chatId]
    setMediaItems(newMediaItems)
  }

  const addMessage = (chatId: string, message: Omit<MessageType, "id">) => {
    const newMessage: MessageType = {
      ...message,
      id: `msg-${Date.now()}`,
    }

    // Add message to chat
    setMessages({
      ...messages,
      [chatId]: [...(messages[chatId] || []), newMessage],
    })

    // Update last message and time in chat
    setChats(
      chats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              lastMessage:
                message.senderId === "current-user" ? message.content : `${message.sender}: ${message.content}`,
              time: "Just now",
              unread: message.senderId === "current-user" ? chat.unread : chat.unread + 1,
            }
          : chat,
      ),
    )
  }

  const updateMessage = (chatId: string, messageId: string, updates: Partial<MessageType>) => {
    if (!messages[chatId]) return

    setMessages({
      ...messages,
      [chatId]: messages[chatId].map((message) => (message.id === messageId ? { ...message, ...updates } : message)),
    })
  }

  const deleteMessage = async (chatId: string, messageId: string) => {
    if (!messages[chatId]) return

    // This would be implemented to call a backend API
    // For now, just update the local state
    setMessages({
      ...messages,
      [chatId]: messages[chatId].filter((message) => message.id !== messageId),
    })
  }

  const addReaction = async (chatId: string, messageId: string, emoji: string) => {
    // This would be implemented to call a backend API
    // For now, just update the local state
    setMessages({
      ...messages,
      [chatId]: messages[chatId].map((message) => {
        if (message.id === messageId) {
          const updatedReactions = { ...message.reactions }
          updatedReactions[emoji] = (updatedReactions[emoji] || 0) + 1

          return {
            ...message,
            reactions: updatedReactions,
          }
        }
        return message
      }),
    })
  }

  const removeReaction = async (chatId: string, messageId: string, emoji: string) => {
    // This would be implemented to call a backend API
    // For now, just update the local state
    setMessages({
      ...messages,
      [chatId]: messages[chatId].map((message) => {
        if (message.id === messageId && message.reactions[emoji]) {
          const updatedReactions = { ...message.reactions }

          if (updatedReactions[emoji] > 1) {
            updatedReactions[emoji] -= 1
          } else {
            delete updatedReactions[emoji]
          }

          return {
            ...message,
            reactions: updatedReactions,
          }
        }
        return message
      }),
    })
  }

  const addMember = (chatId: string, member: MemberType) => {
    setChats(
      chats.map((chat) => {
        if (chat.id === chatId) {
          const updatedMembers = chat.members ? [...chat.members, member] : [member]
          return {
            ...chat,
            members: updatedMembers,
            memberCount: (chat.memberCount || 0) + 1,
          }
        }
        return chat
      }),
    )
  }

  const removeMember = (chatId: string, memberId: string) => {
    setChats(
      chats.map((chat) => {
        if (chat.id === chatId && chat.members) {
          return {
            ...chat,
            members: chat.members.filter((m) => m.id !== memberId),
            memberCount: (chat.memberCount || 0) - 1,
          }
        }
        return chat
      }),
    )
  }

  const updateMember = (chatId: string, memberId: string, updates: Partial<MemberType>) => {
    setChats(
      chats.map((chat) => {
        if (chat.id === chatId && chat.members) {
          return {
            ...chat,
            members: chat.members.map((member) => (member.id === memberId ? { ...member, ...updates } : member)),
          }
        }
        return chat
      }),
    )

    // Update activeMember if it's the one being updated
    if (activeMember && activeMember.id === memberId) {
      setActiveMemberState({ ...activeMember, ...updates })
    }
  }

  const toggleMuteMember = (chatId: string, memberId: string) => {
    setChats(
      chats.map((chat) => {
        if (chat.id === chatId && chat.members) {
          return {
            ...chat,
            members: chat.members.map((member) =>
              member.id === memberId ? { ...member, muted: !member.muted } : member,
            ),
          }
        }
        return chat
      }),
    )
  }

  const toggleContactStatus = (chatId: string, memberId: string) => {
    setChats(
      chats.map((chat) => {
        if (chat.id === chatId && chat.members) {
          return {
            ...chat,
            members: chat.members.map((member) =>
              member.id === memberId ? { ...member, isContact: !member.isContact } : member,
            ),
          }
        }
        return chat
      }),
    )
  }

  const getFilteredChats = () => {
    // Return chats for the active account
    return chats.filter((chat) => chat.accountId === activeAccount.id)
  }

  const markMessageAsRead = (chatId: string, messageId: string) => {
    if (!messages[chatId]) return

    setMessages({
      ...messages,
      [chatId]: messages[chatId].map((message) => (message.id === messageId ? { ...message, isRead: true } : message)),
    })
  }

  const markAllMessagesAsRead = async (chatId: string) => {
    if (!messages[chatId]) return

    try {
      // Get message IDs
      const messageIds = messages[chatId].map((msg) => msg.id)

      if (messageIds.length > 0) {
        await apiClient.markMessagesAsRead(activeAccount.id, chatId, messageIds)
      }

      // Update local state
      setMessages({
        ...messages,
        [chatId]: messages[chatId].map((message) => ({ ...message, isRead: true })),
      })

      // Update unread count in chat
      setChats(chats.map((chat) => (chat.id === chatId ? { ...chat, unread: 0, hasMentions: false } : chat)))

      // Update account unread count
      const chat = chats.find((c) => c.id === chatId)
      if (chat && chat.accountId === activeAccount.id) {
        // Check if there are any other chats with mentions for this account
        const otherChatsWithMentions = chats.some(
          (c) => c.id !== chatId && c.accountId === activeAccount.id && c.hasMentions,
        )

        if (!otherChatsWithMentions) {
          updateAccountMentions(activeAccount.id, false)
        }
      }
    } catch (error) {
      console.error("Error marking messages as read:", error)
    }
  }

  const requestJoinGroup = async (groupId: string) => {
    // This would be implemented to call a backend API
    // For now, just update the local state
    const group = publicGroups.find((g) => g.id === groupId)
    if (group) {
      // Add to user's chats
      const newChat = {
        ...group,
        accountId: activeAccount.id,
        joinStatus: "member" as const,
      }
      setChats([newChat, ...chats])

      // Remove from public groups
      setPublicGroups(publicGroups.filter((g) => g.id !== groupId))

      // Navigate to the new chat
      setActiveChat(groupId)
    }
  }

  const acceptJoinRequest = (groupId: string, memberId: string) => {
    // Update chat join status
    setChats(chats.map((chat) => (chat.id === groupId ? { ...chat, joinStatus: "member" } : chat)))

    // Add confirmation message
    addMessage(groupId, {
      sender: "System",
      senderId: "system",
      content: "Your join request has been accepted. Welcome to the group!",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      avatar: "/placeholder.svg?height=40&width=40",
      reactions: {},
      isRead: true,
    })
  }

  const rejectJoinRequest = (groupId: string, memberId: string) => {
    // Remove chat from user's list
    removeChat(groupId)

    // Update status in available groups
    setPublicGroups(publicGroups.map((g) => (g.id === groupId ? { ...g, joinStatus: "none" } : g)))
  }

  const getPendingJoinRequests = () => {
    // Get all chats with pending join status
    return chats.filter((chat) => chat.joinStatus === "pending" && chat.accountId === activeAccount.id)
  }

  // Toggle chat mute status
  const toggleMuteChat = async (chatId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const chat = chats.find((c) => c.id === chatId)
      if (!chat) throw new Error("Chat not found")

      await apiClient.toggleChatMute(activeAccount.id, chatId, !chat.muted)

      // Update local state
      updateChat(chatId, { muted: !chat.muted })
    } catch (error) {
      console.error("Error toggling mute status:", error)
      setError("Failed to update notification settings")
    } finally {
      setIsLoading(false)
    }
  }

  // Toggle chat pin status
  const togglePinChat = async (chatId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const chat = chats.find((c) => c.id === chatId)
      if (!chat) throw new Error("Chat not found")

      await apiClient.toggleChatPin(activeAccount.id, chatId, !chat.pinned)

      // Update local state
      updateChat(chatId, { pinned: !chat.pinned })
    } catch (error) {
      console.error("Error toggling pin status:", error)
      setError("Failed to update pin status")
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch media for a chat
  const getMedia = async (chatId: string) => {
    // This would be implemented to call a backend API
    // For now, just return empty array
    setMediaItems({
      ...mediaItems,
      [chatId]: [],
    })
  }

  // Forward a message
  const forwardMessage = async (fromChatId: string, toChatId: string, messageId: string) => {
    // This would be implemented to call a backend API
    // For now, just log it
    console.log(`Forwarding message ${messageId} from chat ${fromChatId} to chat ${toChatId}`)
  }

  // Add a function to update account mentions status
  const updateAccountMentions = (accountId: string, hasMentions: boolean) => {
    setAccounts(accounts.map((account) => (account.id === accountId ? { ...account, hasMentions } : account)))
  }

  // Add a function to update chat mentions status
  const updateChatMentions = (chatId: string, hasMentions: boolean) => {
    setChats(chats.map((chat) => (chat.id === chatId ? { ...chat, hasMentions } : chat)))
  }

  const value = {
    accounts,
    activeAccount,
    chats,
    activeChat,
    messages,
    mediaItems,
    activeMember,
    publicGroups,
    isLoading,
    error,
    loginState,
    setIsLoading,
    setError,

    // Authentication
    initializeClient,
    startLogin,
    completeLogin,
    complete2FALogin,
    logout,

    // Actions
    setActiveAccount,
    setActiveChat,
    setActiveMember,
    addAccount,
    updateAccount,
    removeAccount,
    addChat,
    updateChat,
    removeChat,
    addMessage,
    updateMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    addMember,
    removeMember,
    updateMember,
    toggleMuteMember,
    toggleContactStatus,
    getFilteredChats,
    markMessageAsRead,
    markAllMessagesAsRead,
    requestJoinGroup,
    acceptJoinRequest,
    rejectJoinRequest,
    getPendingJoinRequests,
    sendMessage,
    fetchChats,
    fetchMessages,
    getChatFromUrl,
    setTyping,
    toggleMuteChat,
    togglePinChat,
    getMedia,
    forwardMessage,
    updateAccountMentions,
    updateChatMentions,
  }

  return <TelegramStoreContext.Provider value={value}>{children}</TelegramStoreContext.Provider>
}

// Hook to use the context
export function useTelegramStore() {
  const context = useContext(TelegramStoreContext)
  if (context === undefined) {
    throw new Error("useTelegramStore must be used within a TelegramStoreProvider")
  }
  return context
}

