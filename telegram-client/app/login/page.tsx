"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useTelegramStore } from "@/context/telegram-store"
import { useRouter } from "next/navigation"
import wsClient from "@/lib/websocket-client"
import { LoginDialog } from "@/components/login-dialog"

// Fixed API credentials
const FIXED_API_ID = "20730239"
const FIXED_API_HASH = "72c82b71fc9db0a2808cdbeca34912e7"

export default function LoginPage() {
  const router = useRouter()
  const { activeAccount, updateAccount, loginState, isLoading, error, setError } = useTelegramStore()

  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "error">("connecting")

  // Connect to WebSocket on mount
  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        setConnectionStatus("connecting")
        console.log("Connecting to WebSocket...")
        await wsClient.connect(activeAccount.id)
        setConnectionStatus("connected")
        console.log("WebSocket connected")
      } catch (error) {
        console.error("Error connecting to WebSocket:", error)
        setConnectionStatus("error")
        setError("Failed to connect to server. Please try again.")
      }
    }

    connectWebSocket()

    // Set up WebSocket event handlers
    const handleAuthSuccess = (data: any) => {
      console.log("Auth success:", data)
      if (data.hasSession) {
        // We have a saved session, update account and redirect to home
        updateAccount(activeAccount.id, {
          sessionString: data.sessionString,
        })
        router.push("/")
      } else {
        // No saved session, show login dialog
        setShowLoginDialog(true)
      }
    }

    const handleError = (data: any) => {
      console.error("WebSocket error:", data)
      setError(data.error || "An unknown error occurred")
    }

    wsClient.on("auth_success", handleAuthSuccess)
    wsClient.on("error", handleError)

    // Clean up event handlers
    return () => {
      wsClient.off("auth_success", handleAuthSuccess)
      wsClient.off("error", handleError)
    }
  }, [activeAccount.id, updateAccount, router, setError])

  const handleLoginSuccess = (sessionString: string) => {
    // Update account with session string
    updateAccount(activeAccount.id, {
      sessionString,
    })

    // Hide login dialog
    setShowLoginDialog(false)

    // Redirect to home
    router.push("/")
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Telegram Login</CardTitle>
          <CardDescription>
            {connectionStatus === "connecting" && "Connecting to server..."}
            {connectionStatus === "connected" && "Connected to server"}
            {connectionStatus === "error" && "Failed to connect to server"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>}

          <div className="flex justify-center py-4">
            {connectionStatus === "connecting" ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : connectionStatus === "error" ? (
              <Button onClick={() => window.location.reload()}>Retry Connection</Button>
            ) : (
              <div className="text-center">
                <p className="mb-4">
                  {showLoginDialog ? "Please complete the login process" : "Checking for saved sessions..."}
                </p>
                {!showLoginDialog && <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          <p>Using Telegram API with ID: {FIXED_API_ID}</p>
        </CardFooter>
      </Card>

      {showLoginDialog && (
        <LoginDialog
          accountId={activeAccount.id}
          onSuccess={handleLoginSuccess}
          onCancel={() => setShowLoginDialog(false)}
        />
      )}
    </div>
  )
}

