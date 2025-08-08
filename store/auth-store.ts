// store/auth-store.ts - Updated with real authentication
"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { supabase } from "@/lib/supabase"
import { verifyPassword } from "@/lib/auth"

interface AdminUser {
  id: string
  email: string
  name: string
}

type AuthState = {
  adminAuthed: boolean
  admin: AdminUser | null
  loading: boolean
  error: string | null
  
  login: (password: string) => Promise<boolean>
  logout: () => void
  setError: (error: string | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      adminAuthed: false,
      admin: null,
      loading: false,
      error: null,

      login: async (password: string) => {
        set({ loading: true, error: null })
        
        try {
          // For now, use environment variable for simple auth
          // In production, you'd want to implement proper user authentication
          const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123'
          
          if (password === adminPassword) {
            // Get admin details from database
            const { data: admin, error } = await supabase
              .from('admins')
              .select('id, email, name')
              .limit(1)
              .single()

            if (error) {
              console.error('Database error:', error)
              // Fallback to basic auth if database fails
              const fallbackAdmin = {
                id: 'default-admin',
                email: 'admin@youracademy.com',
                name: 'Academy Admin'
              }
              set({ 
                adminAuthed: true, 
                admin: fallbackAdmin, 
                loading: false 
              })
              return true
            }

            set({ 
              adminAuthed: true, 
              admin, 
              loading: false 
            })
            return true
          } else {
            set({ 
              error: "Invalid password. Please try again.",
              loading: false 
            })
            return false
          }
        } catch (error) {
          console.error('Login error:', error)
          set({ 
            error: "Login failed. Please try again.",
            loading: false 
          })
          return false
        }
      },

      logout: () => {
        set({ 
          adminAuthed: false, 
          admin: null, 
          error: null 
        })
      },

      setError: (error: string | null) => set({ error }),
    }),
    {
      name: "admin-auth",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      partialize: (state) => ({
        adminAuthed: state.adminAuthed,
        admin: state.admin,
      }),
    }
  )
)

// Advanced authentication for production (optional)
export async function authenticateAdmin(email: string, password: string): Promise<AdminUser | null> {
  try {
    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, email, name, password_hash')
      .eq('email', email)
      .single()

    if (error || !admin) return null

    const isValid = await verifyPassword(password, admin.password_hash)
    if (!isValid) return null

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}