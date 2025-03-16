"use client"

import { useEffect } from "react"
import { useTelegramStore } from "@/context/telegram-store"
import wsClient from "@/lib/websocket"

// This component handles WebSocket connections to receive real-time updates from the backend
export function WebSocketHandler() {
  const {
    activeAccount,
    updateAccount,
    updateChat,
    addMessage,
    updateMessage,
    updateAccountMentions,
    updateChatMentions,
    loginState,
  } = useTelegramStore()

  useEffect(() => {
    if (!activeAccount || loginState.step !== "complete") {
      return
    }

    // Connect to WebSocket
    wsClient.connect(activeAccount.id).catch((error) => {
      console.error("Error connecting to WebSocket:", error)
    })

    // Handle new messages
    const handleNewMessage = (data: any) => {
      const { chatId, message, chat, hasMention } = data

      // Add the message to the chat
      addMessage(chatId, message)

      // Check if the message contains a mention of the user
      if (data.accountId !== activeAccount.id && hasMention) {
        // Update the account to show it has mentions
        updateAccountMentions(data.accountId, true)

        // Update the chat to show it has mentions
        updateChatMentions(chatId, true)
      }
    }

    // Handle mention notifications
    const handleMention = (data: any) => {
      const { accountId, chatId } = data

      // Update the account to show it has mentions
      updateAccountMentions(accountId, true)

      // Update the chat to show it has mentions
      updateChatMentions(chatId, true)
    }

    // Handle chat updates
    const handleChatUpdate = (data: any) => {
      const { chatId, updates } = data
      updateChat(chatId, updates)
    }

    // Handle account updates
    const handleAccountUpdate = (data: any) => {
      const { accountId, updates } = data
      updateAccount(accountId, updates)
    }

    // Register event handlers
    wsClient.on("new_message", handleNewMessage)
    wsClient.on("mention", handleMention)
    wsClient.on("update_chat", handleChatUpdate)
    wsClient.on("update_account", handleAccountUpdate)

    // Clean up on unmount
    return () => {
      wsClient.off("new_message", handleNewMessage)
      wsClient.off("mention", handleMention)
      wsClient.off("update_chat", handleChatUpdate)
      wsClient.off("update_account", handleAccountUpdate)
      wsClient.disconnect()
    }
  }, [activeAccount, loginState.step, addMessage, updateChat, updateAccount, updateAccountMentions, updateChatMentions])

  // This component doesn't render anything
  return null
}

