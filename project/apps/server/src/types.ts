import { TelegramClient } from "telegram"

export interface ClientStore {
  [accountId: string]: {
    client: TelegramClient
    session: string
  }
}

export interface Message {
  id: string;
  text: string;
  isFromMe: boolean;
  timestamp: number;
  media?: string;
  sender?: {
    id: string;
    name: string;
    avatar?: string;
  };
  replyTo?: string;
  edited?: boolean;
  forwarded?: boolean;
}

export interface Account {
  id: string;
  displayName: string;
  isOnline: boolean;
  avatar?: string;
  phoneNumber: string;
  unreadCount: number;
  lastSeen?: Date;
}

export interface Chat {
  id: string;
  title: string;
  unreadCount: number;
  lastMessage?: Message;
  isGroup: boolean;
  avatar?: string;
  permissions?: ChatPermissions;
  cooldown?: number;
  participants?: ChatParticipant[];
  muted?: boolean;
}

export interface ChatPermissions {
  canSendMessages: boolean;
  canSendMedia: boolean;
  canInviteUsers: boolean;
  canPinMessages: boolean;
}

export interface ChatParticipant {
  id: string;
  name: string;
  avatar?: string;
  role: "admin" | "member" | "creator";
} 