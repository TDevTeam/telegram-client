import type { WebSocket } from "ws"
import type { TelegramClient } from "telegram"
import type { StringSession } from "telegram/sessions"

// WebSocket with additional properties
export interface ExtendedWebSocket extends WebSocket {
  accountId?: string
  isAlive?: boolean
}

// Store for active clients
export interface ClientStore {
  [accountId: string]: {
    client: TelegramClient
    session: StringSession
    connections: Set<ExtendedWebSocket>
  }
}

// Chat type
export interface Chat {
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
  accountId?: string
  hasMentions?: boolean
}

// Message type
export interface Message {
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

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  error?: string
  data?: T
}

export interface ChatsResponse extends ApiResponse {
  chats: Chat[]
}

export interface MessagesResponse extends ApiResponse {
  messages: Message[]
}

export interface InitResponse extends ApiResponse {
  sessionString?: string
  hasSession: boolean
}

export interface LoginResponse extends ApiResponse {
  phoneCodeHash?: string
  requiresPassword?: boolean
  sessionString?: string
  user?: any
}

// Telegram API types
export interface TelegramUser {
  id: string
  firstName?: string
  lastName?: string
  username?: string
  phone?: string
}

export interface TelegramPasswordInfo {
  // Add properties as needed
  [key: string]: any
}

export interface TelegramAuthResult {
  user: TelegramUser
  [key: string]: any
}

