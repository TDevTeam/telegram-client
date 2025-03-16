"use client"

import { useState } from "react"
import { Save, X, Camera } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useTelegramStore } from "@/context/telegram-store"
import type { AccountType } from "@/context/telegram-store"

interface ProfileEditorProps {
  account: AccountType
  onSave: () => void
  onCancel: () => void
}

export function ProfileEditor({ account, onSave, onCancel }: ProfileEditorProps) {
  const { updateAccount } = useTelegramStore()
  const [name, setName] = useState(account.name)
  const [username, setUsername] = useState(account.username)
  const [bio, setBio] = useState(account.bio || "")
  const [phone, setPhone] = useState(account.phone)
  const [avatar, setAvatar] = useState(account.avatar)

  const handleSave = () => {
    updateAccount(account.id, {
      name,
      username,
      bio,
      phone,
      avatar,
    })
    onSave()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Edit Profile</h2>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatar} alt={name} />
              <AvatarFallback>{name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <Button
              variant="secondary"
              size="icon"
              className="absolute bottom-0 right-0 rounded-full h-8 w-8"
              onClick={() => {
                // In a real app, this would open a file picker
                const randomId = Math.floor(Math.random() * 1000)
                setAvatar(`/placeholder.svg?height=96&width=96&text=New&id=${randomId}`)
              }}
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@username"
            />
            <p className="text-xs text-muted-foreground">
              People can find you by this username and contact you without knowing your phone number.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell people about yourself"
              className="resize-none"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Any details such as age, occupation, or city. Example: 23 y.o. designer from San Francisco.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
            <p className="text-xs text-muted-foreground">
              Your phone number is only visible to people you've added to your contacts.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 border-t flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  )
}

