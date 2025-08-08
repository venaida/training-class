import { supabase } from './supabase'
import type { DatabaseAccessCode, DatabaseClass } from './supabase'

export interface AccessCode {
  id: string
  code: string
  student_name?: string
  class_id: string
  status: 'active' | 'revoked'
  created_at: string
  class_name?: string
  jitsi_room_name?: string
}

export async function createAccessCode(
  code: string, 
  classId: string, 
  studentName?: string
): Promise<AccessCode> {
  const { data, error } = await supabase
    .from('access_codes')
    .insert({
      code: code.toUpperCase(),
      class_id: classId,
      student_name: studentName || null
    })
    .select(`
      *,
      classes (
        name,
        jitsi_room_name
      )
    `)
    .single()

  if (error) throw error
  
  return {
    ...data,
    class_name: data.classes?.name,
    jitsi_room_name: data.classes?.jitsi_room_name
  }
}

export async function getAccessCodes(classId?: string): Promise<AccessCode[]> {
  let query = supabase
    .from('access_codes')
    .select(`
      *,
      classes (
        name,
        jitsi_room_name
      )
    `)
    .order('created_at', { ascending: false })

  if (classId) {
    query = query.eq('class_id', classId)
  }

  const { data, error } = await query

  if (error) throw error

  return data.map(item => ({
    ...item,
    class_name: item.classes?.name,
    jitsi_room_name: item.classes?.jitsi_room_name
  }))
}

export async function validateAccessCode(code: string): Promise<AccessCode | null> {
  const { data, error } = await supabase
    .from('access_codes')
    .select(`
      *,
      classes (
        name,
        jitsi_room_name,
        is_active
      )
    `)
    .eq('code', code.toUpperCase())
    .eq('status', 'active')
    .single()

  if (error || !data || !data.classes?.is_active) return null

  return {
    ...data,
    class_name: data.classes?.name,
    jitsi_room_name: data.classes?.jitsi_room_name
  }
}

export async function revokeAccessCode(code: string): Promise<void> {
  const { error } = await supabase
    .from('access_codes')
    .update({ status: 'revoked' })
    .eq('code', code.toUpperCase())

  if (error) throw error
}

export async function activateAccessCode(code: string): Promise<void> {
  const { error } = await supabase
    .from('access_codes')
    .update({ status: 'active' })
    .eq('code', code.toUpperCase())

  if (error) throw error
}

export async function deleteAccessCodes(codes: string[]): Promise<void> {
  const { error } = await supabase
    .from('access_codes')
    .delete()
    .in('code', codes.map(c => c.toUpperCase()))

  if (error) throw error
}

export async function getClasses(): Promise<DatabaseClass[]> {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createClass(
  name: string,
  description: string,
  jitsiRoomName: string
): Promise<DatabaseClass> {
  // For now, we'll use a default admin_id
  // In a real app, you'd get this from the authenticated user
  const { data: admin } = await supabase
    .from('admins')
    .select('id')
    .limit(1)
    .single()

  const { data, error } = await supabase
    .from('classes')
    .insert({
      name,
      description,
      jitsi_room_name: jitsiRoomName,
      admin_id: admin?.id
    })
    .select()
    .single()

  if (error) throw error
  return data
}