export interface Account {
  id: string;
  phone: string;
  firstName: string;
  lastName?: string;
  username?: string;
  photo?: string;
}

export interface Dialog {
  id: string;
  title: string;
  type: 'channel' | 'group' | 'chat';
  unreadCount: number;
  lastMessage?: {
    id: string;
    text: string;
    date: number;
  };
  photo?: string;
}

export interface Message {
  id: string;
  text: string;
  sender: {
    id: string;
    name: string;
  };
  date: number;
  isRead: boolean;
  replyTo?: {
    id: string;
    text: string;
  };
}

export interface WebSocketMessage {
  type: 'new_message' | 'message_read' | 'typing';
  accountId: string;
  message?: Message;
  messageId?: string;
  chatId?: string;
} 