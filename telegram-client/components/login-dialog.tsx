"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import wsClient from "@/lib/websocket-client"
import { useTelegramStore } from "@/context/telegram-store"

interface LoginDialogProps {
  accountId: string
  onSuccess: (sessionString: string) => void
  onCancel: () => void
}

export function LoginDialog({ accountId, onSuccess, onCancel }: LoginDialogProps) {
  const [step, setStep] = useState<"phone" | "code" | "password" | "loading">("phone")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [phoneCodeHash, setPhoneCodeHash] = useState("")
  const { setError: setGlobalError } = useTelegramStore()

  useEffect(() => {
    // Set up WebSocket event handlers for login flow
    const handleCodeSent = (data: any) => {
      console.log("Login code sent:", data)
      setPhoneCodeHash(data.phoneCodeHash)
      setStep("code")
    }

    const handle2FANeeded = () => {
      console.log("2FA needed")
      setStep("password")
    }

    const handleLoginSuccess = (data: any) => {
      console.log("Login successful:", data)
      onSuccess(data.sessionString)
    }

    const handleError = (data: any) => {
      console.error("Login error:", data)
      setError(data.error)
      setGlobalError(data.error)
      // Don't automatically go back to phone step on error
      // Let the user decide what to do
    }

    wsClient.on("login_code_sent", handleCodeSent)
    wsClient.on("login_2fa_needed", handle2FANeeded)
    wsClient.on("login_success", handleLoginSuccess)
    wsClient.on("error", handleError)

    // Clean up event handlers
    return () => {
      wsClient.off("login_code_sent", handleCodeSent)
      wsClient.off("login_2fa_needed", handle2FANeeded)
      wsClient.off("login_success", handleLoginSuccess)
      wsClient.off("error", handleError)
    }
  }, [accountId, onSuccess, setGlobalError])

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setStep("loading")

    // Send phone number to server
    wsClient.send({
      type: "login_phone",
      accountId,
      phoneNumber,
    })

    // Dispatch custom event for the promise in onPhoneRequest
    document.dispatchEvent(new Event("phone-submit"))
  }

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setStep("loading")

    // Send verification code to server
    wsClient.send({
      type: "login_code",
      accountId,
      phoneNumber,
      phoneCodeHash,
      code,
    })

    // Dispatch custom event for the promise in onCodeRequest
    document.dispatchEvent(new Event("code-submit"))
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setStep("loading")

    // Send 2FA password to server
    wsClient.send({
      type: "login_2fa",
      accountId,
      password,
    })

    // Dispatch custom event for the promise in onPasswordRequest
    document.dispatchEvent(new Event("password-submit"))
  }

  const handleStartLogin = () => {
    // Start the login process using client.start() flow
    wsClient.startLogin(phoneNumber)
  }

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Telegram Login</DialogTitle>
          <DialogDescription>
            {step === "phone" && "Enter your phone number to start"}
            {step === "code" && "Enter the verification code sent to your phone"}
            {step === "password" && "Enter your Two-Factor Authentication password"}
            {step === "loading" && "Processing..."}
          </DialogDescription>
        </DialogHeader>

        {error && <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>}

        {step === "phone" && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (with country code)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+12345678900"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">Send Code</Button>
              <Button type="button" onClick={handleStartLogin}>
                Use Interactive Login
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="12345"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">We sent a code to {phoneNumber}</p>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("phone")}>
                Back
              </Button>
              <Button type="submit">Verify Code</Button>
            </DialogFooter>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Two-Factor Authentication Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your 2FA password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("code")}>
                Back
              </Button>
              <Button type="submit">Submit Password</Button>
            </DialogFooter>
          </form>
        )}

        {step === "loading" && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

