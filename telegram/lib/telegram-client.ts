import { TelegramClient } from "telegram"
import { StringSession } from "telegram/sessions"
import { NewMessage, type NewMessageEvent } from "telegram/events"
import { Api } from "telegram"

// Store for active clients
interface ClientStore {
  [accountId: string]: {
    client: TelegramClient
    session: StringSession
  }
}

const activeClients: ClientStore = {}

// Initialize a new client for an account
export async function initClient(accountId: string, apiId: string, apiHash: string, sessionString?: string) {
  try {
    // Convert apiId to number as required by TelegramClient
    const apiIdNum = Number.parseInt(apiId, 10)
    if (isNaN(apiIdNum)) {
      throw new Error("API ID must be a valid number")
    }

    // Create a proper StringSession with the provided string or empty string
    const session = new StringSession(sessionString || "")

    // Create the client with proper parameters
    const client = new TelegramClient(session, apiIdNum, apiHash, {
      connectionRetries: 5,
      useWSS: true, // Use WebSocket for browser environments
    })

    // Store the client and session
    activeClients[accountId] = {
      client,
      session,
    }

    // Connect the client (but don't start the login flow yet)
    await client.connect()
    console.log("Client connected successfully")

    // Set up event handlers
    setupUpdateHandlers(client, accountId)

    return {
      client,
      session,
      sessionString: session.save(),
    }
  } catch (error) {
    console.error("Error initializing Telegram client:", error)
    throw error
  }
}

// Start the login process with phone number
export async function startLogin(accountId: string, phoneNumber: string) {
  const { client } = activeClients[accountId] || {}
  if (!client) {
    throw new Error("Client not initialized")
  }

  try {
    // Start the login process
    const result = await client.sendCode({ apiId: client.apiId, apiHash: client.apiHash.toString() }, phoneNumber)

    return { phoneCodeHash: result.phoneCodeHash }
  } catch (error) {
    console.error("Error sending code:", error)
    throw error
  }
}

// Complete login with verification code
export async function completeLogin(accountId: string, phoneNumber: string, phoneCodeHash: string, code: string) {
  const { client, session } = activeClients[accountId] || {}
  if (!client) {
    throw new Error("Client not initialized")
  }

  try {
    // Try to sign in with the code
    let user
    try {
      user = await client.invoke(
        new Api.auth.SignIn({
          phoneNumber,
          phoneCodeHash,
          phoneCode: code,
        }),
      )
    } catch (error) {
      // Check if we need 2FA password
      if (error.message.includes("SESSION_PASSWORD_NEEDED")) {
        // Return a special response indicating 2FA is needed
        return {
          user: null,
          sessionString: null,
          requiresPassword: true,
        }
      }
      throw error
    }

    // Get the session string to save
    const sessionString = session.save()

    return {
      user,
      sessionString,
      requiresPassword: false,
    }
  } catch (error) {
    console.error("Error completing login:", error)
    throw error
  }
}

// Complete 2FA login with password
export async function complete2FALogin(accountId: string, password: string) {
  const { client, session } = activeClients[accountId] || {}
  if (!client) {
    throw new Error("Client not initialized")
  }

  try {
    // Get the password hint
    const passwordInfo = await client.invoke(new Api.account.GetPassword())

    // Check the password with the server
    const result = await client.invoke(
      new Api.auth.CheckPassword({
        password: await client.computePasswordCheck(passwordInfo, password),
      }),
    )

    // Get the session string to save
    const sessionString = session.save()

    return {
      user: result.user,
      sessionString,
    }
  } catch (error) {
    console.error("Error completing 2FA login:", error)
    throw error
  }
}

// Alternative login method using client.start() for a more streamlined approach
export async function loginWithStart(
  accountId: string,
  apiId: string,
  apiHash: string,
  phoneNumber: string,
  getPasswordCallback: () => Promise<string>,
  getCodeCallback: () => Promise<string>,
  sessionString?: string,
) {
  try {
    // Convert apiId to number
    const apiIdNum = Number.parseInt(apiId, 10)
    if (isNaN(apiIdNum)) {
      throw new Error("API ID must be a valid number")
    }

    // Create a proper StringSession
    const session = new StringSession(sessionString || "")

    // Create the client
    const client = new TelegramClient(session, apiIdNum, apiHash, {
      connectionRetries: 5,
      useWSS: true,
    })

    // Start the client with all callbacks
    await client.start({
      phoneNumber: async () => phoneNumber,
      password: async () => await getPasswordCallback(),
      phoneCode: async () => await getCodeCallback(),
      onError: (err) => console.log("Login error:", err),
    })

    console.log("Login successful")

    // Store the client and session
    activeClients[accountId] = {
      client,
      session,
    }

    // Set up event handlers
    setupUpdateHandlers(client, accountId)

    return {
      client,
      session,
      sessionString: session.save(),
    }
  } catch (error) {
    console.error("Error during login process:", error)
    throw error
  }
}

// Set up handlers for various updates from Telegram
function setupUpdateHandlers(client: TelegramClient, accountId: string) {
  // Listen for new messages
  client.addEventHandler(async (update: NewMessageEvent) => {
    // Dispatch custom event for new messages
    const event = new CustomEvent("telegram:update", {
      detail: {
        type: "new_message",
        accountId,
        update,
      },
    })
    document.dispatchEvent(event)
  }, new NewMessage({}))

  // Additional update handlers can be added here
  client.addEventHandler(async (update) => {
    // Handle any other update types
    console.log("Received update:", update)

    // Dispatch custom event to notify UI
    const event = new CustomEvent("telegram:update", {
      detail: {
        type: "general",
        accountId,
        update,
      },
    })
    document.dispatchEvent(event)
  })
}

// Get an existing client
export function getClient(accountId: string) {
  return activeClients[accountId]?.client
}

// Fetch dialogs (chats)
export async function getDialogs(accountId: string, limit = 50) {
  const client = getClient(accountId)
  if (!client) {
    throw new Error("Client not initialized")
  }

  try {
    const dialogs = await client.getDialogs({
      limit,
    })

    const result = await Promise.all(
      dialogs.map(async (dialog) => {
        let avatar = ""
        let online = false
        let type = "private"
        let muted = false

        // Determine chat type
        if (dialog.isChannel) {
          type = "channel"
        } else if (dialog.isGroup) {
          type = "group"
        } else {
          // For private chats, check if user is online
          try {
            const entity = await client.getEntity(dialog.id)
            if (entity.className === "User") {
              online = entity.status?.className === "UserStatusOnline"
            }
          } catch (err) {
            console.error("Error getting entity:", err)
          }
        }

        // Check if notifications are muted
        try {
          const settings = await client.invoke(
            new Api.account.GetNotifySettings({
              peer: await client.getInputEntity(dialog.id),
            }),
          )
          muted = settings.muteUntil !== 0
        } catch (err) {
          console.error("Error getting notification settings:", err)
        }

        // Try to get a profile photo
        try {
          const entity = await client.getEntity(dialog.id)
          if (entity.photo) {
            try {
              const photo = await client.downloadProfilePhoto(entity)
              if (photo) {
                const blob = new Blob([photo], { type: "image/jpeg" })
                avatar = URL.createObjectURL(blob)
              }
            } catch (err) {
              console.error("Error downloading profile photo:", err)
            }
          }
        } catch (err) {
          console.error("Error getting entity photo:", err)
        }

        return {
          id: dialog.id.toString(),
          name: dialog.title,
          lastMessage: dialog.message?.message || "",
          time: dialog.message?.date ? new Date(dialog.message.date * 1000).toLocaleString() : "",
          unread: dialog.unreadCount || 0,
          avatar: avatar || "/placeholder.svg?height=40&width=40",
          online,
          type,
          muted,
          pinned: dialog.pinned || false,
        }
      }),
    )

    return result
  } catch (error) {
    console.error("Error fetching dialogs:", error)
    throw error
  }
}

// Fetch messages for a chat
export async function getMessages(accountId: string, chatId: string, limit = 50) {
  const client = getClient(accountId)
  if (!client) {
    throw new Error("Client not initialized")
  }

  try {
    const messages = await client.getMessages(chatId, {
      limit,
    })

    const result = await Promise.all(
      messages.map(async (message) => {
        let avatar = "/placeholder.svg?height=40&width=40"
        let reactions = {}

        // Try to get sender photo
        if (message.fromId) {
          try {
            const entity = await client.getEntity(message.fromId)
            if (entity.photo) {
              try {
                const photo = await client.downloadProfilePhoto(entity)
                if (photo) {
                  const blob = new Blob([photo], { type: "image/jpeg" })
                  avatar = URL.createObjectURL(blob)
                }
              } catch (err) {
                console.error("Error downloading profile photo:", err)
              }
            }
          } catch (err) {
            console.error("Error getting sender entity:", err)
          }
        }

        // Try to get reactions
        if (message.reactions) {
          reactions = message.reactions.results.reduce((acc, reaction) => {
            const emoji = reaction.reaction.emoticon
            acc[emoji] = (acc[emoji] || 0) + reaction.count
            return acc
          }, {})
        }

        return {
          id: message.id.toString(),
          sender: message.sender?.firstName || "Unknown",
          senderId: message.senderId?.toString() || "",
          content: message.message || "",
          time: message.date
            ? new Date(message.date * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "",
          avatar,
          reactions,
          isRead: !message.media?.document?.attributes.some((attr) => attr.className === "DocumentAttributeUnread"),
          replyTo: message.replyTo
            ? {
                id: message.replyTo.replyToMsgId.toString(),
                content: "", // Need to fetch the actual message content separately
                sender: "", // Need to fetch the sender info separately
              }
            : undefined,
        }
      }),
    )

    return result
  } catch (error) {
    console.error("Error fetching messages:", error)
    throw error
  }
}

// Send a message
export async function sendMessage(accountId: string, chatId: string, message: string) {
  const client = getClient(accountId)
  if (!client) {
    throw new Error("Client not initialized")
  }

  try {
    const result = await client.sendMessage(chatId, {
      message,
    })

    return {
      id: result.id.toString(),
      date: result.date,
    }
  } catch (error) {
    console.error("Error sending message:", error)
    throw error
  }
}

// Send reaction to a message
export async function sendReaction(accountId: string, chatId: string, messageId: string, emoji: string) {
  const client = getClient(accountId)
  if (!client) {
    throw new Error("Client not initialized")
  }

  try {
    const result = await client.invoke(
      new Api.messages.SendReaction({
        peer: await client.getInputEntity(chatId),
        msgId: Number.parseInt(messageId),
        reaction: [new Api.ReactionEmoji({ emoticon: emoji })],
      }),
    )

    return result
  } catch (error) {
    console.error("Error sending reaction:", error)
    throw error
  }
}

// Remove reaction from a message
export async function removeReaction(accountId: string, chatId: string, messageId: string) {
  const client = getClient(accountId)
  if (!client) {
    throw new Error("Client not initialized")
  }

  try {
    const result = await client.invoke(
      new Api.messages.SendReaction({
        peer: await client.getInputEntity(chatId),
        msgId: Number.parseInt(messageId),
        reaction: [], // Empty array removes reactions
      }),
    )

    return result
  } catch (error) {
    console.error("Error removing reaction:", error)
    throw error
  }
}

// Listen for new messages
export function listenForNewMessages(accountId: string, callback: (event: NewMessageEvent) => void) {
  const client = getClient(accountId)
  if (!client) {
    throw new Error("Client not initialized")
  }

  client.addEventHandler(callback, new NewMessage({}))

  return () => {
    client.removeEventHandler(callback, new NewMessage({}))
  }
}

// Disconnect a client
export async function disconnectClient(accountId: string) {
  const client = getClient(accountId)
  if (client) {
    await client.disconnect()
    delete activeClients[accountId]
  }
}

// Disconnect all clients
export async function disconnectAllClients() {
  for (const accountId in activeClients) {
    await disconnectClient(accountId)
  }
}

// Get session data for user
export function getSessionData(accountId: string) {
  if (!activeClients[accountId]) {
    return null
  }

  return {
    sessionString: activeClients[accountId].session.save(),
  }
}

// Helper to download profile photo
async function downloadProfilePhoto(client: TelegramClient, entity: any) {
  try {
    const photo = await client.downloadProfilePhoto(entity)
    if (photo) {
      const blob = new Blob([photo], { type: "image/jpeg" })
      return URL.createObjectURL(blob)
    }
    return null
  } catch (error) {
    console.error("Error downloading profile photo:", error)
    return null
  }
}

// Mark messages as read
export async function markMessagesAsRead(accountId: string, chatId: string, messageIds: string[]) {
  const client = getClient(accountId)
  if (!client) {
    throw new Error("Client not initialized")
  }

  try {
    // First determine if this is a channel or regular chat
    const entity = await client.getEntity(chatId)

    if (entity.className === "Channel") {
      await client.invoke(
        new Api.channels.ReadHistory({
          channel: entity,
          maxId: Math.max(...messageIds.map((id) => Number.parseInt(id))),
        }),
      )
    } else {
      await client.invoke(
        new Api.messages.ReadHistory({
          peer: await client.getInputEntity(chatId),
          maxId: Math.max(...messageIds.map((id) => Number.parseInt(id))),
        }),
      )
    }

    return true
  } catch (error) {
    console.error("Error marking messages as read:", error)
    throw error
  }
}

// Toggle chat mute status
export async function toggleMute(accountId: string, chatId: string, mute = true) {
  const client = getClient(accountId)
  if (!client) {
    throw new Error("Client not initialized")
  }

  try {
    const result = await client.invoke(
      new Api.account.UpdateNotifySettings({
        peer: new Api.InputNotifyPeer({
          peer: await client.getInputEntity(chatId),
        }),
        settings: new Api.InputPeerNotifySettings({
          muteUntil: mute ? 2147483647 : 0, // Max int32 for "forever"
        }),
      }),
    )

    return result
  } catch (error) {
    console.error("Error toggling mute status:", error)
    throw error
  }
}

// Toggle chat pin status
export async function togglePin(accountId: string, chatId: string, pin = true) {
  const client = getClient(accountId)
  if (!client) {
    throw new Error("Client not initialized")
  }

  try {
    const result = await client.invoke(
      new Api.messages.ToggleDialogPin({
        peer: await client.getInputEntity(chatId),
        pinned: pin,
      }),
    )

    return result
  } catch (error) {
    console.error("Error toggling pin status:", error)
    throw error
  }
}

// Set typing status
export async function setTyping(accountId: string, chatId: string, typing = true) {
  const client = getClient(accountId)
  if (!client) {
    throw new Error("Client not initialized")
  }

  try {
    const result = await client.invoke(
      new Api.messages.SetTyping({
        peer: await client.getInputEntity(chatId),
        action: typing ? new Api.SendMessageTypingAction() : new Api.SendMessageCancelAction(),
      }),
    )

    return result
  } catch (error) {
    console.error("Error setting typing status:", error)
    throw error
  }
}

// Delete message
export async function deleteMessage(accountId: string, chatId: string, messageId: string) {
  const client = getClient(accountId)
  if (!client) {
    throw new Error("Client not initialized")
  }

  try {
    const result = await client.deleteMessages(chatId, [Number.parseInt(messageId)], { revoke: true })
    return result
  } catch (error) {
    console.error("Error deleting message:", error)
    throw error
  }
}

// Join a chat or channel
export async function joinChat(accountId: string, chatId: string) {
  const client = getClient(accountId)
  if (!client) {
    throw new Error("Client not initialized")
  }

  try {
    const entity = await client.getEntity(chatId)

    if (entity.className === "Channel") {
      await client.invoke(
        new Api.channels.JoinChannel({
          channel: entity,
        }),
      )
    } else {
      throw new Error("Can only join channels or groups")
    }

    return true
  } catch (error) {
    console.error("Error joining chat:", error)
    throw error
  }
}

// Get chat media
export async function getChatMedia(accountId: string, chatId: string, limit = 30) {
  const client = getClient(accountId)
  if (!client) {
    throw new Error("Client not initialized")
  }

  try {
    const result = await client.invoke(
      new Api.messages.Search({
        peer: await client.getInputEntity(chatId),
        q: "",
        filter: new Api.InputMessagesFilterPhotoVideo(),
        minDate: 0,
        maxDate: 0,
        offsetId: 0,
        addOffset: 0,
        limit,
        maxId: 0,
        minId: 0,
        hash: 0,
      }),
    )

    const mediaItems = await Promise.all(
      result.messages.map(async (message) => {
        let url = null
        let type = "unknown"
        let name = ""
        let size = ""

        if (message.media) {
          if (message.media.photo) {
            type = "photo"
            try {
              const file = await client.downloadMedia(message.media)
              if (file) {
                const blob = new Blob([file], { type: "image/jpeg" })
                url = URL.createObjectURL(blob)
                size = `${Math.round(blob.size / 1024)} KB`
              }
            } catch (err) {
              console.error("Error downloading photo:", err)
            }
          } else if (message.media.document) {
            const doc = message.media.document
            const fileAttr = doc.attributes.find((attr) => attr.className === "DocumentAttributeFilename")
            name = fileAttr ? fileAttr.fileName : `File_${doc.id}`
            size = `${Math.round(doc.size / 1024)} KB`

            // Check if it's a video
            if (doc.mimeType.startsWith("video/")) {
              type = "video"
            } else if (doc.mimeType.startsWith("audio/")) {
              type = "audio"
            } else {
              type = "document"
            }

            try {
              const file = await client.downloadMedia(message.media)
              if (file) {
                const blob = new Blob([file], { type: doc.mimeType })
                url = URL.createObjectURL(blob)
              }
            } catch (err) {
              console.error("Error downloading media:", err)
            }
          }
        }

        return {
          id: message.id.toString(),
          type,
          url,
          name,
          title: name,
          size,
          date: message.date ? new Date(message.date * 1000).toLocaleString() : "",
        }
      }),
    )

    return mediaItems.filter((item) => item.url) // Only return items that were successfully downloaded
  } catch (error) {
    console.error("Error getting chat media:", error)
    throw error
  }
}

// Forward messages
export async function forwardMessages(accountId: string, fromChatId: string, toChatId: string, messageIds: string[]) {
  const client = getClient(accountId)
  if (!client) {
    throw new Error("Client not initialized")
  }

  try {
    const result = await client.invoke(
      new Api.messages.ForwardMessages({
        fromPeer: await client.getInputEntity(fromChatId),
        toPeer: await client.getInputEntity(toChatId),
        id: messageIds.map((id) => Number.parseInt(id)),
        silent: false,
        background: false,
        withMyScore: false,
        dropAuthor: false,
        dropMediaCaptions: false,
      }),
    )

    return result
  } catch (error) {
    console.error("Error forwarding messages:", error)
    throw error
  }
}

