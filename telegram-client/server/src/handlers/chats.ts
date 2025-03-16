import { Api } from "telegram"
import type { ClientStore } from "../types"

// Fetch dialogs (chats)
export async function getDialogs(activeClients: ClientStore, accountId: string, limit = 50) {
  const { client } = activeClients[accountId] || {}
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
            const entityId = dialog.id ? dialog.id.toString() : ""
            if (entityId) {
              const entity = await client.getEntity(entityId)
              if (entity && "status" in entity) {
                online = entity.status?._ === "userStatusOnline"
              }
            }
          } catch (err) {
            console.error("Error getting entity:", err)
          }
        }

        // Check if notifications are muted
        try {
          const settings = await client.invoke(
            new Api.account.GetNotifySettings({
              peer: new Api.InputNotifyPeer({
                peer: await client.getInputPeerById(dialog.id || 0),
              }),
            }),
          )
          muted = settings.muteUntil !== 0
        } catch (err) {
          console.error("Error getting notification settings:", err)
        }

        // Try to get a profile photo
        try {
          const entityId = dialog.id ? dialog.id.toString() : ""
          if (entityId) {
            const entity = await client.getEntity(entityId)
            if (entity && "photo" in entity && entity.photo) {
              try {
                // In a real implementation, you'd save this to a file and serve it
                // For now, we'll use a placeholder
                avatar = "/placeholder.svg?height=40&width=40"
              } catch (err) {
                console.error("Error downloading profile photo:", err)
              }
            }
          }
        } catch (err) {
          console.error("Error getting entity photo:", err)
        }

        return {
          id: dialog.id ? dialog.id.toString() : `unknown-${Date.now()}`,
          name: dialog.title,
          lastMessage: dialog.message?.message || "",
          time: dialog.message?.date ? new Date(dialog.message.date * 1000).toLocaleString() : "",
          unread: dialog.unreadCount || 0,
          avatar: avatar || "/placeholder.svg?height=40&width=40",
          online,
          type,
          muted,
          pinned: dialog.pinned || false,
          accountId,
          hasMentions: false, // Will be updated when mentions are detected
        }
      }),
    )

    return result
  } catch (error) {
    console.error("Error fetching dialogs:", error)
    throw error
  }
}

// Toggle chat mute status
export async function toggleMute(activeClients: ClientStore, accountId: string, chatId: string, mute = true) {
  const { client } = activeClients[accountId] || {}
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
export async function togglePin(activeClients: ClientStore, accountId: string, chatId: string, pin = true) {
  const { client } = activeClients[accountId] || {}
  if (!client) {
    throw new Error("Client not initialized")
  }

  try {
    const result = await client.invoke(
      new Api.messages.ToggleDialogPin({
        peer: new Api.InputDialogPeer({
          peer: await client.getInputPeerById(Number(chatId)),
        }),
        pinned: pin,
      }),
    )

    return result
  } catch (error) {
    console.error("Error toggling pin status:", error)
    throw error
  }
}

