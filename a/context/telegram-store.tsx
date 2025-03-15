"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import * as TelegramClient from "@/lib/telegram-client"
import {
  saveSessionToCookie,
  getSessionFromCookie,
  clearSessionCookie,
  getAllSessionCookies,
} from "@/lib/session-cookie"
import type { NewMessageEvent } from "telegram/events"

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
  accountId?: string // To track which account this chat belongs to
  privacy?: "public" | "private" // Whether anyone can join or approval is needed
  joinStatus?: "member" | "pending" | "none" // User's status in the group
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

export type ProfileType = {
  id: string
  name: string
  avatar: string
  status?: string
  type: string
  bio?: string
  phone?: string
  username?: string
  joinDate?: string
}

// Initial data
const initialAccounts: AccountType[] = [
  {
    id: "1",
    name: "Alex Johnson",
    username: "@alexj",
    avatar: "/placeholder.svg?height=40&width=40",
    unreadCount: 5,
    muted: false,
    active: true,
    phone: "+1 (555) 123-4567",
    bio: "Software developer from San Francisco. Love coding and hiking.",
    notificationSettings: {
      sound: true,
      preview: true,
      showBadge: true,
    },
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

  // Add these two functions to the type definition
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Authentication
  initializeClient: (accountId: string, apiId: string, apiHash: string, sessionString?: string) => Promise<void>
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
  const [loginState, setLoginState] = useState({
    step: "init" as const,
    phoneNumber: "",
    phoneCodeHash: "",
  })

  // Data fetching methods
  const fetchChats = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const dialogs = await TelegramClient.getDialogs(activeAccount.id)

      setChats(
        dialogs.map((dialog) => ({
          ...dialog,
          accountId: activeAccount.id,
        })),
      )
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
      const fetchedMessages = await TelegramClient.getMessages(activeAccount.id, chatId)

      setMessages((prev) => ({
        ...prev,
        [chatId]: fetchedMessages,
      }))
    } catch (error) {
      console.error("Error fetching messages:", error)
      setError("Failed to fetch messages")
    } finally {
      setIsLoading(false)
    }
  }

  // Load session data from cookies
  useEffect(() => {
    const loadSessionsFromCookies = async () => {
      const sessionCookies = getAllSessionCookies()

      if (Object.keys(sessionCookies).length > 0) {
        // Load accounts from localStorage first
        const storedAccounts = sessionStorage.getItem("telegram-accounts")
        let accountsList = initialAccounts

        if (storedAccounts) {
          try {
            accountsList = JSON.parse(storedAccounts)
          } catch (e) {
            console.error("Error parsing stored accounts:", e)
          }
        }

        // Update accounts with session data
        const updatedAccounts = accountsList.map((account) => {
          if (sessionCookies[account.id]) {
            return {
              ...account,
              sessionString: sessionCookies[account.id],
            }
          }
          return account
        })

        setAccounts(updatedAccounts)

        // Initialize active account if it has a session
        const activeAcc = updatedAccounts.find((a) => a.active)
        if (activeAcc && activeAcc.sessionString && activeAcc.apiId && activeAcc.apiHash) {
          setActiveAccountState(activeAcc)

          try {
            await TelegramClient.initClient(activeAcc.id, activeAcc.apiId, activeAcc.apiHash, activeAcc.sessionString)

            setLoginState({
              step: "complete",
              phoneNumber: activeAcc.phone || "",
              phoneCodeHash: "",
            })

            // Fetch initial data
            fetchChats()
          } catch (error) {
            console.error("Error initializing client from cookie:", error)
          }
        }
      }
    }

    loadSessionsFromCookies()
  }, [])

  // Load data from localStorage on mount
  useEffect(() => {
    const storedAccounts = sessionStorage.getItem("telegram-accounts")
    const storedChats = sessionStorage.getItem("telegram-chats")
    const storedMessages = sessionStorage.getItem("telegram-messages")
    const storedMediaItems = sessionStorage.getItem("telegram-media-items")
    const storedPublicGroups = sessionStorage.getItem("telegram-public-groups")

    if (storedAccounts) setAccounts(JSON.parse(storedAccounts))
    if (storedChats) setChats(JSON.parse(storedChats))
    if (storedMessages) setMessages(JSON.parse(storedMessages))
    if (storedMediaItems) setMediaItems(JSON.parse(storedMediaItems))
    if (storedPublicGroups) setPublicGroups(JSON.parse(storedPublicGroups))

    // Initialize URL-based navigation
    getChatFromUrl()
  }, [])

  // Handle URL changes
  useEffect(() => {
    getChatFromUrl()
  }, [pathname])

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
  useEffect(() => {
    sessionStorage.setItem("telegram-accounts", JSON.stringify(accounts))
    sessionStorage.setItem("telegram-chats", JSON.stringify(chats))
    sessionStorage.setItem("telegram-messages", JSON.stringify(messages))
    sessionStorage.setItem("telegram-media-items", JSON.stringify(mediaItems))
    sessionStorage.setItem("telegram-public-groups", JSON.stringify(publicGroups))
  }, [accounts, chats, messages, mediaItems, publicGroups])

  // Set up event listeners for Telegram updates
  useEffect(() => {
    const handleUpdate = (event: CustomEvent) => {
      const { type, accountId, update } = event.detail

      if (accountId === activeAccount.id) {
        console.log(`Received ${type} update:`, update)

        // Refresh chats list after certain updates
        if (type === "new_message" || type === "chat_update" || type === "read_history") {
          fetchChats()

          // If it's a new message for the active chat, refresh messages
          if (
            type === "new_message" &&
            activeChat &&
            (update.message?.peerId?.channelId?.toString() === activeChat.id ||
              update.message?.peerId?.chatId?.toString() === activeChat.id ||
              update.message?.peerId?.userId?.toString() === activeChat.id)
          ) {
            fetchMessages(activeChat.id)
          }
        }
      }
    }

    // Add event listener
    document.addEventListener("telegram:update", handleUpdate as EventListener)

    // Clean up
    return () => {
      document.removeEventListener("telegram:update", handleUpdate as EventListener)
    }
  }, [activeAccount, activeChat])

  // Handle new messages from Telegram
  const handleNewMessage = useCallback(
    (event: NewMessageEvent) => {
      const message = event.message

      if (!message.chat) return

      const chatId = message.chat.id.toString()

      // Add to messages
      setMessages((prev) => {
        const chatMessages = prev[chatId] || []

        // Check if message already exists
        if (chatMessages.some((m) => m.id === message.id.toString())) {
          return prev
        }

        const newMessage: MessageType = {
          id: message.id.toString(),
          sender: message.sender?.firstName || "Unknown",
          senderId: message.senderId?.toString() || "",
          content: message.message || "",
          time: message.date
            ? new Date(message.date * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "",
          avatar: "/placeholder.svg?height=40&width=40", // Default avatar
          reactions: {},
          isRead: false,
        }

        return {
          ...prev,
          [chatId]: [...chatMessages, newMessage],
        }
      })

      // Update chat last message
      setChats((prev) => {
        return prev.map((chat) => {
          if (chat.id === chatId) {
            return {
              ...chat,
              lastMessage: message.message || "",
              time: message.date ? new Date(message.date * 1000).toLocaleString() : "",
              unread: chat.unread + 1,
            }
          }
          return chat
        })
      })

      // Play notification sound if enabled
      if (activeAccount.notificationSettings?.sound && message.senderId?.toString() !== "current-user") {
        const audio = new Audio("/sounds/notification.mp3")
        audio.play().catch((e) => console.error("Error playing notification sound:", e))
      }
    },
    [activeAccount.notificationSettings],
  )

  // Initialize client for active account
  useEffect(() => {
    const initActiveAccount = async () => {
      if (activeAccount && activeAccount.apiId && activeAccount.apiHash && activeAccount.sessionString) {
        try {
          await TelegramClient.initClient(
            activeAccount.id,
            activeAccount.apiId,
            activeAccount.apiHash,
            activeAccount.sessionString,
          )

          // Set up message listener
          const removeListener = TelegramClient.listenForNewMessages(activeAccount.id, handleNewMessage)

          // Fetch initial data
          await fetchChats()

          return () => {
            removeListener()
          }
        } catch (error) {
          console.error("Error initializing client:", error)
          setError("Failed to initialize Telegram client")
        }
      }
    }

    initActiveAccount()

    // Clean up on unmount
    return () => {
      if (activeAccount) {
        TelegramClient.disconnectClient(activeAccount.id)
      }
    }
  }, [activeAccount, handleNewMessage])

  // Authentication methods
  const initializeClient = async (accountId: string, apiId: string, apiHash: string, sessionString?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const account = accounts.find((a) => a.id === accountId)
      if (!account) throw new Error("Account not found")

      // Use the provided session string, or get it from cookie or account
      const existingSessionString = sessionString || getSessionFromCookie(accountId) || account.sessionString || ""

      // Initialize the client with the session string
      const { sessionString: newSessionString } = await TelegramClient.initClient(
        accountId,
        apiId,
        apiHash,
        existingSessionString,
      )

      // Update account with API credentials and session
      updateAccount(accountId, {
        apiId,
        apiHash,
        sessionString: newSessionString,
      })

      // Save session to cookie
      saveSessionToCookie(accountId, newSessionString)

      // Update login state based on whether we had a session
      setLoginState({
        step: existingSessionString ? "complete" : "phone",
        phoneNumber: "",
        phoneCodeHash: "",
      })

      if (existingSessionString) {
        // If we already have a session, fetch data
        await fetchChats()
      }
    } catch (error) {
      console.error("Error initializing client:", error)
      setError(`Failed to initialize Telegram client: ${error.message}`)
      throw error // Re-throw to allow handling in the component
    } finally {
      setIsLoading(false)
    }
  }

  const startLogin = async (phoneNumber: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const { phoneCodeHash } = await TelegramClient.startLogin(activeAccount.id, phoneNumber)

      setLoginState({
        step: "code",
        phoneNumber,
        phoneCodeHash,
      })
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
      const { user, sessionString, requiresPassword } = await TelegramClient.completeLogin(
        activeAccount.id,
        loginState.phoneNumber,
        loginState.phoneCodeHash,
        code,
      )

      if (requiresPassword) {
        // Move to password step if 2FA is enabled
        setLoginState({
          ...loginState,
          step: "password",
        })
        return
      }

      // Update account with user info and session
      updateAccount(activeAccount.id, {
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        username: user.username ? `@${user.username}` : "",
        phone: loginState.phoneNumber,
        sessionString,
      })

      // Save session to cookie
      saveSessionToCookie(activeAccount.id, sessionString)

      setLoginState({
        step: "complete",
        phoneNumber: loginState.phoneNumber,
        phoneCodeHash: loginState.phoneCodeHash,
      })

      // Fetch initial data
      await fetchChats()
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
      const { user, sessionString } = await TelegramClient.complete2FALogin(activeAccount.id, password)

      // Update account with user info and session
      updateAccount(activeAccount.id, {
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        username: user.username ? `@${user.username}` : "",
        phone: loginState.phoneNumber,
        sessionString,
      })

      // Save session to cookie
      saveSessionToCookie(activeAccount.id, sessionString)

      setLoginState({
        step: "complete",
        phoneNumber: loginState.phoneNumber,
        phoneCodeHash: loginState.phoneCodeHash,
      })

      // Fetch initial data
      await fetchChats()
    } catch (error) {
      console.error("Error completing 2FA login:", error)
      setError("Failed to verify password")
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async (accountId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await TelegramClient.disconnectClient(accountId)

      // Remove session from account
      updateAccount(accountId, {
        sessionString: undefined,
      })

      // Clear session cookie
      clearSessionCookie(accountId)

      setLoginState({
        step: "init",
        phoneNumber: "",
        phoneCodeHash: "",
      })
    } catch (error) {
      console.error("Error logging out:", error)
      setError("Failed to log out")
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async (chatId: string, content: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await TelegramClient.setTyping(activeAccount.id, chatId, false)
      const result = await TelegramClient.sendMessage(activeAccount.id, chatId, content)

      // Fetch updated messages
      await fetchMessages(chatId)
    } catch (error) {
      console.error("Error sending message:", error)
      setError("Failed to send message")
    } finally {
      setIsLoading(false)
    }
  }

  // Set typing status
  const setTyping = async (chatId: string, typing = true) => {
    try {
      await TelegramClient.setTyping(activeAccount.id, chatId, typing)
    } catch (error) {
      console.error("Error setting typing status:", error)
    }
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

      // Apply account-specific settings
      if (account.notificationSettings) {
        // Apply notification settings
        console.log("Applied notification settings for account:", account.id)
      }

      // Apply theme settings if account has them
      if (account.darkMode) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }

      // Update URL
      router.push("/")
    }
  }

  const setActiveChat = (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId)
    if (chat) {
      setActiveChatState(chat)

      // Mark as read
      setChats(chats.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c)))

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
    // Disconnect client first
    TelegramClient.disconnectClient(accountId)

    // Clear session cookie
    clearSessionCookie(accountId)

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

    setIsLoading(true)
    setError(null)

    try {
      await TelegramClient.deleteMessage(activeAccount.id, chatId, messageId)

      // Update local state
      setMessages({
        ...messages,
        [chatId]: messages[chatId].filter((message) => message.id !== messageId),
      })
    } catch (error) {
      console.error("Error deleting message:", error)
      setError("Failed to delete message")
    } finally {
      setIsLoading(false)
    }
  }

  const addReaction = async (chatId: string, messageId: string, emoji: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await TelegramClient.sendReaction(activeAccount.id, chatId, messageId, emoji)

      // Update local state
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
    } catch (error) {
      console.error("Error adding reaction:", error)
      setError("Failed to add reaction")
    } finally {
      setIsLoading(false)
    }
  }

  const removeReaction = async (chatId: string, messageId: string, emoji: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await TelegramClient.removeReaction(activeAccount.id, chatId, messageId)

      // Update local state
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
    } catch (error) {
      console.error("Error removing reaction:", error)
      setError("Failed to remove reaction")
    } finally {
      setIsLoading(false)
    }
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
        await TelegramClient.markMessagesAsRead(activeAccount.id, chatId, messageIds)
      }

      // Update local state
      setMessages({
        ...messages,
        [chatId]: messages[chatId].map((message) => ({ ...message, isRead: true })),
      })

      // Update unread count in chat
      setChats(chats.map((chat) => (chat.id === chatId ? { ...chat, unread: 0 } : chat)))
    } catch (error) {
      console.error("Error marking messages as read:", error)
    }
  }

  const requestJoinGroup = async (groupId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await TelegramClient.joinChat(activeAccount.id, groupId)

      // Update chat status
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
    } catch (error) {
      console.error("Error joining group:", error)
      setError("Failed to join group")

      // For private groups, set status to pending
      const group = publicGroups.find((g) => g.id === groupId)
      if (group && group.privacy === "private") {
        const newChat = {
          ...group,
          accountId: activeAccount.id,
          joinStatus: "pending" as const,
        }
        setChats([newChat, ...chats])
      }
    } finally {
      setIsLoading(false)
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

      await TelegramClient.toggleMute(activeAccount.id, chatId, !chat.muted)

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

      await TelegramClient.togglePin(activeAccount.id, chatId, !chat.pinned)

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
    setIsLoading(true)
    setError(null)

    try {
      const media = await TelegramClient.getChatMedia(activeAccount.id, chatId)

      // Update media items state
      setMediaItems({
        ...mediaItems,
        [chatId]: media,
      })
    } catch (error) {
      console.error("Error fetching media:", error)
      setError("Failed to fetch media")
    } finally {
      setIsLoading(false)
    }
  }

  // Forward a message
  const forwardMessage = async (fromChatId: string, toChatId: string, messageId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await TelegramClient.forwardMessages(activeAccount.id, fromChatId, toChatId, [messageId])

      // Refresh messages in destination chat
      if (toChatId === activeChat?.id) {
        await fetchMessages(toChatId)
      }
    } catch (error) {
      console.error("Error forwarding message:", error)
      setError("Failed to forward message")
    } finally {
      setIsLoading(false)
    }
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      TelegramClient.disconnectAllClients()
    }
  }, [])

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

