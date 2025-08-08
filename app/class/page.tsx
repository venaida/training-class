// app/class/page.tsx - Updated with dynamic Jitsi rooms
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut, Video, Users, Clock } from 'lucide-react'

interface StudentSession {
  accessCode: string
  className: string
  jitsiRoom: string
  joinedAt: string
}

function TopBar({ 
  title = "Live Class", 
  participantCount = 0,
  duration = "00:00"
}: { 
  title?: string
  participantCount?: number 
  duration?: string
}) {
  const router = useRouter()
  
  function leave() {
    try {
      localStorage.removeItem("student:session")
    } catch {}
    router.push("/")
  }
  
  return (
    <header className="w-full h-14 px-4 flex items-center justify-between bg-black/50 backdrop-blur-md border-b border-white/10 text-white">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-indigo-400" />
          <span className="font-medium">{title}</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-sm text-white/70">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{participantCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{duration}</span>
          </div>
        </div>
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
  const [session, setSession] = useState<StudentSession | null>(null)
  const [jitsiDomain] = useState(process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si')
  const [duration, setDuration] = useState("00:00")

  useEffect(() => {
    // Load session data
    try {
      const sessionData = localStorage.getItem("student:session")
      if (!sessionData) {
        router.replace("/")
        return
      }
      const parsedSession = JSON.parse(sessionData)
      setSession(parsedSession)
    } catch (error) {
      console.error("Failed to load session:", error)
      router.replace("/")
    }
  }, [router])

  useEffect(() => {
    // Update duration timer
    if (!session?.joinedAt) return

    const startTime = new Date(session.joinedAt).getTime()
    
    const updateDuration = () => {
      const now = Date.now()
      const elapsed = Math.floor((now - startTime) / 1000)
      const minutes = Math.floor(elapsed / 60)
      const seconds = elapsed % 60
      setDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
    }

    updateDuration()
    const interval = setInterval(updateDuration, 1000)
    
    return () => clearInterval(interval)
  }, [session?.joinedAt])

  if (!session) {
    return (
      <div className="min-h-[100dvh] bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading class...</p>
        </div>
      </div>
    )
  }

  const jitsiUrl = `https://${jitsiDomain}/${session.jitsiRoom}?userInfo.displayName=Student&config.startWithAudioMuted=true`

  return (
    <div className="min-h-[100dvh] bg-neutral-950 text-white">
      <TopBar 
        title={session.className || "Live Class"} 
        duration={duration}
      />
      <div className="h-[calc(100dvh-56px)] w-full">
        <iframe
          title={`${session.className} - Live Class`}
          src={jitsiUrl}
          className="w-full h-full border-0"
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  )
}