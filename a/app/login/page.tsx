"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useTelegramStore } from "@/context/telegram-store"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

// Fixed API credentials
const FIXED_API_ID = "20730239"
const FIXED_API_HASH = "72c82b71fc9db0a2808cdbeca34912e7"

export default function LoginPage() {
  const router = useRouter()
  const { activeAccount, loginState, initializeClient, startLogin, completeLogin, complete2FALogin, isLoading, error } =
    useTelegramStore()

  const [phoneNumber, setPhoneNumber] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [sessionString, setSessionString] = useState("")

  const handleInitClient = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await initializeClient(activeAccount.id, FIXED_API_ID, FIXED_API_HASH)
    } catch (error) {
      console.error("Error initializing client:", error)
    }
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    await startLogin(phoneNumber)
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    await completeLogin(code)

    // If login is complete, navigate to home
    if (loginState.step === "complete") {
      router.push("/")
    }
  }

  const handleSubmit2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    await complete2FALogin(password)
    router.push("/")
  }

  const handleSessionLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (sessionString.trim()) {
      try {
        await initializeClient(activeAccount.id, FIXED_API_ID, FIXED_API_HASH, sessionString.trim())
        router.push("/")
      } catch (error) {
        console.error("Error logging in with session:", error)
      }
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Telegram Login</CardTitle>
          <CardDescription>
            {loginState.step === "init" && "Choose your login method"}
            {loginState.step === "phone" && "Enter your phone number"}
            {loginState.step === "code" && "Enter the verification code"}
            {loginState.step === "password" && "Enter your 2FA password"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>}

          {loginState.step === "init" && (
            <Tabs defaultValue="phone" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="phone">Phone Login</TabsTrigger>
                <TabsTrigger value="session">Session String</TabsTrigger>
              </TabsList>
              <TabsContent value="phone">
                <form onSubmit={handleInitClient} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Using API ID: {FIXED_API_ID}</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Initializing...
                      </>
                    ) : (
                      "Continue with Phone"
                    )}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="session">
                <form onSubmit={handleSessionLogin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="session-string">Session String</Label>
                    <Textarea
                      id="session-string"
                      placeholder="Paste your session string here"
                      value={sessionString}
                      onChange={(e) => setSessionString(e.target.value)}
                      className="min-h-[100px]"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Login with Session"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          {loginState.step === "phone" && (
            <form onSubmit={handleSendCode} className="space-y-4">
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
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  "Send Code"
                )}
              </Button>
            </form>
          )}

          {loginState.step === "code" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
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
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Code"
                )}
              </Button>
            </form>
          )}

          {loginState.step === "password" && (
            <form onSubmit={handleSubmit2FA} className="space-y-4">
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
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Submit Password"
                )}
              </Button>
            </form>
          )}

          {loginState.step === "complete" && (
            <div className="space-y-4 text-center">
              <div className="text-green-500 font-medium">Login successful!</div>
              <Button onClick={() => router.push("/")} className="w-full">
                Go to Chats
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          <p>Using Telegram API with ID: {FIXED_API_ID}</p>
        </CardFooter>
      </Card>
    </div>
  )
}

