"use client"

import { useState } from "react"
import { X, LinkIcon, Image, Users, Bell, BellOff, UserPlus, UserMinus, File } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

interface ProfileViewProps {
  profile: {
    id: string
    name: string
    avatar: string
    status?: string
    type: string
    bio?: string
    phone?: string
    username?: string
    joinDate?: string
  }
  media: Array<{
    id: string
    type: string
    url?: string
    name?: string
    title?: string
    size?: string
    date: string
  }>
  mutualGroups?: Array<{
    id: string
    name: string
    memberCount: number
    avatar: string
  }>
  onClose: () => void
}

export function ProfileView({ profile, media, mutualGroups, onClose }: ProfileViewProps) {
  const [isMuted, setIsMuted] = useState(false)
  const [isContact, setIsContact] = useState(true)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Profile</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col items-center p-6 gap-4">
        <Avatar className="h-24 w-24">
          <AvatarImage src={profile.avatar} alt={profile.name} />
          <AvatarFallback>{profile.name.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h3 className="text-xl font-bold">{profile.name}</h3>
          {profile.status && <p className="text-sm text-muted-foreground">{profile.status}</p>}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsMuted(!isMuted)}>
            {isMuted ? <BellOff className="mr-2 h-4 w-4" /> : <Bell className="mr-2 h-4 w-4" />}
            {isMuted ? "Unmute" : "Mute"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsContact(!isContact)}>
            {isContact ? <UserMinus className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
            {isContact ? "Remove" : "Add"}
          </Button>
        </div>
      </div>

      <Separator />

      {profile.bio && (
        <div className="p-4">
          <h4 className="text-sm font-medium mb-2">Bio</h4>
          <p className="text-sm">{profile.bio}</p>
        </div>
      )}

      <div className="p-4">
        <h4 className="text-sm font-medium mb-2">Info</h4>
        <div className="space-y-2">
          {profile.username && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Username</span>
              <span>{profile.username}</span>
            </div>
          )}
          {profile.phone && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Phone</span>
              <span>{profile.phone}</span>
            </div>
          )}
          {profile.joinDate && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Joined</span>
              <span>{profile.joinDate}</span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      <Tabs defaultValue="media" className="flex-1">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="media">
            <Image className="h-4 w-4 mr-2" />
            Media
          </TabsTrigger>
          <TabsTrigger value="links">
            <LinkIcon className="h-4 w-4 mr-2" />
            Links
          </TabsTrigger>
          <TabsTrigger value="groups">
            <Users className="h-4 w-4 mr-2" />
            Groups
          </TabsTrigger>
        </TabsList>

        <TabsContent value="media" className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-3 gap-2">
            {media
              .filter((item) => item.type === "image")
              .map((item) => (
                <div key={item.id} className="aspect-square rounded-md overflow-hidden">
                  <img src={item.url || "/placeholder.svg"} alt="Media" className="w-full h-full object-cover" />
                </div>
              ))}
          </div>
          <div className="mt-4 space-y-2">
            {media
              .filter((item) => item.type === "file")
              .map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <div className="flex items-center">
                    <File className="h-4 w-4 mr-2" />
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.size}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.date}</span>
                </div>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="links" className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-2">
            {media
              .filter((item) => item.type === "link")
              .map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <div className="flex items-center">
                    <LinkIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.url}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">{item.date}</span>
                </div>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="groups" className="flex-1 p-4 overflow-y-auto">
          {mutualGroups && mutualGroups.length > 0 ? (
            <div className="space-y-2">
              {mutualGroups.map((group) => (
                <div key={group.id} className="flex items-center p-2 bg-muted rounded-md">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarImage src={group.avatar} alt={group.name} />
                    <AvatarFallback>{group.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{group.name}</p>
                    <p className="text-xs text-muted-foreground">{group.memberCount} members</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">No mutual groups</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

