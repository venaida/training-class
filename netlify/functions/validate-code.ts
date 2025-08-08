import { Handler } from '@netlify/functions'
import { supabase } from '../../lib/supabase'

export const handler: Handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  }

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { code } = JSON.parse(event.body || '{}')
    
    if (!code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Access code is required' })
      }
    }

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

    if (error || !data || !data.classes?.is_active) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          valid: false, 
          error: 'Invalid or inactive access code' 
        })
      }
    }

    // Log access attempt
    await supabase
      .from('students')
      .insert({
        access_code_id: data.id,
        ip_address: event.headers['x-forwarded-for'] || event.headers['client-ip'],
        user_agent: event.headers['user-agent']
      })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: true,
        accessCode: {
          id: data.id,
          code: data.code,
          class_name: data.classes?.name,
          jitsi_room_name: data.classes?.jitsi_room_name
        }
      })
    }
  } catch (error) {
    console.error('Function error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}