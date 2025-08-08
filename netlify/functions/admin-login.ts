import { Handler } from '@netlify/functions'
import { supabase } from '../../lib/supabase'
import { verifyPassword, generateToken } from '../../lib/auth'

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  }

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
    const { password, email } = JSON.parse(event.body || '{}')
    
    // Simple password auth (for quick setup)
    const adminPassword = process.env.ADMIN_PASSWORD
    if (password === adminPassword) {
      const token = generateToken({ admin: true, email: email || 'admin' })
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          token,
          admin: {
            id: 'admin',
            email: email || 'admin@youracademy.com',
            name: 'Academy Admin'
          }
        })
      }
    }

    // Advanced database auth (optional)
    if (email) {
      const { data: admin, error } = await supabase
        .from('admins')
        .select('id, email, name, password_hash')
        .eq('email', email)
        .single()

      if (!error && admin) {
        const isValid = await verifyPassword(password, admin.password_hash)
        if (isValid) {
          const token = generateToken({ 
            admin: true, 
            id: admin.id, 
            email: admin.email 
          })
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              token,
              admin: {
                id: admin.id,
                email: admin.email,
                name: admin.name
              }
            })
          }
        }
      }
    }

    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Invalid credentials' 
      })
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}