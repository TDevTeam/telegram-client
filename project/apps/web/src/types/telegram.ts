export interface Account {
    id: string
    displayName: string
    phoneNumber: string
    avatar?: string
    isOnline: boolean
    unreadCount?: number
    setupStatus: "initializing" | "connecting" | "ready" | "error"
    setupError?: string
  }
  
  export interface Chat {
    id: string
    title: string
    avatar?: string
    isGroup: boolean
    isSupergroup: boolean
    unreadCount?: number
    lastMessage?: Message
    cooldown?: number
    permissions?: {
      canSendMessages: boolean
    }
    notificationSettings?: NotificationSettings
  }
  
  export interface Message {
    id: string
    text?: string
    timestamp: number
    isFromMe: boolean
    sender?: {
      id: string
      name: string
      avatar?: string
    }
    readState?: {
      isRead: boolean
    }
    edited?: boolean
    forwarded?: boolean
    replyTo?: string
    media?: {
      type: "photo" | "video" | "audio" | "voice" | "document"
      url?: string
      mimeType?: string
      fileName?: string
    }
    sticker?: {
      id: string
      emoji?: string
      thumbnail?: string
    }
  }
  
  export interface NavigationTarget {
    accountId: string
    chatId: string
    notificationIndex?: number
  }
  
  export interface NotificationSettings {
    muted: boolean
    muteUntil?: number
  }
  
  export interface PaginationResult<T> {
    items: T[]
    hasMore: boolean
    nextCursor?: string
  }
  
  