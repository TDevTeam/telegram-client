"use client"
import { useTelegramStore } from "@/context/telegram-store"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProfileView } from "@/components/profile-view"

export function ProfilePanel() {
  const { activeMember, setActiveMember, mediaItems, activeChat } = useTelegramStore()

  if (!activeMember || !activeChat) return null

  const chatMedia = mediaItems[activeChat.id] || []

  return (
    <div className="hidden w-[350px] border-l md:block">
      <div className="flex h-16 items-center justify-between border-b px-4">
        <h2 className="font-semibold">Profile</h2>
        <Button variant="ghost" size="icon" onClick={() => setActiveMember(null)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-[calc(100vh-4rem)] overflow-y-auto">
        <ProfileView
          profile={{
            id: activeMember.id,
            name: activeMember.name,
            avatar: activeMember.avatar,
            status: activeMember.online ? "online" : activeMember.lastSeen || "offline",
            type: "private",
            bio: activeMember.bio || "",
            phone: activeMember.phone || "",
            username: activeMember.username,
          }}
          media={chatMedia}
          mutualGroups={[]}
          onClose={() => setActiveMember(null)}
          editable={false}
        />
      </div>
    </div>
  )
}

