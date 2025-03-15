"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { BellOff, Bell, Copy, Trash2, Reply, Forward, Pin, PinOff, UserPlus, UserMinus } from "lucide-react"
import { cn } from "@/lib/utils"

interface ContextMenuItem {
  icon: React.ReactNode
  label: string
  onClick: () => void
  className?: string
  divider?: boolean
}

interface ContextMenuProps {
  items: ContextMenuItem[]
  x: number
  y: number
  onClose: () => void
}

export function ContextMenu({ items, x, y, onClose }: ContextMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ x, y })

  // Adjust position if menu would go off screen
  React.useEffect(() => {
    if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect()
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight

      let adjustedX = x
      let adjustedY = y

      if (x + menuRect.width > windowWidth) {
        adjustedX = windowWidth - menuRect.width - 10
      }

      if (y + menuRect.height > windowHeight) {
        adjustedY = windowHeight - menuRect.height - 10
      }

      setPosition({ x: adjustedX, y: adjustedY })
    }
  }, [x, y])

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [onClose])

  // Close menu when pressing Escape
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={menuRef}
      className="absolute z-50 min-w-[160px] overflow-hidden rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="flex flex-col">
        {items.map((item, index) => (
          <React.Fragment key={index}>
            <button
              className={cn(
                "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                item.className,
              )}
              onClick={(e) => {
                e.stopPropagation()
                item.onClick()
                onClose()
              }}
            >
              <span className="mr-2 h-4 w-4">{item.icon}</span>
              <span>{item.label}</span>
            </button>
            {item.divider && <div className="my-1 h-px bg-muted" />}
          </React.Fragment>
        ))}
      </div>
    </div>,
    document.body,
  )
}

export function useContextMenu() {
  const [contextMenu, setContextMenu] = React.useState<{
    show: boolean
    x: number
    y: number
    data?: any
  }>({
    show: false,
    x: 0,
    y: 0,
    data: null,
  })

  const showContextMenu = React.useCallback((e: React.MouseEvent, data?: any) => {
    e.preventDefault()
    e.stopPropagation()

    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      data,
    })
  }, [])

  const hideContextMenu = React.useCallback(() => {
    setContextMenu({
      show: false,
      x: 0,
      y: 0,
      data: null,
    })
  }, [])

  return {
    contextMenu,
    showContextMenu,
    hideContextMenu,
  }
}

export function createContextMenuItems({
  isMuted,
  isPinned,
  isContact,
  onMute,
  onPin,
  onDelete,
  onCopy,
  onReply,
  onForward,
  onToggleContact,
}: {
  isMuted?: boolean
  isPinned?: boolean
  isContact?: boolean
  onMute?: () => void
  onPin?: () => void
  onDelete?: () => void
  onCopy?: () => void
  onReply?: () => void
  onForward?: () => void
  onToggleContact?: () => void
}) {
  const items: ContextMenuItem[] = []

  if (onReply) {
    items.push({
      icon: <Reply className="h-4 w-4" />,
      label: "Reply",
      onClick: onReply,
    })
  }

  if (onForward) {
    items.push({
      icon: <Forward className="h-4 w-4" />,
      label: "Forward",
      onClick: onForward,
    })
  }

  if (onCopy) {
    items.push({
      icon: <Copy className="h-4 w-4" />,
      label: "Copy",
      onClick: onCopy,
    })
  }

  if (onMute) {
    items.push({
      icon: isMuted ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />,
      label: isMuted ? "Unmute" : "Mute",
      onClick: onMute,
    })
  }

  if (onPin) {
    items.push({
      icon: isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />,
      label: isPinned ? "Unpin" : "Pin",
      onClick: onPin,
    })
  }

  if (onToggleContact) {
    items.push({
      icon: isContact ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />,
      label: isContact ? "Remove Contact" : "Add Contact",
      onClick: onToggleContact,
      divider: true,
    })
  }

  if (onDelete) {
    items.push({
      icon: <Trash2 className="h-4 w-4" />,
      label: "Delete",
      onClick: onDelete,
      className: "text-destructive hover:text-destructive",
    })
  }

  return items
}

