// WebSocket client for real-time communication with the backend

type MessageHandler = (data: any) => void

class WebSocketClient {
  private socket: WebSocket | null = null
  private url: string
  private accountId: string | null = null
  private messageHandlers: Map<string, MessageHandler[]> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimeout: NodeJS.Timeout | null = null
  private loginCallbacks: {
    onPhoneRequest?: (accountId: string) => Promise<string>
    onCodeRequest?: (accountId: string) => Promise<string>
    onPasswordRequest?: (accountId: string) => Promise<string>
  } = {}

  constructor(url: string) {
    this.url = url
  }

  // Connect to the WebSocket server
  connect(accountId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // If already connected, disconnect first
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          console.log("WebSocket already connected, disconnecting first")
          this.disconnect()
        }

        this.accountId = accountId
        this.socket = new WebSocket(this.url)

        this.socket.onopen = () => {
          console.log("WebSocket connection established")
          this.reconnectAttempts = 0

          // Authenticate with the server
          this.send({
            type: "auth",
            accountId,
          })

          resolve()
        }

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.handleMessage(data)
          } catch (error) {
            console.error("Error parsing WebSocket message:", error)
          }
        }

        this.socket.onclose = () => {
          console.log("WebSocket connection closed")
          this.attemptReconnect()
        }

        this.socket.onerror = (error) => {
          console.error("WebSocket error:", error)
          reject(error)
        }
      } catch (error) {
        console.error("Error connecting to WebSocket:", error)
        reject(error)
      }
    })
  }

  // Send a message to the server
  send(data: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data))
    } else {
      console.error("WebSocket is not connected")
    }
  }

  // Register a handler for a specific message type
  on(type: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, [])
    }
    this.messageHandlers.get(type)?.push(handler)
  }

  // Remove a handler for a specific message type
  off(type: string, handler: MessageHandler): void {
    if (this.messageHandlers.has(type)) {
      const handlers = this.messageHandlers.get(type) || []
      const index = handlers.indexOf(handler)
      if (index !== -1) {
        handlers.splice(index, 1)
      }
    }
  }

  // Set login callbacks for interactive authentication
  setLoginCallbacks(callbacks: {
    onPhoneRequest?: (accountId: string) => Promise<string>
    onCodeRequest?: (accountId: string) => Promise<string>
    onPasswordRequest?: (accountId: string) => Promise<string>
  }): void {
    this.loginCallbacks = callbacks
  }

  // Start the login process using client.start() flow
  startLogin(phoneNumber?: string): void {
    if (!this.accountId) {
      console.error("No account ID set")
      return
    }

    this.send({
      type: "client_start",
      accountId: this.accountId,
      phoneNumber,
    })
  }

  // Provide phone number for login
  providePhone(phoneNumber: string): void {
    if (!this.accountId) {
      console.error("No account ID set")
      return
    }

    this.send({
      type: "provide_phone",
      accountId: this.accountId,
      phoneNumber,
    })
  }

  // Provide verification code for login
  provideCode(code: string): void {
    if (!this.accountId) {
      console.error("No account ID set")
      return
    }

    this.send({
      type: "provide_code",
      accountId: this.accountId,
      code,
    })
  }

  // Provide 2FA password for login
  providePassword(password: string): void {
    if (!this.accountId) {
      console.error("No account ID set")
      return
    }

    this.send({
      type: "provide_password",
      accountId: this.accountId,
      password,
    })
  }

  // Handle incoming messages
  private handleMessage(data: any): void {
    const { type } = data

    // Handle special login-related messages
    if (type === "request_phone" && this.loginCallbacks.onPhoneRequest) {
      this.loginCallbacks.onPhoneRequest(data.accountId).then((phoneNumber) => {
        this.providePhone(phoneNumber)
      })
    } else if (type === "request_code" && this.loginCallbacks.onCodeRequest) {
      this.loginCallbacks.onCodeRequest(data.accountId).then((code) => {
        this.provideCode(code)
      })
    } else if (type === "request_password" && this.loginCallbacks.onPasswordRequest) {
      this.loginCallbacks.onPasswordRequest(data.accountId).then((password) => {
        this.providePassword(password)
      })
    }

    // Trigger registered handlers
    if (type) {
      const handlers = this.messageHandlers.get(type) || []
      handlers.forEach((handler) => handler(data))

      // Also trigger 'all' handlers
      const allHandlers = this.messageHandlers.get("all") || []
      allHandlers.forEach((handler) => handler(data))
    }
  }

  // Attempt to reconnect to the server
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Maximum reconnect attempts reached")
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`)

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    this.reconnectTimeout = setTimeout(() => {
      if (this.accountId) {
        this.connect(this.accountId).catch((error) => {
          console.error("Reconnect failed:", error)
          this.attemptReconnect()
        })
      }
    }, delay)
  }

  // Disconnect from the server
  disconnect(): void {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }
}

// Create a singleton instance
const wsClient = new WebSocketClient(process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001")

export default wsClient

