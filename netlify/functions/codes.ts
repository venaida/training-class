// netlify/functions/codes.ts
import { Handler } from '@netlify/functions'
import { SupabaseService, generateAccessCode, generateBulkCodes } from '../../lib/supabase'

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  }

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    // GET - Fetch all codes
    if (event.httpMethod === 'GET') {
      const codes = await SupabaseService.getAccessCodes()
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(codes)
      }
    }

    // POST - Handle various actions
    if (event.httpMethod === 'POST') {
      const { action, ...data } = JSON.parse(event.body || '{}')

      switch (action) {
        case 'generate_one': {
          const code = generateAccessCode()
          const result = await SupabaseService.createAccessCode(code, data.name)
          return {
            statusCode: 201,
            headers,
            body: JSON.stringify(result)
          }
        }

        case 'generate_bulk': {
          const { count, names = [] } = data
          const codes = generateBulkCodes(count)
          const items = codes.map((code, idx) => ({
            code,
            name: names[idx]?.trim() || ''
          }))
          const result = await SupabaseService.createManyAccessCodes(items)
          return {
            statusCode: 201,
            headers,
            body: JSON.stringify({ codes, result })
          }
        }

        case 'add_many': {
          const { items } = data
          const result = await SupabaseService.createManyAccessCodes(items)
          return {
            statusCode: 201,
            headers,
            body: JSON.stringify(result)
          }
        }

        case 'update_status': {
          const { code, status } = data
          const result = await SupabaseService.updateAccessCodeStatus(code, status)
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
          }
        }

        case 'update_name': {
          const { code, name } = data
          const result = await SupabaseService.updateAccessCodeName(code, name)
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
          }
        }

        case 'delete_many': {
          const { codes } = data
          await SupabaseService.deleteAccessCodes(codes)
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ deleted: codes.length })
          }
        }

        default:
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid action' })
          }
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('API Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}

// netlify/functions/sessions.ts
import { Handler } from '@netlify/functions'
import { SupabaseService } from '../../lib/supabase'

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    // GET - Get sessions by room
    if (event.httpMethod === 'GET') {
      const roomName = event.queryStringParameters?.room
      if (!roomName) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Room name is required' })
        }
      }

      const sessions = await SupabaseService.getActiveSessionsByRoom(roomName)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(sessions)
      }
    }

    // POST - Create new session
    if (event.httpMethod === 'POST') {
      const { roomName, accessCode } = JSON.parse(event.body || '{}')
      
      if (!roomName || !accessCode) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Room name and access code are required' })
        }
      }

      // Verify access code exists and is active
      const codeData = await SupabaseService.findAccessCode(accessCode)
      if (!codeData || codeData.status !== 'ACTIVE') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Invalid or inactive access code' })
        }
      }

      const session = await SupabaseService.createVideoSession(roomName, accessCode)
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(session)
      }
    }

    // PATCH - Update session (end session, add/remove participants)
    if (event.httpMethod === 'PATCH') {
      const { sessionId, action, participantData } = JSON.parse(event.body || '{}')

      switch (action) {
        case 'add_participant': {
          const result = await SupabaseService.addParticipant(
            sessionId,
            participantData.id,
            participantData.displayName,
            participantData.email
          )
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
          }
        }

        case 'remove_participant': {
          const result = await SupabaseService.removeParticipant(
            sessionId,
            participantData.id
          )
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
          }
        }

        case 'end_session': {
          const result = await SupabaseService.endVideoSession(sessionId)
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
          }
        }

        default:
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid action' })
          }
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Sessions API Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}

// netlify/functions/validate-code.ts
import { Handler } from '@netlify/functions'
import { SupabaseService } from '../../lib/supabase'

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const code = event.queryStringParameters?.code
    if (!code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Access code is required' })
      }
    }

    const accessCode = await SupabaseService.findAccessCode(code)
    
    if (!accessCode) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          valid: false, 
          error: 'Access code not found' 
        })
      }
    }

    if (accessCode.status !== 'ACTIVE') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          valid: false, 
          error: 'Access code is not active' 
        })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        valid: true, 
        accessCode: {
          code: accessCode.code,
          name: accessCode.name
        }
      })
    }
  } catch (error) {
    console.error('Validate Code Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        valid: false,
        error: 'Internal server error'
      })
    }
  }
}