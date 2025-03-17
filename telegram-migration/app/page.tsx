import { AccountDashboard } from "@/components/account-dashboard"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Account Management System</h1>
        <AccountDashboard />
      </div>
    </main>
  )
}

