// components/JitsiMeeting.tsx
"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SupabaseService, VideoSession, SessionParticipant } from '@/lib/supabase'
import { Video, VideoOff, Mic, MicOff, PhoneOff, Users, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { RealtimeChannel } from '@supabase/supabase-js'

declare global {
  interface Window {
    JitsiMeetExternalAPI: any
  }
}

interface JitsiMeetingProps {
  roomName: string
  accessCode: string
  userInfo?: {
    displayName?: string
    email?: string
  }
  domain?: string
  configOverrides?: any
  onMeetingEnd?: () => void
  onParticipantJoined?: (participant: Participant) => void
  onParticipantLeft?: (participant: Participant) => void
}

interface Participant {
  id: string
  displayName: string
  email?: string
  isLocal: boolean
  audioMuted: boolean
  videoMuted: boolean
}

export function JitsiMeeting({
  roomName,
  accessCode,
  userInfo,
  domain = 'meet.jit.si',
  configOverrides = {},
  onMeetingEnd,
  onParticipantJoined,
  onParticipantLeft
}: JitsiMeetingProps) {
  const apiRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Component state
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [localUser, setLocalUser] = useState<Participant | null>(null)
  const [session, setSession] = useState<VideoSession | null>(null)
  const [isAudioMuted, setIsAudioMuted] = useState(false)
  const [isVideoMuted, setIsVideoMuted] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [accessCodeValid, setAccessCodeValid] = useState<boolean | null>(null)
  
  // Real-time subscriptions
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null)
  const [participantsChannel, setParticipantsChannel] = useState<RealtimeChannel | null>(null)

  // Validate access code on mount
  useEffect(() => {
    const validateCode = async () => {
      try {
        const response = await fetch(`/.netlify/functions/validate-code?code=${accessCode}`)
        const result = await response.json()
        
        if (result.valid) {
          setAccessCodeValid(true)
        } else {
          setAccessCodeValid(false)
          setConnectionError(result.error || 'Invalid access code')
        }
      } catch (error) {
        setAccessCodeValid(false)
        setConnectionError('Failed to validate access code')
      }
    }
    
    if (accessCode) {
      validateCode()
    }
  }, [accessCode])

  // Create session in Supabase
  const createSession = useCallback(async () => {
    if (!accessCode || !accessCodeValid) return
    
    try {
      const response = await fetch('/.netlify/functions/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          accessCode
        })
      })
      
      if (response.ok) {
        const newSession = await response.json()
        setSession(newSession)
        
        // Add local user as participant
        if (localUser) {
          await addParticipantToSession(newSession.id, localUser)
        }
        
        // Setup real-time subscriptions
        initRealtimeSubscriptions(newSession.id)
      } else {
        const error = await response.json()
        setConnectionError(error.error || 'Failed to create session')
      }
    } catch (error) {
      console.error('Failed to create session:', error)
      setConnectionError('Failed to create video session')
    }
  }, [roomName, accessCode, accessCodeValid, localUser])

  // Add participant to session
  const addParticipantToSession = async (sessionId: string, participant: Participant) => {
    try {
      await fetch('/.netlify/functions/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: 'add_participant',
          participantData: {
            id: participant.id,
            displayName: participant.displayName,
            email: participant.email
          }
        })
      })
    } catch (error) {
      console.error('Failed to add participant to session:', error)
    }
  }

  // Remove participant from session
  const removeParticipantFromSession = async (sessionId: string, participantId: string) => {
    try {
      await fetch('/.netlify/functions/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: 'remove_participant',
          participantData: { id: participantId }
        })
      })
    } catch (error) {
      console.error('Failed to remove participant from session:', error)
    }
  }

  // End session
  const endSession = async () => {
    if (!session) return
    
    try {
      await fetch('/.netlify/functions/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          action: 'end_session'
        })
      })
      
      // Cleanup real-time subscriptions
      cleanupRealtimeSubscriptions()
    } catch (error) {
      console.error('Failed to end session:', error)
    }
  }

  // Initialize real-time subscriptions
  const initRealtimeSubscriptions = (sessionId: string) => {
    // Subscribe to session changes
    const sessionChannel = SupabaseService.subscribeToVideoSessions(roomName, (payload) => {
      if (payload.new?.id === sessionId) {
        setSession(payload.new)
      }
    })
    setRealtimeChannel(sessionChannel)

    // Subscribe to participant changes
    const participantChannel = SupabaseService.subscribeToSessionParticipants(sessionId, (payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload
      
      setParticipants(prev => {
        switch (eventType) {
          case 'INSERT':
            // Don't add if it's our local user (already added via Jitsi events)
            if (localUser && newRecord.participant_id === localUser.id) return prev
            
            const newParticipant: Participant = {
              id: newRecord.participant_id,
              displayName: newRecord.display_name || 'Anonymous',
              email: newRecord.email,
              isLocal: false,
              audioMuted: false,
              videoMuted: false
            }
            return [...prev, newParticipant]
            
          case 'UPDATE':
            return prev.map(p => 
              p.id === newRecord.participant_id 
                ? { ...p, displayName: newRecord.display_name || p.displayName }
                : p
            )
            
          case 'DELETE':
            return prev.filter(p => p.id !== oldRecord.participant_id)
            
          default:
            return prev
        }
      })
    })
    setParticipantsChannel(participantChannel)
  }

  // Cleanup real-time subscriptions
  const cleanupRealtimeSubscriptions = () => {
    if (realtimeChannel) {
      realtimeChannel.unsubscribe()
      setRealtimeChannel(null)
    }
    if (participantsChannel) {
      participantsChannel.unsubscribe()
      setParticipantsChannel(null)
    }
  }

  // Initialize Jitsi API
  useEffect(() => {
    if (accessCodeValid !== true) return

    const initJitsi = async () => {
      // Load Jitsi script if not already loaded
      if (!window.JitsiMeetExternalAPI) {
        const script = document.createElement('script')
        script.src = `https://${domain}/external_api.js`
        script.onload = () => initializeAPI()
        script.onerror = () => setConnectionError('Failed to load Jitsi Meet')
        document.head.appendChild(script)
      } else {
        initializeAPI()
      }
    }

    const initializeAPI = () => {
      if (!containerRef.current) return

      const options = {
        roomName: `${roomName}-${accessCode}`, // Include access code in room name for security
        width: '100%',
        height: 600,
        parentNode: containerRef.current,
        userInfo: {
          displayName: userInfo?.displayName || 'Anonymous',
          email: userInfo?.email || ''
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          enableWelcomePage: false,
          prejoinPageEnabled: false,
          requireDisplayName: true,
          ...configOverrides
        },
        interfaceConfigOverwrite: {
          TILE_VIEW_MAX_COLUMNS: 4,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: '#474747',
          DISABLE_PRESENCE_STATUS: false,
          MOBILE_APP_PROMO: false,
          SHOW_CHROME_EXTENSION_BANNER: false
        }
      }

      apiRef.current = new window.JitsiMeetExternalAPI(domain, options)

      // Event listeners
      apiRef.current.addEventListener('videoConferenceJoined', handleConferenceJoined)
      apiRef.current.addEventListener('videoConferenceLeft', handleConferenceLeft)
      apiRef.current.addEventListener('participantJoined', handleParticipantJoined)
      apiRef.current.addEventListener('participantLeft', handleParticipantLeft)
      apiRef.current.addEventListener('audioMuteStatusChanged', handleAudioMuteChanged)
      apiRef.current.addEventListener('videoMuteStatusChanged', handleVideoMuteChanged)
      apiRef.current.addEventListener('readyToClose', handleReadyToClose)

      setIsLoading(false)
    }

    initJitsi()

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose()
        apiRef.current = null
      }
      cleanupRealtimeSubscriptions()
    }
  }, [roomName, domain, userInfo, configOverrides, accessCodeValid])

  // Jitsi event handlers
  const handleConferenceJoined = useCallback((event: any) => {
    setIsConnected(true)
    setConnectionError(null)
    
    const participant: Participant = {
      id: event.id || 'local',
      displayName: event.displayName || userInfo?.displayName || 'You',
      email: userInfo?.email,
      isLocal: true,
      audioMuted: false,
      videoMuted: false
    }
    
    setLocalUser(participant)
    setParticipants([participant])
    createSession()
  }, [userInfo, createSession])

  const handleConferenceLeft = useCallback(() => {
    setIsConnected(false)
    endSession()
    onMeetingEnd?.()
  }, [onMeetingEnd])

  const handleParticipantJoined = useCallback((event: any) => {
    const participant: Participant = {
      id: event.id,
      displayName: event.displayName || 'Anonymous',
      email: event.email,
      isLocal: false,
      audioMuted: false,
      videoMuted: false
    }
    
    setParticipants(prev => [...prev, participant])
    
    // Add to session if it exists
    if (session) {
      addParticipantToSession(session.id, participant)
    }
    
    onParticipantJoined?.(participant)
  }, [session, onParticipantJoined])

  const handleParticipantLeft = useCallback((event: any) => {
    const participant = participants.find(p => p.id === event.id)
    
    setParticipants(prev => prev.filter(p => p.id !== event.id))
    
    // Remove from session
    if (session && participant) {
      removeParticipantFromSession(session.id, participant.id)
    }
    
    if (participant) {
      onParticipantLeft?.(participant)
    }
  }, [participants, session, onParticipantLeft])

  const handleAudioMuteChanged = useCallback((event: any) => {
    if (!event.id) {
      setIsAudioMuted(event.muted)
    }
    
    setParticipants(prev => prev.map(p => 
      p.id === event.id ? { ...p, audioMuted: event.muted } : p
    ))
  }, [])

  const handleVideoMuteChanged = useCallback((event: any) => {
    if (!event.id) {
      setIsVideoMuted(event.muted)
    }
    
    setParticipants(prev => prev.map(p => 
      p.id === event.id ? { ...p, videoMuted: event.muted } : p
    ))
  }, [])

  const handleReadyToClose = useCallback(() => {
    handleConferenceLeft()
  }, [handleConferenceLeft])

  // Control functions
  const toggleAudio = () => apiRef.current?.executeCommand('toggleAudio')
  const toggleVideo = () => apiRef.current?.executeCommand('toggleVideo')
  const hangUp = () => apiRef.current?.executeCommand('hangup')

  // Show error state
  if (accessCodeValid === false || connectionError) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-base">
              {connectionError || 'Invalid access code'}
            </AlertDescription>
          </Alert>
          <Button 
            className="mt-4" 
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Show loading state
  if (isLoading || accessCodeValid === null) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p>Loading video conference...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      {/* Meeting Info Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                {roomName}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Access Code: <code className="font-mono bg-muted px-1 rounded">{accessCode}</code>
                {session && (
                  <span className="ml-2">
                    • Session ID: <code className="font-mono text-xs">{session.id.slice(0, 8)}</code>
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
              <Badge variant={(realtimeChannel || participantsChannel) ? "default" : "outline"}>
                {(realtimeChannel || participantsChannel) ? (
                  <>
                    <Wifi className="h-3 w-3 mr-1" />
                    Live
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 mr-1" />
                    Offline
                  </>
                )}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Video Container */}
      <Card>
        <CardContent className="p-0">
          <div ref={containerRef} className="w-full min-h-[600px] bg-gray-900 rounded-lg overflow-hidden" />
        </CardContent>
      </Card>

      {/* Controls */}
      {isConnected && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant={isAudioMuted ? "destructive" : "default"}
                  size="sm"
                  onClick={toggleAudio}
                >
                  {isAudioMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                  variant={isVideoMuted ? "destructive" : "default"}
                  size="sm"
                  onClick={toggleVideo}
                >
                  {isVideoMuted ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {participants.length} participant{participants.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              <Button variant="destructive" size="sm" onClick={hangUp}>
                <PhoneOff className="h-4 w-4 mr-2" />
                Leave Meeting
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Participants List */}
      {participants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participants ({participants.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {participant.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {participant.displayName}
                      {participant.isLocal && <span className="text-muted-foreground"> (You)</span>}
                    </p>
                    {participant.email && (
                      <p className="text-xs text-muted-foreground">{participant.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {participant.audioMuted && (
                    <Badge variant="secondary" className="text-xs">
                      <MicOff className="h-3 w-3 mr-1" />
                      Muted
                    </Badge>
                  )}
                  {participant.videoMuted && (
                    <Badge variant="secondary" className="text-xs">
                      <VideoOff className="h-3 w-3 mr-1" />
                      Video Off
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}