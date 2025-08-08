"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShieldCheck } from 'lucide-react'
import Link from "next/link"
import { useAuthStore } from "@/store/auth-store"

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const { adminAuthed, login } = useAuthStore()

  useEffect(() => {
    if (adminAuthed) router.replace("/admin")
  }, [adminAuthed, router])

  function handleLogin() {
    setError(null)
    const ok = login(password)
    if (ok) {
      router.replace("/admin")
    } else {
      setError("Invalid password. Please try again.")
    }
  }

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-4">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-700 via-purple-700 to-slate-900" />
      <Card className="w-full max-w-md border-white/10 bg-white/10 backdrop-blur-xl text-white">
        <CardHeader>
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription className="text-white/80">
            Enter the admin password to manage access codes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/40 text-white">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <label htmlFor="admin-password" className="sr-only">
            Admin Password
          </label>
          <Input
            id="admin-password"
            type="password"
            placeholder="Enter Admin Password"
            className="h-11 bg-white/20 border-white/20 placeholder:text-white/70 text-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            onClick={handleLogin}
            className="w-full bg-purple-500 hover:bg-purple-400 text-white"
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Sign In
          </Button>
          <div className="text-xs text-white/80 w-full flex items-center justify-between">
            <span>Back to</span>
            <Link href="/" className="underline underline-offset-4">
              Student Login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </main>
  )
}
