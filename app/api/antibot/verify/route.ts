// app/api/antibot/verify/route.ts
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  const { riskScore, verdict, eligible } = await req.json()

  let finalVerdict: "human-likely" | "bot-likely" | "blocked" | "unknown" = "unknown"

  if (riskScore >= 80 || verdict === "blocked") {
    finalVerdict = "blocked"
  } else if (verdict === "bot-likely" || riskScore >= 70) {
    finalVerdict = "bot-likely"
  } else if (eligible && riskScore < 50) {
    finalVerdict = "human-likely"
  } else {
    finalVerdict = verdict || "unknown"
  }

  const res = NextResponse.json({ verdict: finalVerdict })

  res.cookies.set({
    name: "abg_verdict",
    value: finalVerdict,
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 30, 
  })

  return res
}
