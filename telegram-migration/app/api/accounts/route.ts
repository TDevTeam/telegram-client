import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Forward to the Express backend
    const apiUrl = `http://${process.env.NEXT_PUBLIC_WS_HOST || "localhost"}:${process.env.EXPRESS_PORT || 4000}/api/accounts`
    const response = await fetch(apiUrl)

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching accounts:", error)
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Forward to the Express backend
    const apiUrl = `http://${process.env.NEXT_PUBLIC_WS_HOST || "localhost"}:${process.env.EXPRESS_PORT || 4000}/api/accounts`
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error adding account:", error)
    return NextResponse.json({ error: "Failed to add account" }, { status: 500 })
  }
}

