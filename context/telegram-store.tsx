"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

// Types
// Add bio field to AccountType
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
// Update initial accounts with bio
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
  {
    id: "2",
    name: "Sarah Miller",
    username: "@sarahm",
    avatar: "/placeholder.svg?height=40&width=40",
    unreadCount: 12,
    muted: true,
    active: false,
    phone: "+1 (555) 987-6543",
    bio: "UX Designer. Coffee enthusiast. Always looking for new challenges.",
    notificationSettings: {
      sound: false,
      preview: false,
      showBadge: true,
    },
  },
  {
    id: "3",
    name: "David Wilson",
    username: "@davidw",
    avatar: "/placeholder.svg?height=40&width=40",
    unreadCount: 0,
    muted: false,
    active: false,
    phone: "+1 (555) 456-7890",
    bio: "Photographer and traveler. Currently exploring Asia.",
    notificationSettings: {
      sound: true,
      preview: true,
      showBadge: false,
    },
  },
]

// Public groups that can be discovered and joined
const publicGroups: ChatType[] = [
  {
    id: "public-1",
    name: "JavaScript Developers",
    lastMessage: "Check out this new framework!",
    time: "2 hours ago",
    unread: 0,
    avatar: "/placeholder.svg?height=40&width=40",
    online: false,
    type: "group",
    isAdmin: false,
    memberCount: 1250,
    muted: false,
    pinned: false,
    description: "A community for JavaScript developers to share knowledge and resources.",
    createdBy: "JavaScript Community",
    createdAt: "January 2022",
    privacy: "public",
    joinStatus: "none",
  },
  {
    id: "public-2",
    name: "UI/UX Design",
    lastMessage: "New design trends for 2025",
    time: "Yesterday",
    unread: 0,
    avatar: "/placeholder.svg?height=40&width=40",
    online: false,
    type: "group",
    isAdmin: false,
    memberCount: 3420,
    muted: false,
    pinned: false,
    description: "Discuss the latest UI/UX design trends and share your work.",
    createdBy: "Design Community",
    createdAt: "March 2022",
    privacy: "public",
    joinStatus: "none",
  },
  {
    id: "public-3",
    name: "Tech News",
    lastMessage: "Latest updates on AI and machine learning",
    time: "3 days ago",
    unread: 0,
    avatar: "/placeholder.svg?height=40&width=40",
    online: false,
    type: "channel",
    isAdmin: false,
    subscriberCount: 5600,
    muted: false,
    pinned: false,
    description: "Stay updated with the latest tech news and trends.",
    createdBy: "Tech News Network",
    createdAt: "December 2021",
    privacy: "public",
    joinStatus: "none",
  },
  {
    id: "private-1",
    name: "Exclusive Developers",
    lastMessage: "Discussion about new project",
    time: "1 day ago",
    unread: 0,
    avatar: "/placeholder.svg?height=40&width=40",
    online: false,
    type: "group",
    isAdmin: false,
    memberCount: 120,
    muted: false,
    pinned: false,
    description: "A private group for experienced developers. Approval required to join.",
    createdBy: "Senior Dev Team",
    createdAt: "April 2023",
    privacy: "private",
    joinStatus: "none",
  },
  {
    id: "private-2",
    name: "Product Managers",
    lastMessage: "Roadmap planning discussion",
    time: "4 hours ago",
    unread: 0,
    avatar: "/placeholder.svg?height=40&width=40",
    online: false,
    type: "group",
    isAdmin: false,
    memberCount: 85,
    muted: false,
    pinned: false,
    description: "A group for product managers to share insights and strategies.",
    createdBy: "PM Community",
    createdAt: "June 2023",
    privacy: "private",
    joinStatus: "none",
  },
]

const initialChats: ChatType[] = [
  {
    id: "1",
    name: "John Doe",
    lastMessage: "Hey, how's it going?",
    time: "10:30 AM",
    unread: 2,
    avatar: "/placeholder.svg?height=40&width=40",
    online: true,
    type: "private",
    muted: false,
    pinned: false,
    accountId: "1",
    members: [
      {
        id: "john-doe",
        name: "John Doe",
        username: "@johndoe",
        avatar: "/placeholder.svg?height=40&width=40",
        online: true,
        isContact: true,
      },
    ],
  },
  {
    id: "2",
    name: "Tech Group",
    lastMessage: "Alice: Check out this new framework!",
    time: "Yesterday",
    unread: 0,
    avatar: "/placeholder.svg?height=40&width=40",
    online: false,
    type: "group",
    isAdmin: true,
    memberCount: 128,
    muted: true,
    pinned: true,
    description: "A group for discussing the latest in technology and programming.",
    createdBy: "Alex Johnson",
    createdAt: "January 2023",
    accountId: "1",
    privacy: "public",
    joinStatus: "member",
    members: [
      {
        id: "1",
        name: "Alex Johnson",
        username: "@alexj",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "admin",
        online: true,
      },
      {
        id: "c1",
        name: "Emma Thompson",
        username: "@emmat",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "member",
        online: false,
        lastSeen: "2 hours ago",
        muted: true,
      },
      {
        id: "c2",
        name: "Michael Brown",
        username: "@michaelb",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "member",
        online: true,
        isContact: true,
      },
      {
        id: "c3",
        name: "Olivia Davis",
        username: "@oliviad",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "member",
        online: false,
        lastSeen: "yesterday",
      },
    ],
  },
  {
    id: "3",
    name: "Sarah Miller",
    lastMessage: "Let's meet tomorrow at 2pm",
    time: "Yesterday",
    unread: 0,
    avatar: "/placeholder.svg?height=40&width=40",
    online: true,
    type: "private",
    muted: false,
    pinned: false,
    accountId: "1",
    members: [
      {
        id: "2",
        name: "Sarah Miller",
        username: "@sarahm",
        avatar: "/placeholder.svg?height=40&width=40",
        online: true,
        isContact: true,
      },
    ],
  },
  {
    id: "4",
    name: "Project Team",
    lastMessage: "Bob: I've pushed the latest changes",
    time: "Monday",
    unread: 5,
    avatar: "/placeholder.svg?height=40&width=40",
    online: false,
    type: "group",
    isAdmin: false,
    memberCount: 15,
    muted: false,
    pinned: false,
    description: "Team for the current project development.",
    createdBy: "Sarah Miller",
    createdAt: "March 2023",
    accountId: "1",
    privacy: "private",
    joinStatus: "member",
    members: [
      {
        id: "2",
        name: "Sarah Miller",
        username: "@sarahm",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "admin",
        online: true,
      },
      {
        id: "1",
        name: "Alex Johnson",
        username: "@alexj",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "member",
        online: true,
      },
      {
        id: "c4",
        name: "James Wilson",
        username: "@jamesw",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "member",
        online: false,
        lastSeen: "3 days ago",
      },
    ],
  },
  {
    id: "5",
    name: "David Wilson",
    lastMessage: "Thanks for your help!",
    time: "Monday",
    unread: 0,
    avatar: "/placeholder.svg?height=40&width=40",
    online: false,
    type: "private",
    muted: false,
    pinned: false,
    accountId: "1",
    members: [
      {
        id: "3",
        name: "David Wilson",
        username: "@davidw",
        avatar: "/placeholder.svg?height=40&width=40",
        online: false,
        lastSeen: "3 hours ago",
        isContact: true,
      },
    ],
  },
  {
    id: "6",
    name: "Tech News",
    lastMessage: "Latest updates on AI and machine learning",
    time: "Tuesday",
    unread: 3,
    avatar: "/placeholder.svg?height=40&width=40",
    online: false,
    type: "channel",
    isAdmin: true,
    subscriberCount: 2450,
    muted: true,
    pinned: true,
    description: "Channel for the latest technology news and updates.",
    createdBy: "Alex Johnson",
    createdAt: "December 2022",
    accountId: "1",
    privacy: "public",
    joinStatus: "member",
    members: [
      {
        id: "1",
        name: "Alex Johnson",
        username: "@alexj",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "admin",
        online: true,
      },
    ],
  },
  {
    id: "7",
    name: "Design Inspiration",
    lastMessage: "New UI trends for 2025",
    time: "Wednesday",
    unread: 0,
    avatar: "/placeholder.svg?height=40&width=40",
    online: false,
    type: "channel",
    isAdmin: false,
    subscriberCount: 5678,
    muted: false,
    pinned: false,
    description: "Channel for design inspiration and UI/UX trends.",
    createdBy: "Emma Thompson",
    createdAt: "February 2023",
    accountId: "1",
    privacy: "public",
    joinStatus: "member",
    members: [
      {
        id: "c1",
        name: "Emma Thompson",
        username: "@emmat",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "admin",
        online: false,
      },
      {
        id: "1",
        name: "Alex Johnson",
        username: "@alexj",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "member",
        online: true,
      },
    ],
  },
  // Account 2 chats
  {
    id: "8",
    name: "Work Team",
    lastMessage: "Meeting at 3pm tomorrow",
    time: "Just now",
    unread: 1,
    avatar: "/placeholder.svg?height=40&width=40",
    online: false,
    type: "group",
    isAdmin: true,
    memberCount: 8,
    muted: false,
    pinned: true,
    description: "Work team discussions and updates",
    createdBy: "Sarah Miller",
    createdAt: "April 2023",
    accountId: "2",
    privacy: "private",
    joinStatus: "member",
    members: [
      {
        id: "2",
        name: "Sarah Miller",
        username: "@sarahm",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "admin",
        online: true,
      },
      {
        id: "c5",
        name: "Robert Johnson",
        username: "@robertj",
        avatar: "/placeholder.svg?height=40&width=40",
        role: "member",
        online: true,
      },
    ],
  },
  {
    id: "9",
    name: "Family Group",
    lastMessage: "Mom: Don't forget dinner on Sunday",
    time: "2 hours ago",
    unread: 0,
    avatar: "/placeholder.svg?height=40&width=40",
    online: false,
    type: "group",
    isAdmin: false,
    memberCount: 5,
    muted: false,
    pinned: false,
    description: "Family chat group",
    createdBy: "Dad",
    createdAt: "January 2022",
    accountId: "2",
    privacy: "private",
    joinStatus: "member",
  },
  // Pending join request
  {
    id: "private-3",
    name: "Senior Developers",
    lastMessage: "",
    time: "1 day ago",
    unread: 0,
    avatar: "/placeholder.svg?height=40&width=40",
    online: false,
    type: "group",
    isAdmin: false,
    memberCount: 75,
    muted: false,
    pinned: false,
    description: "A group for senior developers to discuss advanced topics.",
    createdBy: "Tech Leaders",
    createdAt: "May 2023",
    accountId: "1",
    privacy: "private",
    joinStatus: "pending",
  },
]

// Initial messages for each chat
const initialMessages: Record<string, MessageType[]> = {
  "1": [
    {
      id: "1-1",
      sender: "John Doe",
      senderId: "john-doe",
      content: "Hey, how's it going?",
      time: "10:30 AM",
      avatar: "/placeholder.svg?height=40&width=40",
      reactions: {},
      isRead: true,
    },
    {
      id: "1-2",
      sender: "You",
      senderId: "current-user",
      content: "Not bad! Just working on a new project. How about you?",
      time: "10:32 AM",
      avatar: "/placeholder.svg?height=40&width=40",
      reactions: { "👍": 1 },
      isRead: true,
    },
    {
      id: "1-3",
      sender: "John Doe",
      senderId: "john-doe",
      content: "I'm good too. What kind of project are you working on?",
      time: "10:33 AM",
      avatar: "/placeholder.svg?height=40&width=40",
      reactions: {},
      isRead: true,
    },
    {
      id: "1-4",
      sender: "You",
      senderId: "current-user",
      content: "I'm building a multi-account Telegram client with Next.js and Shadcn UI. It's coming along nicely!",
      time: "10:35 AM",
      avatar: "/placeholder.svg?height=40&width=40",
      reactions: { "🚀": 1, "👏": 1 },
      isRead: true,
    },
    {
      id: "1-5",
      sender: "John Doe",
      senderId: "john-doe",
      content: "That sounds really cool! I'd love to check it out when you're done.",
      time: "10:36 AM",
      avatar: "/placeholder.svg?height=40&width=40",
      reactions: {},
      isRead: false,
    },
    {
      id: "1-6",
      sender: "You",
      senderId: "current-user",
      content: "Sure thing! I'll send you a link when it's ready.",
      time: "10:38 AM",
      avatar: "/placeholder.svg?height=40&width=40",
      reactions: {},
      isRead: true,
    },
  ],
  "2": [
    {
      id: "2-1",
      sender: "Alice",
      senderId: "alice",
      content: "Check out this new framework!",
      time: "Yesterday",
      avatar: "/placeholder.svg?height=40&width=40",
      reactions: { "👍": 3, "🔥": 2 },
      isRead: true,
    },
    {
      id: "2-2",
      sender: "Bob",
      senderId: "bob",
      content: "Looks interesting! Has anyone tried it yet?",
      time: "Yesterday",
      avatar: "/placeholder.svg?height=40&width=40",
      reactions: {},
      isRead: true,
    },
    {
      id: "2-3",
      sender: "You",
      senderId: "current-user",
      content: "I've been using it for a week now. It's pretty good!",
      time: "Yesterday",
      avatar: "/placeholder.svg?height=40&width=40",
      reactions: { "👍": 2 },
      isRead: true,
    },
  ],
  "3": [
    {
      id: "3-1",
      sender: "Sarah Miller",
      senderId: "2",
      content: "Let's meet tomorrow at 2pm",
      time: "Yesterday",
      avatar: "/placeholder.svg?height=40&width=40",
      reactions: {},
      isRead: true,
    },
    {
      id: "3-2",
      sender: "You",
      senderId: "current-user",
      content: "Sounds good! Where should we meet?",
      time: "Yesterday",
      avatar: "/placeholder.svg?height=40&width=40",
      reactions: {},
      isRead: true,
    },
    {
      id: "3-3",
      sender: "Sarah Miller",
      senderId: "2",
      content: "How about the coffee shop on Main Street?",
      time: "Yesterday",
      avatar: "/placeholder.svg?height=40&width=40",
      reactions: { "👍": 1 },
      isRead: true,
    },
  ],
  "8": [
    {
      id: "8-1",
      sender: "Robert Johnson",
      senderId: "c5",
      content: "Meeting at 3pm tomorrow in the conference room",
      time: "Just now",
      avatar: "/placeholder.svg?height=40&width=40",
      reactions: {},
      isRead: false,
    },
    {
      id: "8-2",
      sender: "You",
      senderId: "current-user",
      content: "I'll be there. Should I prepare anything?",
      time: "Just now",
      avatar: "/placeholder.svg?height=40&width=40",
      reactions: {},
      isRead: true,
    },
  ],
  "9": [
    {
      id: "9-1",
      sender: "Mom",
      senderId: "mom",
      content: "Don't forget dinner on Sunday at 6pm",
      time: "2 hours ago",
      avatar: "/placeholder.svg?height=40&width=40",
      reactions: { "❤️": 2 },
      isRead: true,
    },
    {
      id: "9-2",
      sender: "Dad",
      senderId: "dad",
      content: "I'll pick you up if you need a ride",
      time: "1 hour ago",
      avatar: "/placeholder.svg?height=40&width=40",
      reactions: {},
      isRead: true,
    },
  ],
  "private-3": [
    {
      id: "private-3-1",
      sender: "System",
      senderId: "system",
      content: "You've requested to join this group. Waiting for admin approval.",
      time: "1 day ago",
      avatar: "/placeholder.svg?height=40&width=40",
      reactions: {},
      isRead: true,
    },
  ],
}

// Media items for each chat
const initialMediaItems: Record<string, MediaItemType[]> = {
  "1": [
    {
      id: "1-m1",
      type: "image",
      url: "/placeholder.svg?height=200&width=200",
      date: "Today",
    },
    {
      id: "1-m2",
      type: "file",
      name: "document.pdf",
      size: "2.4 MB",
      date: "Last week",
    },
  ],
  "2": [
    {
      id: "2-m1",
      type: "image",
      url: "/placeholder.svg?height=200&width=200",
      date: "Yesterday",
    },
    {
      id: "2-m2",
      type: "image",
      url: "/placeholder.svg?height=200&width=200",
      date: "Last month",
    },
    {
      id: "2-m3",
      type: "link",
      title: "GitHub Repository",
      url: "https://github.com/user/project",
      date: "2 days ago",
    },
  ],
}

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
  deleteMessage: (chatId: string, messageId: string) => void
  addReaction: (chatId: string, messageId: string, emoji: string) => void
  removeReaction: (chatId: string, messageId: string, emoji: string) => void
  addMember: (chatId: string, member: MemberType) => void
  removeMember: (chatId: string, memberId: string) => void
  updateMember: (chatId: string, memberId: string, updates: Partial<MemberType>) => void
  toggleMuteMember: (chatId: string, memberId: string) => void
  toggleContactStatus: (chatId: string, memberId: string) => void
  getFilteredChats: () => ChatType[]
  markMessageAsRead: (chatId: string, messageId: string) => void
  markAllMessagesAsRead: (chatId: string) => void
  requestJoinGroup: (groupId: string) => void
  acceptJoinRequest: (groupId: string, memberId: string) => void
  rejectJoinRequest: (groupId: string, memberId: string) => void
  getPendingJoinRequests: () => ChatType[]
}

// Create context
const TelegramStoreContext = createContext<TelegramStoreContextType | undefined>(undefined)

// Provider component
export function TelegramStoreProvider({ children }: { children: React.ReactNode }) {
  // State
  const [accounts, setAccounts] = useState<AccountType[]>(initialAccounts)
  const [activeAccount, setActiveAccountState] = useState<AccountType>(initialAccounts[0])
  const [chats, setChats] = useState<ChatType[]>(initialChats)
  const [activeChat, setActiveChatState] = useState<ChatType | null>(null)
  const [messages, setMessages] = useState<Record<string, MessageType[]>>(initialMessages)
  const [mediaItems, setMediaItems] = useState<Record<string, MediaItemType[]>>(initialMediaItems)
  const [activeMember, setActiveMemberState] = useState<MemberType | null>(null)
  const [availablePublicGroups, setAvailablePublicGroups] = useState<ChatType[]>(publicGroups)

  // Load data from localStorage on mount
  useEffect(() => {
    const storedAccounts = localStorage.getItem("telegram-accounts")
    const storedChats = localStorage.getItem("telegram-chats")
    const storedMessages = localStorage.getItem("telegram-messages")
    const storedMediaItems = localStorage.getItem("telegram-media-items")
    const storedPublicGroups = localStorage.getItem("telegram-public-groups")

    if (storedAccounts) setAccounts(JSON.parse(storedAccounts))
    if (storedChats) setChats(JSON.parse(storedChats))
    if (storedMessages) setMessages(JSON.parse(storedMessages))
    if (storedMediaItems) setMediaItems(JSON.parse(storedMediaItems))
    if (storedPublicGroups) setAvailablePublicGroups(JSON.parse(storedPublicGroups))
  }, [])

  // Save data to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("telegram-accounts", JSON.stringify(accounts))
    localStorage.setItem("telegram-chats", JSON.stringify(chats))
    localStorage.setItem("telegram-messages", JSON.stringify(messages))
    localStorage.setItem("telegram-media-items", JSON.stringify(mediaItems))
    localStorage.setItem("telegram-public-groups", JSON.stringify(availablePublicGroups))
  }, [accounts, chats, messages, mediaItems, availablePublicGroups])

  // Actions
  // Update the setActiveAccount function to properly sync all UI components
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

  const deleteMessage = (chatId: string, messageId: string) => {
    if (!messages[chatId]) return

    setMessages({
      ...messages,
      [chatId]: messages[chatId].filter((message) => message.id !== messageId),
    })
  }

  const addReaction = (chatId: string, messageId: string, emoji: string) => {
    if (!messages[chatId]) return

    setMessages({
      ...messages,
      [chatId]: messages[chatId].map((message) => {
        if (message.id === messageId) {
          const updatedReactions = { ...message.reactions }

          if (updatedReactions[emoji]) {
            updatedReactions[emoji] += 1
          } else {
            updatedReactions[emoji] = 1
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

  const removeReaction = (chatId: string, messageId: string, emoji: string) => {
    if (!messages[chatId]) return

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

  const markAllMessagesAsRead = (chatId: string) => {
    if (!messages[chatId]) return

    setMessages({
      ...messages,
      [chatId]: messages[chatId].map((message) => ({ ...message, isRead: true })),
    })

    // Update unread count in chat
    setChats(chats.map((chat) => (chat.id === chatId ? { ...chat, unread: 0 } : chat)))
  }

  const requestJoinGroup = (groupId: string) => {
    // For public groups, join immediately
    const group = availablePublicGroups.find((g) => g.id === groupId)

    if (!group) return

    if (group.privacy === "public") {
      // Add to user's chats
      const newChat = {
        ...group,
        accountId: activeAccount.id,
        joinStatus: "member" as const,
      }
      setChats([newChat, ...chats])

      // Initialize empty messages array
      setMessages({
        ...messages,
        [groupId]: [
          {
            id: `${groupId}-welcome`,
            sender: "System",
            senderId: "system",
            content: `Welcome to ${group.name}!`,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            avatar: "/placeholder.svg?height=40&width=40",
            reactions: {},
            isRead: true,
          },
        ],
      })

      // Remove from available groups
      setAvailablePublicGroups(
        availablePublicGroups.map((g) => (g.id === groupId ? { ...g, joinStatus: "member" } : g)),
      )
    } else {
      // For private groups, set status to pending
      const newChat = {
        ...group,
        accountId: activeAccount.id,
        joinStatus: "pending" as const,
      }
      setChats([newChat, ...chats])

      // Add pending message
      setMessages({
        ...messages,
        [groupId]: [
          {
            id: `${groupId}-pending`,
            sender: "System",
            senderId: "system",
            content: `You've requested to join this group. Waiting for admin approval.`,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            avatar: "/placeholder.svg?height=40&width=40",
            reactions: {},
            isRead: true,
          },
        ],
      })

      // Update status in available groups
      setAvailablePublicGroups(
        availablePublicGroups.map((g) => (g.id === groupId ? { ...g, joinStatus: "pending" } : g)),
      )
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
    setAvailablePublicGroups(availablePublicGroups.map((g) => (g.id === groupId ? { ...g, joinStatus: "none" } : g)))
  }

  const getPendingJoinRequests = () => {
    // Get all chats with pending join status
    return chats.filter((chat) => chat.joinStatus === "pending" && chat.accountId === activeAccount.id)
  }

  const value = {
    accounts,
    activeAccount,
    chats,
    activeChat,
    messages,
    mediaItems,
    activeMember,
    publicGroups: availablePublicGroups,
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

