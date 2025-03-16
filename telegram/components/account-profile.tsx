"use client"

import { useState, useEffect } from "react"
import { X, Edit, Bell, BellOff, Shield, LogOut, Moon, Sun, Globe, ChevronRight } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { useTelegramStore } from "@/context/telegram-store"
import { ProfileEditor } from "@/components/profile-editor"
import type { AccountType } from "@/context/telegram-store"

interface AccountProfileProps {
  account: AccountType
  onClose: () => void
}

export function AccountProfile({ account, onClose }: AccountProfileProps) {
  const { updateAccount } = useTelegramStore()
  const [editing, setEditing] = useState(false)
  // Initialize darkMode state from account settings
  const [darkMode, setDarkMode] = useState(account.darkMode || false)
  const [muted, setMuted] = useState(account.muted || false)

  // Update the toggleDarkMode function to save the setting to the account
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)

    // Update the account settings
    updateAccount(account.id, { darkMode: newDarkMode })

    // Apply the theme change
    document.documentElement.classList.toggle("dark")
  }

  const toggleMute = () => {
    const newMuted = !muted
    setMuted(newMuted)

    updateAccount(account.id, { muted: newMuted })
  }

  // Add useEffect to apply theme when component mounts
  useEffect(() => {
    // Apply the theme based on account settings
    if (account.darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [account.darkMode])

  if (editing) {
    return <ProfileEditor account={account} onSave={() => setEditing(false)} onCancel={() => setEditing(false)} />
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Profile</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="flex flex-col items-center p-6 gap-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={account.avatar} alt={account.name} />
            <AvatarFallback>{account.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h3 className="text-xl font-bold">{account.name}</h3>
            <p className="text-sm text-muted-foreground">{account.username}</p>
            <p className="text-sm text-muted-foreground">{account.phone}</p>
          </div>

          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </div>

        <Separator />

        <div className="p-4 space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Settings</h4>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {account.muted ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                <div>
                  <p className="text-sm font-medium">Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    {account.muted ? "Notifications are muted" : "Notifications are enabled"}
                  </p>
                </div>
              </div>
              <Switch checked={!account.muted} onCheckedChange={toggleMute} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                <div>
                  <p className="text-sm font-medium">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">
                    {darkMode ? "Dark theme enabled" : "Light theme enabled"}
                  </p>
                </div>
              </div>
              <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Privacy & Security</h4>

            <Button variant="ghost" className="w-full justify-start">
              <Shield className="mr-3 h-5 w-5" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">Privacy Settings</p>
                <p className="text-xs text-muted-foreground">Control who can see your profile</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Button>

            <Button variant="ghost" className="w-full justify-start">
              <Globe className="mr-3 h-5 w-5" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">Language</p>
                <p className="text-xs text-muted-foreground">English</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>

          <Separator />

          <Button variant="destructive" className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
          </Button>
        </div>
      </div>
    </div>
  )
}

