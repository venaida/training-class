"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut, Video } from 'lucide-react'

function TopBar({ title = "Live Class" }: { title?: string }) {
  const router = useRouter()
  function leave() {
    try {
      localStorage.removeItem("student:accessCode")
    } catch {}
    router.push("/")
  }
  return (
    <header className="w-full h-14 px-4 flex items-center justify-between bg-black/50 backdrop-blur-md border-b border-white/10 text-white">
      <div className="flex items-center gap-2">
        <Video className="h-5 w-5 text-indigo-400" />
        <span className="font-medium">{title}</span>
      </div>
      <Button
        variant="outline"
        className="border-white/20 text-white hover:bg-white/10"
        onClick={leave}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Leave Class
      </Button>
    </header>
  )
}

export default function LiveClassPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const code = typeof window !== "undefined" ? localStorage.getItem("student:accessCode") : null
    if (!code) {
      router.replace("/")
      return
    }
    setAuthorized(true)
  }, [router])

  if (!authorized) return null

  return (
    <div className="min-h-[100dvh] bg-neutral-950 text-white">
      <TopBar title="Next.js 15 Live Class" />
      <div className="h-[calc(100dvh-56px)] w-full">
        <iframe
          title="Jitsi Live Class"
          src={"https://meet.jit.si/Your-Class-Name-Demo"}
          className="w-full h-full border-0"
          allow="camera; microphone; fullscreen; display-capture"
        />
      </div>
    </div>
  )
}
