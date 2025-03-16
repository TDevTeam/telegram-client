import type { ClientStore } from "../types"
import { NewMessage } from "telegram/events"

// Set up handlers for various updates from Telegram
export function setupUpdateHandlers(client: any, accountId: string, activeClients: ClientStore) {
  // Listen for new messages
  client.addEventHandler(async (update: any) => {
    try {
      const message = update.message

      // Skip outgoing messages
      if (message.out) return

      // Get chat info
      const chat = await message.getChat()
      const sender = await message.getSender()

      // Format the message
      const formattedMessage = {
        id: message.id.toString(),
        sender: sender ? sender.firstName || sender.username || "Unknown" : "Unknown",
        senderId: sender ? sender.id.toString() : "",
        content: message.message || "",
        time: message.date
          ? new Date(message.date * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
        avatar: "/placeholder.svg?height=40&width=40", // Default avatar
        reactions: {},
        isRead: false,
      }

      // Format the chat
      const chatId = chat.id.toString()
      const chatUpdate = {
        id: chatId,
        name: chat.title || (sender ? sender.firstName || sender.username || "Unknown" : "Unknown"),
        lastMessage: message.message || "",
        time: message.date ? new Date(message.date * 1000).toLocaleString() : "",
        unread: 1, // Increment in the frontend
        accountId,
      }

      // Check for mentions
      const username = await client.getMe().then((me: any) => me.username)
      const hasMention = username && message.message && message.message.includes(`@${username}`)

      // Broadcast to all connected clients for this account
      broadcastToAccount(activeClients, accountId, {
        type: "new_message",
        accountId,
        chatId,
        message: formattedMessage,
        chat: chatUpdate,
        hasMention,
      })

      // If there's a mention, send a special mention notification
      if (hasMention) {
        broadcastToAccount(activeClients, accountId, {
          type: "mention",
          accountId,
          chatId,
          messageId: message.id.toString(),
        })
      }
    } catch (error) {
      console.error("Error handling new message:", error)
    }
  }, new NewMessage({}))

  // Additional update handlers can be added here
  client.addEventHandler(async (update: any) => {
    // Handle any other update types
    console.log("Received update:", update)
  })
}

// Broadcast a message to all connections for an account
export function broadcastToAccount(activeClients: ClientStore, accountId: string, data: any) {
  const accountData = activeClients[accountId]
  if (!accountData) return

  accountData.connections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  })
}

