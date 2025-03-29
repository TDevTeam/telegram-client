"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { io, type Socket } from "socket.io-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MessageSquare, Send, User, Users, Check, CheckCheck, Menu, Moon, Sun } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useTheme } from "next-themes"

// Types
interface Account {
  id: string
  name: string
  unreadCount: number
  displayName: string
  phoneNumber: string
}

interface Chat {
  id: string
  title: string
  unreadCount: number
  lastMessage?: {
    text: string
    timestamp: number
  }
}

interface Message {
  id: string
  text: string
  timestamp: number
  isOutgoing: boolean
  isRead: boolean
  replyToId?: string
  mediaType?: string
  mediaUrl?: string
  caption?: string
}

export default function TelegramManager() {
  // Theme
  const { theme, setTheme } = useTheme()

  // State
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [chats, setChats] = useState<Record<string, Chat[]>>({})
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, Record<string, Message[]>>>({})
  const [messageInput, setMessageInput] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Connect to socket
  useEffect(() => {
    console.log("Connecting to socket server...")
    const socketInstance = io("http://localhost:3001", {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
      withCredentials: true,
    })

    socketInstance.on("connect", () => {
      console.log("Connected to server")
      setConnected(true)
      socketInstance.emit("getAccounts")
    })

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from server")
      setConnected(false)
    })

    socketInstance.on("accounts", (accountsData: Account[]) => {
      console.log("Received accounts:", accountsData)
      setAccounts(accountsData)
      if (accountsData.length > 0 && !selectedAccount) {
        const firstAccountId = accountsData[0].id
        console.log("Selecting first account:", firstAccountId)
        setSelectedAccount(firstAccountId)
        socketInstance.emit("getChats", firstAccountId)
      }
    })

    socketInstance.on("chats", ({ accountId, chats: chatsData }: { accountId: string; chats: Chat[] }) => {
      console.log("Received chats for account:", accountId, chatsData)
      setChats((prev) => ({ ...prev, [accountId]: chatsData }))
      if (chatsData.length > 0 && !selectedChat) {
        const firstChatId = chatsData[0].id
        console.log("Selecting first chat:", firstChatId)
        setSelectedChat(firstChatId)
        socketInstance.emit("getMessages", accountId, firstChatId)
      }
    })

    socketInstance.on(
      "messages",
      ({ accountId, chatId, messages: messagesData }: { accountId: string; chatId: string; messages: Message[] }) => {
        console.log("Received messages for account/chat:", accountId, chatId, messagesData)
        setMessages((prev) => ({
          ...prev,
          [accountId]: {
            ...(prev[accountId] || {}),
            [chatId]: messagesData || [],
          },
        }))
        scrollToBottom()
      },
    )

    socketInstance.on(
      "messageSent",
      ({
        accountId,
        chatId,
        success,
        error,
      }: { accountId: string; chatId: string; success: boolean; error?: string }) => {
        console.log("Message sent status:", success, error)
        setSendingMessage(false)
        if (!success && error) {
          toast({
            title: "Error sending message",
            description: error,
            variant: "destructive",
          })
        } else {
          setMessageInput("")
        }
      },
    )

    // Debug all incoming events
    socketInstance.onAny((event, ...args) => {
      console.log(`Received event: ${event}`, args)
    })

    setSocket(socketInstance)

    return () => {
      console.log("Disconnecting socket...")
      socketInstance.disconnect()
    }
  }, [])

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, selectedAccount, selectedChat])

  // Handle account selection
  const handleAccountSelect = (accountId: string) => {
    console.log("Selecting account:", accountId)
    setSelectedAccount(accountId)
    setSelectedChat(null)
    setMobileMenuOpen(false)
    if (socket) {
      socket.emit("getChats", accountId)
    }
  }

  // Handle chat selection
  const handleChatSelect = (chatId: string) => {
    console.log("Selecting chat:", chatId)
    if (selectedAccount && socket) {
      setSelectedChat(chatId)
      setMobileMenuOpen(false)
      socket.emit("getMessages", selectedAccount, chatId)
      socket.emit("markAsRead", { accountId: selectedAccount, chatId })

      // Update unread count in UI
      if (selectedAccount && chats[selectedAccount]) {
        const updatedChats = chats[selectedAccount].map((chat) =>
          chat.id === chatId ? { ...chat, unreadCount: 0 } : chat,
        )
        setChats((prev) => ({ ...prev, [selectedAccount]: updatedChats }))
      }
    }
  }

  // Send message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (messageInput.trim() && selectedAccount && selectedChat && socket) {
      console.log("Sending message:", messageInput)
      setSendingMessage(true)
      socket.emit("sendMessage", {
        accountId: selectedAccount,
        chatId: selectedChat,
        message: messageInput.trim(),
      })

      // Add the message to the UI directly (optimistic update)
      const newMessage: Message = {
        id: Date.now().toString(),
        text: messageInput.trim(),
        timestamp: Date.now(),
        isOutgoing: true,
        isRead: false,
      }

      if (selectedAccount && selectedChat) {
        setMessages((prev) => {
          const accountMessages = prev[selectedAccount] || {}
          const chatMessages = accountMessages[selectedChat] || []
          return {
            ...prev,
            [selectedAccount]: {
              ...accountMessages,
              [selectedChat]: [...chatMessages, newMessage],
            },
          }
        })
        scrollToBottom()
      }
    }
  }

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="bg-background border-b border-border py-3 px-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" aria-hidden="true" suppressHydrationWarning />
              </Button>
            </SheetTrigger>            <SheetContent side="left" className="p-0 w-[280px]">
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-border flex justify-between items-center">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5" /> Accounts
                  </h2>
                </div>
                <ScrollArea className="flex-1">
                  {accounts.length > 0 ? (
                    <div className="p-2">
                      {accounts.map((account) => (
                        <div key={account.id} className="relative group">
                          <Button
                            variant={selectedAccount === account.id ? "default" : "ghost"}
                            className="w-full justify-start mb-1 text-left pr-10"
                            onClick={() => handleAccountSelect(account.id)}
                          >
                            <User className="mr-2 h-4 w-4" />
                            <div className="truncate">
                              <div>{account.displayName}</div>
                              <div className="text-xs text-muted-foreground">+{account.phoneNumber}</div>
                            </div>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      {connected ? "No accounts found" : "Connecting..."}
                    </div>
                  )}
                </ScrollArea>

                {selectedAccount && (
                  <>
                    <Separator />
                    <div className="p-4 border-b border-border">
                      <h2 className="text-lg font-semibold">Chats</h2>
                    </div>
                    <ScrollArea className="flex-1">
                      {chats[selectedAccount]?.length > 0 ? (
                        <div className="p-2">
                          {chats[selectedAccount].map((chat) => (
                            <Button
                              key={chat.id}
                              variant={selectedChat === chat.id ? "default" : "ghost"}
                              className="w-full justify-start mb-1 text-left h-auto py-3"
                              onClick={() => handleChatSelect(chat.id)}
                            >
                              <div className="flex flex-col items-start w-full">
                                <div className="flex justify-between w-full">
                                  <span className="font-medium truncate">{chat.title}</span>
                                  {chat.unreadCount > 0 && (
                                    <Badge variant="destructive" className="ml-2">
                                      {chat.unreadCount}
                                    </Badge>
                                  )}
                                </div>
                                {chat.lastMessage && (
                                  <div className="text-xs text-muted-foreground mt-1 truncate w-full">
                                    {chat.lastMessage.text}
                                  </div>
                                )}
                              </div>
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-muted-foreground">
                          {connected ? "No chats found" : "Loading chats..."}
                        </div>
                      )}
                    </ScrollArea>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" /> Telegram
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <div className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}></div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar - Accounts */}
        <div className="w-64 border-r border-border hidden md:flex flex-col">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" /> Accounts
            </h2>
          </div>
          <ScrollArea className="flex-1">
            {accounts.length > 0 ? (
              <div className="p-2">
                {accounts.map((account) => (
                  <div key={account.id} className="relative group">
                    <Button
                      variant={selectedAccount === account.id ? "default" : "ghost"}
                      className="w-full justify-start mb-1 text-left pr-10"
                      onClick={() => handleAccountSelect(account.id)}
                    >
                      <User className="mr-2 h-4 w-4" />
                      <div className="truncate">
                        <div>{account.name}</div>
                        <div className="text-xs text-muted-foreground">+{account.phoneNumber}</div>
                      </div>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                {connected ? "No accounts found" : "Connecting..."}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Sidebar - Chats */}
        {selectedAccount && (
          <div className="w-72 border-r border-border hidden md:flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-semibold">Chats</h2>
            </div>
            <ScrollArea className="flex-1">
              {chats[selectedAccount]?.length > 0 ? (
                <div className="p-2">
                  {chats[selectedAccount].map((chat) => (
                    <Button
                      key={chat.id}
                      variant={selectedChat === chat.id ? "default" : "ghost"}
                      className="w-full justify-start mb-1 text-left h-auto py-3"
                      onClick={() => handleChatSelect(chat.id)}
                    >
                      <div className="flex flex-col items-start w-full">
                        <div className="flex justify-between w-full">
                          <span className="font-medium truncate">{chat.title}</span>
                          {chat.unreadCount > 0 && (
                            <Badge variant="destructive" className="ml-2">
                              {chat.unreadCount}
                            </Badge>
                          )}
                        </div>
                        {chat.lastMessage && (
                          <div className="text-xs text-muted-foreground mt-1 truncate w-full">
                            {chat.lastMessage.text}
                          </div>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  {connected ? "No chats found" : "Loading chats..."}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Main content - Messages */}
        <div className="flex-1 flex flex-col">
          {selectedAccount && selectedChat ? (
            <>
              <div className="p-3 border-b border-border flex justify-between items-center">
                <h2 className="font-semibold truncate">
                  {chats[selectedAccount]?.find((c) => c.id === selectedChat)?.title || "Chat"}
                </h2>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages[selectedAccount]?.[selectedChat]?.length > 0 ? (
                    messages[selectedAccount][selectedChat].map((message) => (
                      <div key={message.id} className={`flex ${message.isOutgoing ? "justify-end" : "justify-start"}`}>
                        <div className="relative group">
                          <div
                            className={`max-w-[70%] p-3 rounded-lg ${
                              message.isOutgoing
                                ? "bg-primary text-primary-foreground"
                                : "bg-card text-card-foreground border border-border"
                            }`}
                          >
                            {/* Message text */}
                            <div>{message.text || ""}</div>

                            {/* Message metadata */}
                            <div className="text-xs mt-1 flex justify-end items-center gap-1">
                              {formatTime(message.timestamp)}
                              {message.isOutgoing &&
                                (message.isRead ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8">No messages yet</div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="p-3 border-t border-border">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type a message..."
                    disabled={sendingMessage}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={sendingMessage || !messageInput.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              {selectedAccount
                ? "Select a chat to start messaging"
                : accounts.length > 0
                  ? "Select an account"
                  : "No accounts available"}
            </div>
          )}
        </div>
      </main>

      <Toaster />
    </div>
  )
}

