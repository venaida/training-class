import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface DatabaseAccessCode {
  id: string
  code: string
  student_name?: string
  class_id: string
  status: 'active' | 'revoked'
  used_at?: string
  created_at: string
  updated_at: string
}

export interface DatabaseClass {
  id: string
  name: string
  description?: string
  admin_id: string
  jitsi_room_name: string
  is_active: boolean
  max_participants: number
  created_at: string
  updated_at: string
}

export interface DatabaseAdmin {
  id: string
  email: string
  password_hash: string
  name: string
  created_at: string
  updated_at: string
}