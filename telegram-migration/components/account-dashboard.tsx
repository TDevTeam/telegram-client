"use client"

import { useState, useEffect } from "react"
import { AccountSwitcher } from "@/components/account-switcher"
import { ChatInterface } from "@/components/chat-interface"
import { useToast } from "@/hooks/use-toast"
import { useWebSocket } from "@/hooks/use-websocket"
import type { Account } from "@/lib/types"

export function AccountDashboard() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [activeAccount, setActiveAccount] = useState<Account | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const { messages, sendMessage, connectionStatus } = useWebSocket(activeAccount?.id)

  useEffect(() => {
    async function fetchAccounts() {
      try {
        const response = await fetch("/api/accounts")
        if (!response.ok) throw new Error("Failed to fetch accounts")
        const data = await response.json()
        setAccounts(data)
        if (data.length > 0) {
          setActiveAccount(data[0])
        }
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching accounts:", error)
        toast({
          title: "Error",
          description: "Failed to load accounts. Please try again.",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }

    fetchAccounts()
  }, [toast])

  const handleAccountSwitch = (account: Account) => {
    setActiveAccount(account)
  }

  const handleSendMessage = (content: string) => {
    if (!activeAccount) return
    sendMessage(content)
  }

  const handleAddAccount = async (username: string) => {
    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      })

      if (!response.ok) throw new Error("Failed to add account")

      const newAccount = await response.json()
      setAccounts((prev) => [...prev, newAccount])
      toast({
        title: "Success",
        description: `Account ${username} added successfully`,
      })
    } catch (error) {
      console.error("Error adding account:", error)
      toast({
        title: "Error",
        description: "Failed to add account. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveAccount = async (id: string) => {
    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to remove account")

      setAccounts((prev) => prev.filter((account) => account.id !== id))

      if (activeAccount?.id === id) {
        setActiveAccount(accounts.length > 1 ? accounts[0] : null)
      }

      toast({
        title: "Success",
        description: "Account removed successfully",
      })
    } catch (error) {
      console.error("Error removing account:", error)
      toast({
        title: "Error",
        description: "Failed to remove account. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading accounts...</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="md:col-span-1 space-y-4">
        <AccountSwitcher
          accounts={accounts}
          activeAccount={activeAccount}
          onSwitchAccount={handleAccountSwitch}
          onAddAccount={handleAddAccount}
          onRemoveAccount={handleRemoveAccount}
        />
        <div className="p-4 border rounded-lg bg-card">
          <h3 className="font-medium mb-2">Connection Status</h3>
          <div className="flex items-center">
            <div
              className={`w-3 h-3 rounded-full mr-2 ${
                connectionStatus === "connected"
                  ? "bg-green-500"
                  : connectionStatus === "connecting"
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
            />
            <span className="capitalize">{connectionStatus}</span>
          </div>
        </div>
      </div>
      <div className="md:col-span-3">
        {activeAccount ? (
          <ChatInterface account={activeAccount} messages={messages} onSendMessage={handleSendMessage} />
        ) : (
          <div className="flex flex-col items-center justify-center h-[500px] border rounded-lg bg-card">
            <p className="text-muted-foreground">No account selected</p>
            <p className="text-sm text-muted-foreground mt-2">Please add an account to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}

