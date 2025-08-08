"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LogIn } from 'lucide-react'
import Link from "next/link"
import { useCodeStore } from "@/store/code-store"
import { cn } from "@/lib/utils"

export default function Page() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const { findCode, seedIfEmpty } = useCodeStore()

  useEffect(() => {
    setMounted(true)
    // Seed demo data on first visit
    seedIfEmpty()
  }, [seedIfEmpty])

  function handleJoin() {
    setError(null)
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      setError("Please enter an access code.")
      return
    }
    const existing = findCode(trimmed)
    if (!existing) {
      setError("Invalid access code. Please check and try again.")
      return
    }
    if (existing.status !== "active") {
      setError("This code has been revoked. Contact your instructor.")
      return
    }
    // Persist "student session" in localStorage (placeholder auth)
    try {
      localStorage.setItem("student:accessCode", trimmed)
    } catch {}
    router.push("/class")
  }

  return (
    <main
      className="min-h-[100dvh] w-full flex items-center justify-center px-4"
      aria-label="Student Login Page"
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-purple-700 via-indigo-700 to-slate-900" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
      <div className="w-full max-w-md">
        <Card
          className={cn(
            "border-white/10 bg-white/10 backdrop-blur-xl text-white shadow-2xl",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
            "transition-all duration-500"
          )}
        >
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Join Live Class</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/40 text-white">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <div className="h-0.5" />
            )}
            <label htmlFor="access-code" className="sr-only">
              Enter Access Code
            </label>
            <Input
              id="access-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter Access Code"
              className="h-11 bg-white/20 border-white/20 placeholder:text-white/70 text-white"
              aria-label="Enter Access Code"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleJoin()
              }}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              size="lg"
              className="w-full bg-indigo-500 hover:bg-indigo-400 text-white"
              onClick={handleJoin}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Join Class
            </Button>

            <div className="text-xs text-white/80 w-full flex items-center justify-between">
              <span>Instructor?</span>
              <Link href="/admin/login" className="underline underline-offset-4">
                Go to Admin Login
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
