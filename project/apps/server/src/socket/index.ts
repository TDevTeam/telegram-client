import { Server, Socket } from "socket.io"
import { Api } from "telegram"
import type { ClientStore } from "../types"

export function setupSocketHandlers(io: Server, activeClients: ClientStore) {
  io.on("connection", (socket: Socket) => {
    // Add toggle mute handler
    socket.on("toggleMute", async ({ accountId, chatId, mute }) => {
      try {
        const client = activeClients[accountId]?.client
        if (!client) {
          throw new Error("Client not initialized")
        }

        await client.invoke(
          new Api.account.UpdateNotifySettings({
            peer: new Api.InputNotifyPeer({
              peer: await client.getInputEntity(chatId),
            }),
            settings: new Api.InputPeerNotifySettings({
              muteUntil: mute ? 2147483647 : 0, // Max int32 for "forever"
            }),
          })
        )

        // Broadcast the update to all connected clients
        socket.emit("chatUpdated", {
          accountId,
          chatId,
          updates: { muted: mute },
        })
      } catch (error) {
        console.error("Error toggling mute status:", error)
        socket.emit("error", {
          message: "Failed to update notification settings",
        })
      }
    })
  })
} 