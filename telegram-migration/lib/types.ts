export interface Account {
  id: string
  username: string
  status: "online" | "offline" | "connecting"
  lastActive?: string
  session?: string // For storing Telegram session string
  phoneNumber?: string
}

export interface Message {
  id: string
  content: string
  sender: "user" | "bot" | "system"
  timestamp: string
  accountId: string
}

export type ConnectionStatus = "connected" | "connecting" | "disconnected"

export interface TelegramConfig {
  apiId: number
  apiHash: string
}

