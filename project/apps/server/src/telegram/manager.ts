import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage, NewMessageEvent } from "telegram/events";
import { config } from "../config";
import bigInt from "big-integer";

interface Account {
  id: string;
  displayName: string;
  isOnline: boolean;
  avatar?: string;
  client: TelegramClient;
  phoneNumber: string;
  unreadCount: number;
  lastSeen?: Date;
  session: StringSession;
  notificationSettings: Map<string, NotificationSettings>;
}

interface Chat {
  id: string;
  title: string;
  unreadCount: number;
  lastMessage?: Message;
  lastMessageDate?: Date;
  isGroup: boolean;
  avatar?: string;
  pinnedMessage?: Message;
  notificationSettings: NotificationSettings;
}

interface Message {
  id: string;
  text: string;
  fromId: string;
  fromMe: boolean;
  timestamp: number;
  media?: MediaInfo;
  replyTo?: Message;
  forwards?: number;
  edited?: boolean;
  reactions?: Reaction[];
}

interface MediaInfo {
  type: 'photo' | 'video' | 'document' | 'voice' | 'sticker';
  url?: string;
  thumbnail?: string;
  fileName?: string;
  mimeType?: string;
  duration?: number;
}

interface Reaction {
  emoji: string;
  count: number;
  chosenByMe: boolean;
}

interface NotificationSettings {
  muted: boolean;
  muteUntil?: Date;
  sound: boolean;
  showPreviews: boolean;
}

interface PendingAuth {
  phoneCodeHash: string;
  tempSession: StringSession;
}

interface Dialog {
  id: bigInt.BigInteger;
  title: string;
  unreadCount: number;
  message?: {
    message: string;
    date: number;
  };
  isGroup: boolean;
  photo?: any;
}

// Add Event Emitter functionality to the class
type EventCallback = (data: any) => void;

export class TelegramManager {
  private accounts: Map<string, Account>;
  private messages: Map<string, Map<string, Message[]>>;
  private chats: Map<string, Chat[]>;
  private typingUsers: Map<string, Map<string, Set<string>>>;
  private pendingAuth: Map<string, PendingAuth>;
  private eventHandlers: Map<string, EventCallback[]>;

  constructor() {
    this.accounts = new Map();
    this.messages = new Map();
    this.chats = new Map();
    this.typingUsers = new Map();
    this.pendingAuth = new Map();
    this.eventHandlers = new Map();
    this.loadAccounts();
  }

  // Custom event emitter methods
  public on(event: string, callback: EventCallback): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(callback);
    this.eventHandlers.set(event, handlers);
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }

  private async loadAccounts(): Promise<void> {
    try {
      // Placeholder for loading accounts from persistence
      const accounts: { token: string }[] = [];
      
      for (const account of accounts) {
        await this.addAccount(account);
      }
    } catch (error) {
      console.error("Failed to load accounts:", error);
    }
  }

  private async addAccount(accountData: { token: string }): Promise<void> {
    const session = new StringSession(accountData.token);
    const client = new TelegramClient(
      session,
      config.API_ID,
      config.API_HASH,
      {
        connectionRetries: 5,
        retryDelay: 1000,
        useWSS: true,
      }
    );

    try {
      await client.connect();
      const me = await client.getMe();

      if (!me) {
        throw new Error("Failed to get user info");
      }

      const account: Account = {
        id: me.id.toString(),
        displayName: me.username || me.firstName || "Unknown",
        isOnline: true,
        client,
        unreadCount: 0,
        phoneNumber: me.phone || "Unknown",
        session,
        notificationSettings: new Map(),
        avatar: me.photo ? await this.getProfilePhoto(client, me.id.toString()) : undefined
      };

      this.accounts.set(account.id, account);
      this.messages.set(account.id, new Map());
      this.typingUsers.set(account.id, new Map());

      await this.setupEventHandlers(account);
      await this.loadChats(account);

      console.log(`Added account: ${account.displayName}`);
    } catch (error) {
      console.error("Failed to connect account:", error);
      throw error;
    }
  }

  public async startAuthentication(phoneNumber: string): Promise<{ phoneCodeHash: string }> {
    const session = new StringSession("");
    const client = new TelegramClient(
      session,
      config.API_ID,
      config.API_HASH,
      {
        connectionRetries: 5,
        retryDelay: 1000,
        useWSS: true,
      }
    );

    try {
      await client.connect();
      const result = await client.sendCode({
        apiId: config.API_ID,
        apiHash: config.API_HASH,
        phoneNumber,
      });

      this.pendingAuth.set(phoneNumber, { phoneCodeHash: result.phoneCodeHash, tempSession: session });
      return { phoneCodeHash: result.phoneCodeHash };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to start authentication: ${error.message}`);
      }
      throw new Error("Failed to start authentication");
    }
  }

  public async verifyCode(phoneNumber: string, phoneCode: string, phoneCodeHash: string): Promise<{ requires2FA: boolean }> {
    const pendingAuth = this.pendingAuth.get(phoneNumber);
    if (!pendingAuth) {
      throw new Error("No pending authentication found");
    }

    try {
      const { tempSession } = pendingAuth;
      const client = new TelegramClient(
        tempSession,
        config.API_ID,
        config.API_HASH,
        { connectionRetries: 5 }
      );

      await client.connect();
      
      try {
        const user = await client.invoke(new Api.auth.SignIn({
          phoneNumber,
          phoneCodeHash,
          phoneCode
        }));
        
        await this.finalizeAuthentication(client, phoneNumber);
        return { requires2FA: false };
      } catch (error: any) {
        if (error.errorMessage === 'SESSION_PASSWORD_NEEDED') {
          return { requires2FA: true };
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to verify code: ${error.message}`);
      }
      throw new Error("Failed to verify code");
    }
  }

  public async submit2FA(phoneNumber: string, password: string): Promise<void> {
    const pendingAuth = this.pendingAuth.get(phoneNumber);
    if (!pendingAuth) {
      throw new Error("No pending authentication found");
    }

    try {
      const { tempSession } = pendingAuth;
      const client = new TelegramClient(
        tempSession,
        config.API_ID,
        config.API_HASH,
        { connectionRetries: 5 }
      );

      await client.connect();
      
      // Get the 2FA configuration
      const passwordInfo = await client.invoke(new Api.account.GetPassword());
      
      // Calculate the 2FA hash
      const { srpId, A, M1 } = await client.computeSRP(passwordInfo, password);
      
      // Complete 2FA authentication
      await client.invoke(new Api.auth.CheckPassword({
        passwordSrp: new Api.InputCheckPasswordSRP({
          srpId,
          A,
          M1
        })
      }));
      
      await this.finalizeAuthentication(client, phoneNumber);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to verify 2FA: ${error.message}`);
      }
      throw new Error("Failed to verify 2FA");
    }
  }

  private async finalizeAuthentication(client: TelegramClient, phoneNumber: string): Promise<void> {
    const me = await client.getMe();
    if (!me) {
      throw new Error("Failed to get user info");
    }

    const account: Account = {
      id: me.id.toString(),
      displayName: me.username || me.firstName || "Unknown",
      isOnline: true,
      client,
      phoneNumber,
      unreadCount: 0,
      session: client.session as StringSession,
      notificationSettings: new Map(),
      avatar: me.photo ? await this.getProfilePhoto(client, me.id.toString()) : undefined
    };

    this.accounts.set(account.id, account);
    this.messages.set(account.id, new Map());
    this.typingUsers.set(account.id, new Map());

    await this.setupEventHandlers(account);
    await this.loadChats(account);
    this.pendingAuth.delete(phoneNumber);
    await this.saveAccounts();
  }

  private async getProfilePhoto(client: TelegramClient, userId: string): Promise<string | undefined> {
    try {
      // Get user's profile photos using invoke
      const photos = await client.invoke(new Api.photos.GetUserPhotos({
        userId,
        limit: 1,
        offset: 0,
        maxId: 0
      }));
      
      if (photos && photos.photos && photos.photos.length > 0) {
        // Download the photo
        const buffer = await client.downloadFile({
          inputLocation: new Api.InputPhotoFileLocation({
            id: photos.photos[0].id,
            accessHash: photos.photos[0].accessHash,
            fileReference: photos.photos[0].fileReference,
            thumbSize: 'x'
          }),
          dcId: photos.photos[0].dcId
        });
        
        // Convert to base64
        if (buffer instanceof Buffer) {
          return `data:image/jpeg;base64,${buffer.toString('base64')}`;
        }
      }
      
      return undefined;
    } catch (error) {
      console.error("Failed to get profile photo:", error);
      return undefined;
    }
  }

  private async loadChats(account: Account): Promise<void> {
    try {
      const dialogs = await account.client.getDialogs();
      const chats: Chat[] = [];

      for (const dialog of dialogs) {
        const chat: Chat = {
          id: dialog.id.toString(),
          title: dialog.title || dialog.name || "Unknown",
          unreadCount: dialog.unreadCount || 0,
          lastMessage: dialog.message ? {
            id: "0",
            text: dialog.message.message || "",
            fromId: "", 
            fromMe: false,
            timestamp: (dialog.message.date || Math.floor(Date.now() / 1000)) * 1000
          } : undefined,
          lastMessageDate: dialog.message?.date ? new Date(dialog.message.date * 1000) : undefined,
          isGroup: Boolean(dialog.isGroup || dialog.isChannel),
          avatar: undefined, // We'll fetch this separately if needed
          notificationSettings: {
            muted: false,
            sound: true,
            showPreviews: true
          }
        };
        chats.push(chat);
      }

      this.chats.set(account.id, chats);
    } catch (error) {
      console.error("Failed to load chats:", error);
      throw error;
    }
  }

  private async setupEventHandlers(account: Account): Promise<void> {
    // Handle new messages
    account.client.addEventHandler((event: NewMessageEvent) => {
      const message = event.message;
      const chatId = message.chatId?.toString() || message.peerId?.toString();
      
      if (!chatId) return;
      
      const chatMessages = this.messages.get(account.id)?.get(chatId) || [];
      
      this.processMessage(account.client, message)
        .then(newMessage => {
          chatMessages.push(newMessage);
          
          const accountMessages = this.messages.get(account.id) || new Map();
          accountMessages.set(chatId, chatMessages);
          this.messages.set(account.id, accountMessages);
          
          const chats = this.chats.get(account.id) || [];
          const chat = chats.find(c => c.id === chatId);
          if (chat) {
            chat.lastMessage = newMessage;
            chat.lastMessageDate = new Date(newMessage.timestamp);
            chat.unreadCount++;
            this.handleNotification(account, chat, newMessage);
          }

          // Emit the event to connected clients
          this.emit("newMessage", {
            accountId: account.id,
            chatId,
            message: newMessage
          });
        })
        .catch(error => console.error("Failed to process message:", error));
    }, new NewMessage({}));

    // For user status and typing updates, we'll use raw event handling
    account.client.addEventHandler(async (update) => {
      try {
        // Handle user status updates
        if (update instanceof Api.UpdateUserStatus) {
          const userId = update.userId.toString();
          const wasOnline = update.status instanceof Api.UserStatusOnline
            ? Date.now() / 1000
            : update.status instanceof Api.UserStatusOffline
              ? update.status.wasOnline
              : null;

          if (wasOnline) {
            this.emit("userOnlineStatus", {
              accountId: account.id,
              userId,
              wasOnline: wasOnline * 1000 // Convert to milliseconds
            });
          }
        }
        
        // Handle typing updates
        else if (update instanceof Api.UpdateChatUserTyping || 
                 update instanceof Api.UpdateUserTyping) {
          const chatId = 'chatId' in update ? update.chatId.toString() : 
                        'userId' in update ? update.userId.toString() : null;
          const userId = update.userId?.toString();
          
          if (chatId && userId) {
            const isTyping = true; // The update indicates typing is happening
            
            // Update our internal tracking
            const chatTyping = this.typingUsers.get(account.id)?.get(chatId) || new Set();
            if (isTyping) {
              chatTyping.add(userId);
            } else {
              chatTyping.delete(userId);
            }

            const accountTyping = this.typingUsers.get(account.id) || new Map();
            accountTyping.set(chatId, chatTyping);
            this.typingUsers.set(account.id, accountTyping);
            
            // Clear typing after 5 seconds
            setTimeout(() => {
              const chatTyping = this.typingUsers.get(account.id)?.get(chatId);
              if (chatTyping) {
                chatTyping.delete(userId);
                
                this.emit("userTyping", {
                  accountId: account.id,
                  chatId,
                  userId,
                  isTyping: false
                });
              }
            }, 5000);
            
            // Emit typing event
            this.emit("userTyping", {
              accountId: account.id,
              chatId,
              userId,
              isTyping
            });
          }
        }
      } catch (error) {
        console.error("Error handling update:", error);
      }
    });
  }

  private async processMessage(client: TelegramClient, message: any): Promise<Message> {
    let media;
    try {
      media = message.media ? await this.processMedia(client, message.media) : undefined;
    } catch (error) {
      console.error("Error processing media:", error);
    }
    
    let replyTo;
    try {
      replyTo = message.replyTo ? await this.getMessageById(client, message.chat?.id?.toString() || message.peerId?.toString(), message.replyTo.replyToMsgId?.toString()) : undefined;
    } catch (error) {
      console.error("Error processing reply:", error);
    }

    const fromId = message.fromId?.toString() || message.senderId?.toString() || "";
    
    return {
      id: message.id.toString(),
      text: message.message || "",
      fromId,
      fromMe: fromId === client.session.save().split(":")[0],
      timestamp: (message.date || Math.floor(Date.now() / 1000)) * 1000,
      media,
      replyTo,
      forwards: message.forwards || 0,
      edited: Boolean(message.editDate),
      reactions: await this.processReactions(message)
    };
  }

  private async processMedia(client: TelegramClient, media: any): Promise<MediaInfo | undefined> {
    try {
      let type: MediaInfo['type'] = 'document';
      let mimeType = '';
      
      if (media instanceof Api.MessageMediaPhoto) {
        type = 'photo';
      } else if (media instanceof Api.MessageMediaDocument && media.document) {
        // Check document attributes to determine type
        const document = media.document;
        if (document.attributes) {
          for (const attr of document.attributes) {
            if (attr instanceof Api.DocumentAttributeVideo) {
              type = 'video';
              break;
            } else if (attr instanceof Api.DocumentAttributeAudio) {
              type = 'voice';
              break;
            } else if (attr instanceof Api.DocumentAttributeSticker) {
              type = 'sticker';
              break;
            }
          }
        }
        
        if (document.mimeType) {
          mimeType = document.mimeType;
        }
      }

      // For simplicity, we'll just return the type without downloading
      return {
        type,
        mimeType,
        fileName: undefined, // Would need to extract from attributes
        duration: undefined  // Would need to extract from attributes
      };
    } catch (error) {
      console.error("Failed to process media:", error);
      return undefined;
    }
  }

  private async processReactions(message: any): Promise<Reaction[]> {
    if (!message.reactions || !message.reactions.results) return [];

    return message.reactions.results.map((reaction: any) => ({
      emoji: reaction.reaction || "👍",
      count: reaction.count || 1,
      chosenByMe: Boolean(reaction.chosenByMe)
    }));
  }

  private async getMessageById(client: TelegramClient, chatId: string | undefined, messageId: string | undefined): Promise<Message | undefined> {
    if (!chatId || !messageId) return undefined;
    
    try {
      const result = await client.invoke(new Api.messages.GetMessages({
        id: [parseInt(messageId, 10)]
      }));
      
      if (result.messages && result.messages.length > 0) {
        return this.processMessage(client, result.messages[0]);
      }
      return undefined;
    } catch (error) {
      console.error("Failed to get message by ID:", error);
      return undefined;
    }
  }

  public async sendMessage(accountId: string, chatId: string, text: string, replyToId?: string): Promise<Message> {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    try {
      // Set typing status
      try {
        await account.client.invoke(new Api.messages.SetTyping({
          peer: await account.client.getInputEntity(chatId),
          action: new Api.SendMessageTypingAction()
        }));
      } catch (error) {
        console.error("Failed to set typing status:", error);
      }

      // Simulate typing delay
      await new Promise(resolve => setTimeout(resolve, Math.min(text.length * 50, 2000)));

      // Send the message
      const params: any = {
        message: text
      };
      
      if (replyToId) {
        params.replyTo = parseInt(replyToId, 10);
      }
      
      const result = await account.client.sendMessage(
        chatId,
        params
      );

      const message = await this.processMessage(account.client, result);
      const chatMessages = this.messages.get(accountId)?.get(chatId) || [];
      chatMessages.push(message);

      const accountMessages = this.messages.get(accountId) || new Map();
      accountMessages.set(chatId, chatMessages);
      this.messages.set(accountId, accountMessages);

      return message;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to send message: ${error.message}`);
      }
      throw new Error("Failed to send message");
    }
  }

  public async markAsRead(accountId: string, chatId: string): Promise<void> {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    try {
      await account.client.invoke(new Api.messages.ReadHistory({
        peer: await account.client.getInputEntity(chatId),
        maxId: 0
      }));
      
      const chats = this.chats.get(accountId) || [];
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        chat.unreadCount = 0;
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to mark as read: ${error.message}`);
      }
      throw new Error("Failed to mark as read");
    }
  }

  public async removeAccount(accountId: string): Promise<void> {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    try {
      await account.client.disconnect();
      this.accounts.delete(accountId);
      this.messages.delete(accountId);
      this.chats.delete(accountId);
      this.typingUsers.delete(accountId);
      await this.saveAccounts();
    } catch (error) {
      console.error("Failed to remove account:", error);
      throw error;
    }
  }

  public async setTyping(accountId: string, chatId: string): Promise<void> {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    try {
      await account.client.invoke(new Api.messages.SetTyping({
        peer: await account.client.getInputEntity(chatId),
        action: new Api.SendMessageTypingAction()
      }));
    } catch (error) {
      console.error("Failed to set typing status:", error);
      throw error;
    }
  }

  public async deleteMessages(accountId: string, chatId: string, messageIds: string[]): Promise<void> {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    try {
      const ids = messageIds.map(id => parseInt(id, 10));
      await account.client.invoke(new Api.messages.DeleteMessages({
        id: ids,
        revoke: true
      }));
      
      // Update local state
      const chatMessages = this.messages.get(accountId)?.get(chatId) || [];
      const updatedMessages = chatMessages.filter(message => !messageIds.includes(message.id));
      
      const accountMessages = this.messages.get(accountId) || new Map();
      accountMessages.set(chatId, updatedMessages);
      this.messages.set(accountId, accountMessages);
    } catch (error) {
      console.error("Failed to delete messages:", error);
      throw error;
    }
  }

  public async updateNotificationSettings(accountId: string, chatId: string, settings: NotificationSettings): Promise<void> {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    try {
      // Update notification settings in Telegram
      await account.client.invoke(new Api.account.UpdateNotifySettings({
        peer: new Api.InputNotifyPeer({
          peer: await account.client.getInputEntity(chatId)
        }),
        settings: new Api.InputPeerNotifySettings({
          muteUntil: settings.muted ? (settings.muteUntil ? Math.floor(settings.muteUntil.getTime() / 1000) : 2147483647) : 0,
          showPreviews: settings.showPreviews,
          silent: !settings.sound
        })
      }));
      
      // Update local state
      account.notificationSettings.set(chatId, settings);
      
      // Update chat notification settings
      const chats = this.chats.get(accountId) || [];
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        chat.notificationSettings = settings;
      }
    } catch (error) {
      console.error("Failed to update notification settings:", error);
      throw error;
    }
  }

  public async getChatHistory(accountId: string, chatId: string, limit = 50, offsetId = 0): Promise<Message[]> {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    try {
      const messages: Message[] = [];
      // Get message history from Telegram API
      const history = await account.client.getMessages(chatId, {
        limit,
        offsetId: offsetId ? parseInt(offsetId.toString(), 10) : 0
      });
      
      // Process each message
      for (const message of history) {
        const processedMessage = await this.processMessage(account.client, message);
        messages.push(processedMessage);
      }
      
      // Update local cache
      const chatMessages = this.messages.get(accountId)?.get(chatId) || [];
      const newMessages = messages.filter(m => !chatMessages.some(cm => cm.id === m.id));
      chatMessages.push(...newMessages);
      chatMessages.sort((a, b) => a.timestamp - b.timestamp);
      
      const accountMessages = this.messages.get(accountId) || new Map();
      accountMessages.set(chatId, chatMessages);
      this.messages.set(accountId, accountMessages);
      
      return messages;
    } catch (error) {
      console.error("Failed to get chat history:", error);
      throw error;
    }
  }

  public async sendMedia(accountId: string, chatId: string, mediaType: string, mediaData: string | Buffer, caption?: string): Promise<Message> {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    try {
      const params: any = {
        file: mediaData instanceof Buffer ? mediaData : Buffer.from(mediaData), 
        caption: caption || ''
      };
      
      let result;
      if (mediaType === 'photo') {
        result = await account.client.sendFile(chatId, params);
      } else if (mediaType === 'video') {
        params.videoNote = true;
        result = await account.client.sendFile(chatId, params);
      } else if (mediaType === 'document') {
        params.force_document = true;
        result = await account.client.sendFile(chatId, params);
      } else if (mediaType === 'voice') {
        params.voice = true;
        result = await account.client.sendFile(chatId, params);
      } else {
        throw new Error(`Unsupported media type: ${mediaType}`);
      }

      const message = await this.processMessage(account.client, result);
      return message;
    } catch (error) {
      console.error("Failed to send media:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to send media: ${error.message}`);
      }
      throw new Error("Failed to send media");
    }
  }

  public getAccounts(): Omit<Account, 'client' | 'session' | 'notificationSettings'>[] {
    return Array.from(this.accounts.values()).map(({ client, session, notificationSettings, ...account }) => account);
  }

  public getChats(accountId: string): Chat[] {
    return this.chats.get(accountId) || [];
  }

  private async saveAccounts(): Promise<void> {
    const accountData = Array.from(this.accounts.values()).map(account => ({
      phoneNumber: account.phoneNumber,
      session: account.session.save()
    }));
    // Implementation for saving to secure storage would go here
    console.log("Accounts saved", accountData.length);
  }

  private async handleNotification(account: Account, chat: Chat, message: Message): Promise<void> {
    const settings = chat.notificationSettings;
    if (settings.muted) return;
    if (settings.muteUntil && settings.muteUntil > new Date()) return;

    // Emit notification event
    this.emit("notification", {
      accountId: account.id,
      chatId: chat.id,
      message: {
        id: message.id,
        text: message.text,
        fromId: message.fromId,
        timestamp: message.timestamp
      },
      chat: {
        id: chat.id,
        title: chat.title,
        avatar: chat.avatar
      }
    });
  }
}
