export function NoChat() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md space-y-4">
        <h2 className="text-2xl font-bold">Welcome to Multi-Telegram</h2>
        <p className="text-muted-foreground">
          Select a chat from the list to start messaging, or create a new conversation.
        </p>
      </div>
    </div>
  )
}

