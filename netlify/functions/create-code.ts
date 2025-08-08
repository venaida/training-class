import { Handler } from '@netlify/functions'
import { createAccessCode } from '../../lib/database'
import { genRandomCode } from '../../lib/code-utils'
import { verifyToken } from '../../lib/auth'

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    // Verify admin authentication
    const authHeader = event.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication required' })
      }
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    
    if (!payload || !payload.admin) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid authentication' })
      }
    }

    const { classId, studentName, count = 1 } = JSON.parse(event.body || '{}')
    
    if (!classId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Class ID is required' })
      }
    }

    // Generate codes
    const codes = []
    for (let i = 0; i < count; i++) {
      const code = genRandomCode()
      const newCode = await createAccessCode(code, classId, studentName)
      codes.push(newCode)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        codes 
      })
    }
  } catch (error) {
    console.error('Code creation error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}