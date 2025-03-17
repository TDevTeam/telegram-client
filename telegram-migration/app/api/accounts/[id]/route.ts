import { NextResponse } from "next/server"

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // Forward to the Express backend
    const apiUrl = `http://${process.env.NEXT_PUBLIC_WS_HOST || "localhost"}:${process.env.EXPRESS_PORT || 4000}/api/accounts/${id}`
    const response = await fetch(apiUrl, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing account:", error)
    return NextResponse.json({ error: "Failed to remove account" }, { status: 500 })
  }
}

