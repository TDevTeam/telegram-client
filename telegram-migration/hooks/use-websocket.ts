"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { Message, ConnectionStatus } from "@/lib/types"
import { v4 as uuidv4 } from "@/lib/uuid"

export function useWebSocket(accountId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected")
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!accountId) {
      setConnectionStatus("disconnected")
      socketRef.current?.close()
      socketRef.current = null
      return
    }

    // Close existing connection if switching accounts
    if (socketRef.current) {
      socketRef.current.close()
    }

    setConnectionStatus("connecting")

    // Connect to the backend WebSocket server
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsPort = process.env.NEXT_PUBLIC_WS_PORT || "4000" // Default to 4000 if not specified
    const wsHost = process.env.NEXT_PUBLIC_WS_HOST || window.location.hostname
    const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}/ws?accountId=${accountId}`

    const socket = new WebSocket(wsUrl)
    socketRef.current = socket

    socket.onopen = () => {
      setConnectionStatus("connected")
      // Add system message for connection
      const systemMessage: Message = {
        id: uuidv4(),
        content: "Connected to account",
        sender: "system",
        timestamp: new Date().toISOString(),
        accountId,
      }
      setMessages([systemMessage])
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "message") {
          const newMessage: Message = {
            id: data.id || uuidv4(),
            content: data.content,
            sender: data.sender || "bot",
            timestamp: data.timestamp || new Date().toISOString(),
            accountId,
          }
          setMessages((prev) => [...prev, newMessage])
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error)
      }
    }

    socket.onclose = () => {
      setConnectionStatus("disconnected")
    }

    socket.onerror = (error) => {
      console.error("WebSocket error:", error)
      setConnectionStatus("disconnected")
    }

    // Cleanup function
    return () => {
      socket.close()
    }
  }, [accountId])

  const sendMessage = useCallback(
    (content: string) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && accountId) {
        // Add user message to local state immediately
        const userMessage: Message = {
          id: uuidv4(),
          content,
          sender: "user",
          timestamp: new Date().toISOString(),
          accountId,
        }
        setMessages((prev) => [...prev, userMessage])

        // Send message to server
        socketRef.current.send(
          JSON.stringify({
            type: "message",
            content,
            accountId,
          }),
        )
      }
    },
    [accountId],
  )

  return {
    messages,
    sendMessage,
    connectionStatus,
  }
}

