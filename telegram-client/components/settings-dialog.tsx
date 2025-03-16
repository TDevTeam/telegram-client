"use client"

import { Badge } from "@/components/ui/badge"

import { useState } from "react"
import { Bell, Moon, Sun, Smartphone, Trash2, Save } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { useTelegramStore, type AccountType } from "@/context/telegram-store"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: AccountType
}

export function SettingsDialog({ open, onOpenChange, account }: SettingsDialogProps) {
  const { updateAccount } = useTelegramStore()
  const [darkMode, setDarkMode] = useState(account.darkMode || false)
  const [language, setLanguage] = useState(account.language || "en")
  const [notificationSound, setNotificationSound] = useState(account.notificationSettings?.sound || true)
  const [notificationPreview, setNotificationPreview] = useState(account.notificationSettings?.preview || true)
  const [notificationBadge, setNotificationBadge] = useState(account.notificationSettings?.showBadge || true)
  const [lastSeenPrivacy, setLastSeenPrivacy] = useState(account.privacySettings?.lastSeen || "everybody")
  const [profilePhotoPrivacy, setProfilePhotoPrivacy] = useState(account.privacySettings?.profilePhoto || "everybody")
  const [callsPrivacy, setCallsPrivacy] = useState(account.privacySettings?.calls || "everybody")
  const [forwardedPrivacy, setForwardedPrivacy] = useState(account.privacySettings?.forwardedMessages || "everybody")

  const handleSaveSettings = () => {
    updateAccount(account.id, {
      darkMode,
      language,
      notificationSettings: {
        sound: notificationSound,
        preview: notificationPreview,
        showBadge: notificationBadge,
      },
      privacySettings: {
        lastSeen: lastSeenPrivacy as "everybody" | "contacts" | "nobody",
        profilePhoto: profilePhotoPrivacy as "everybody" | "contacts" | "nobody",
        calls: callsPrivacy as "everybody" | "contacts" | "nobody",
        forwardedMessages: forwardedPrivacy as "everybody" | "contacts" | "nobody",
      },
    })

    // Apply theme change
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure your account settings and preferences.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
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
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            </div>

            <div className="space-y-2">
              <Label>Language</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ru">Russian</option>
                <option value="zh">Chinese</option>
                <option value="ar">Arabic</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Data and Storage</Label>
              <div className="rounded-md border p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm">Auto-download media</p>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm">Storage usage</p>
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5" />
                <div>
                  <p className="text-sm font-medium">Notification Sounds</p>
                  <p className="text-xs text-muted-foreground">Play sounds for incoming messages</p>
                </div>
              </div>
              <Switch
                id="notifications"
                checked={notificationSound}
                onCheckedChange={(checked) => setNotificationSound(checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Message Previews</p>
                <p className="text-xs text-muted-foreground">Show message content in notifications</p>
              </div>
              <Switch
                id="notification-preview"
                checked={notificationPreview}
                onCheckedChange={(checked) => setNotificationPreview(checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Badge Counter</p>
                <p className="text-xs text-muted-foreground">Show unread message count badge</p>
              </div>
              <Switch
                id="notification-badge"
                checked={notificationBadge}
                onCheckedChange={(checked) => setNotificationBadge(checked)}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Exceptions</Label>
              <Button variant="outline" className="w-full justify-start">
                Manage notification exceptions
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4">
            <div className="space-y-3">
              <Label>Last Seen & Online</Label>
              <RadioGroup
                value={lastSeenPrivacy}
                onValueChange={(value) => setLastSeenPrivacy(value as "everybody" | "contacts" | "nobody")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="everybody" id="last-seen-everybody" />
                  <Label htmlFor="last-seen-everybody">Everybody</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="contacts" id="last-seen-contacts" />
                  <Label htmlFor="last-seen-contacts">My Contacts</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nobody" id="last-seen-nobody" />
                  <Label htmlFor="last-seen-nobody">Nobody</Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Profile Photos</Label>
              <RadioGroup
                value={profilePhotoPrivacy}
                onValueChange={(value) => setProfilePhotoPrivacy(value as "everybody" | "contacts" | "nobody")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="everybody" id="photo-everybody" />
                  <Label htmlFor="photo-everybody">Everybody</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="contacts" id="photo-contacts" />
                  <Label htmlFor="photo-contacts">My Contacts</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nobody" id="photo-nobody" />
                  <Label htmlFor="photo-nobody">Nobody</Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Calls</Label>
              <RadioGroup
                value={callsPrivacy}
                onValueChange={(value) => setCallsPrivacy(value as "everybody" | "contacts" | "nobody")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="everybody" id="calls-everybody" />
                  <Label htmlFor="calls-everybody">Everybody</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="contacts" id="calls-contacts" />
                  <Label htmlFor="calls-contacts">My Contacts</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nobody" id="calls-nobody" />
                  <Label htmlFor="calls-nobody">Nobody</Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Forwarded Messages</Label>
              <RadioGroup
                value={forwardedPrivacy}
                onValueChange={(value) => setForwardedPrivacy(value as "everybody" | "contacts" | "nobody")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="everybody" id="forwarded-everybody" />
                  <Label htmlFor="forwarded-everybody">Everybody</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="contacts" id="forwarded-contacts" />
                  <Label htmlFor="forwarded-contacts">My Contacts</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nobody" id="forwarded-nobody" />
                  <Label htmlFor="forwarded-nobody">Nobody</Label>
                </div>
              </RadioGroup>
            </div>
          </TabsContent>

          <TabsContent value="devices" className="space-y-4">
            <div className="space-y-2">
              <Label>Active Sessions</Label>
              <div className="rounded-md border p-3 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-medium">Current Session</p>
                      <p className="text-xs text-muted-foreground">Web App • {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500">Active</Badge>
                </div>

                {account.sessions
                  ?.filter((s) => !s.current)
                  .map((session, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-5 w-5" />
                        <div>
                          <p className="text-sm font-medium">{session.deviceName}</p>
                          <p className="text-xs text-muted-foreground">
                            {session.appName} • {session.location} • Last active: {session.lastActive}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>

              <Button variant="outline" className="w-full mt-2">
                Terminate All Other Sessions
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveSettings}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

