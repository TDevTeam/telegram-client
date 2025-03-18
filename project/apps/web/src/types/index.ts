export interface Account {
  id: string;
  displayName: string;
  avatar?: string;
  isOnline: boolean;
}

export interface Message {
  id: string;
  text: string;
  fromMe: boolean;
  timestamp: number;
}