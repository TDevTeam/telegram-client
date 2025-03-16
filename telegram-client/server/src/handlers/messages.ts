import { Api } from "telegram"
import type { ClientStore } from "../types"

// Fetch messages for a chat
export async function getMessages(activeClients: ClientStore, accountId: string, chatId: string, limit = 50) {
  const { client } = activeClients[accountId] || {}
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
            const entity = await client.getEntity(message.fromId.toString())
            if (entity && "photo" in entity && entity.photo) {
              // In a real implementation, you'd save this to a file and serve it
              // For now, we'll use a placeholder
              avatar = "/placeholder.svg?height=40&width=40"
            }
          } catch (err) {
            console.error("Error getting sender entity:", err)
          }
        }

        // Try to get reactions
        if (message.reactions) {
          try {
            const reactionsList = message.reactions.results || []
            reactions = reactionsList.reduce((acc: Record<string, number>, reaction: any) => {
              const emoji =
                reaction.reaction && reaction.reaction._ === "reactionEmoji" ? reaction.reaction.emoticon : "👍"
              acc[emoji] = (acc[emoji] || 0) + (reaction.count || 1)
              return acc
            }, {})
          } catch (err) {
            console.error("Error processing reactions:", err)
          }
        }

        return {
          id: message.id.toString(),
          sender: message.sender && "firstName" in message.sender ? message.sender.firstName : "Unknown",
          senderId: message.senderId?.toString() || "",
          content: message.message || "",
          time: message.date
            ? new Date(message.date * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "",
          avatar,
          reactions,
          isRead: !(
            message.media &&
            "document" in message.media &&
            message.media.document &&
            message.media.document.attributes &&
            message.media.document.attributes.some((attr: any) => attr.className === "DocumentAttributeUnread")
          ),
          replyTo: message.replyTo
            ? {
                id: message.replyTo.replyToMsgId ? message.replyTo.replyToMsgId.toString() : "0",
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
export async function sendMessage(activeClients: ClientStore, accountId: string, chatId: string, message: string) {
  const { client } = activeClients[accountId] || {}
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

// Mark messages as read
export async function markMessagesAsRead(
  activeClients: ClientStore,
  accountId: string,
  chatId: string,
  messageIds: string[],
) {
  const { client } = activeClients[accountId] || {}
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

