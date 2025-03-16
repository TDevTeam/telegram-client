"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { useTelegramStore } from "@/context/telegram-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Send, Smile, Paperclip, Mic, ImageIcon } from "lucide-react"
import { Message } from "@/components/message"
import { ChatHeader } from "@/components/chat-header"

export function MessagePanel() {
  const {
    activeChat,
    messages,
    sendMessage,
    isLoading,
    fetchMessages,
    setTyping,
    activeAccount,
    updateAccountMentions,
  } = useTelegramStore()

  const [messageText, setMessageText] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatMessages = activeChat ? messages[activeChat.id] || [] : []
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch messages when active chat changes
  useEffect(() => {
    if (activeChat && (!messages[activeChat.id] || messages[activeChat.id].length === 0)) {
      fetchMessages(activeChat.id)
    }
  }, [activeChat, messages, fetchMessages])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [chatMessages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeChat || !messageText.trim()) return

    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
      setTyping(activeChat.id, false)
    }

    await sendMessage(activeChat.id, messageText)
    setMessageText("")
    setShowEmojiPicker(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value)

    // Handle typing indicator
    if (activeChat) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Set typing indicator
      setTyping(activeChat.id, true)

      // Set new timeout to clear typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(activeChat.id, false)
        typingTimeoutRef.current = null
      }, 3000)
    }
  }

  // Add this to the useEffect that handles new messages
  useEffect(() => {
    // Existing code...

    // Check if the message contains a mention of the user
    const handleNewMessage = (data) => {
      // Process the message as before

      // Check if this is a message for a different account and contains a mention
      if (
        data.accountId !== activeAccount.id &&
        data.message &&
        data.message.content &&
        data.message.content.includes(`@${activeAccount.username}`)
      ) {
        // Update the account to show it has mentions
        updateAccountMentions(data.accountId, true)
      }
    }

    // Add event listener for new messages
    document.addEventListener("telegram:new-message", handleNewMessage)

    return () => {
      document.removeEventListener("telegram:new-message", handleNewMessage)
    }
  }, [activeAccount, updateAccountMentions])

  // When switching to an account, clear its mentions flag
  useEffect(() => {
    if (activeAccount) {
      updateAccountMentions(activeAccount.id, false)
    }
  }, [activeAccount, updateAccountMentions])

  if (!activeChat) return null

  return (
    <div className="flex h-full flex-col">
      <ChatHeader chat={activeChat} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && chatMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {chatMessages.map((message) => (
              <Message
                key={message.id}
                message={message}
                isCurrentUser={message.senderId === "current-user"}
                chatId={activeChat.id}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      <div className="border-t border-border p-4">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
            <Smile className="h-5 w-5" />
          </Button>
          <Button type="button" variant="ghost" size="icon">
            <Paperclip className="h-5 w-5" />
          </Button>
          <div className="relative flex-1">
            <Input placeholder="Type a message..." value={messageText} onChange={handleInputChange} className="pr-10" />
          </div>
          {messageText.trim() ? (
            <Button type="submit" size="icon" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          ) : (
            <>
              <Button type="button" variant="ghost" size="icon">
                <Mic className="h-5 w-5" />
              </Button>
              <Button type="button" variant="ghost" size="icon">
                <ImageIcon className="h-5 w-5" />
              </Button>
            </>
          )}
        </form>
      </div>
    </div>
  )
}

