// store/code-store.ts - Updated to use Supabase
"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { genRandomCode } from "@/lib/code-utils"
import { 
  getAccessCodes, 
  createAccessCode, 
  revokeAccessCode, 
  activateAccessCode, 
  deleteAccessCodes,
  validateAccessCode,
  type AccessCode 
} from "@/lib/database"

type CodeState = {
  codes: AccessCode[]
  selected: string[]
  loading: boolean
  error: string | null
  
  // Data loading
  loadCodes: () => Promise<void>
  
  // Code validation
  findCode: (code: string) => Promise<AccessCode | null>
  
  // Generation
  generateOne: (name?: string, classId?: string) => Promise<string>
  generateBulk: (n: number, names?: (string | undefined)[], classId?: string) => Promise<string[]>
  
  // Mutations
  revoke: (code: string) => Promise<void>
  activate: (code: string) => Promise<void>
  removeMany: (codes: string[]) => Promise<void>
  
  // Local state management
  setError: (error: string | null) => void
  clearSelection: () => void
  toggleSelect: (code: string) => void
  selectAllOnPage: (ids: string[]) => void
}

export const useCodeStore = create<CodeState>()(
  persist(
    (set, get) => ({
      codes: [],
      selected: [],
      loading: false,
      error: null,

      loadCodes: async () => {
        set({ loading: true, error: null })
        try {
          const codes = await getAccessCodes()
          set({ codes, loading: false })
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load codes',
            loading: false 
          })
        }
      },

      findCode: async (code: string) => {
        try {
          return await validateAccessCode(code)
        } catch (error) {
          console.error('Error validating code:', error)
          return null
        }
      },

      generateOne: async (name?: string, classId?: string) => {
        set({ loading: true, error: null })
        try {
          const code = genRandomCode()
          // Use first available class if no classId provided
          const state = get()
          let targetClassId = classId
          
          if (!targetClassId && state.codes.length > 0) {
            targetClassId = state.codes[0].class_id
          }
          
          if (!targetClassId) {
            throw new Error('No class available. Please create a class first.')
          }

          const newCode = await createAccessCode(code, targetClassId, name?.trim())
          
          set(state => ({ 
            codes: [newCode, ...state.codes],
            loading: false 
          }))
          
          return code
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to generate code',
            loading: false 
          })
          throw error
        }
      },

      generateBulk: async (n: number, names?: (string | undefined)[], classId?: string) => {
        set({ loading: true, error: null })
        try {
          const codes: string[] = []
          const state = get()
          let targetClassId = classId
          
          if (!targetClassId && state.codes.length > 0) {
            targetClassId = state.codes[0].class_id
          }
          
          if (!targetClassId) {
            throw new Error('No class available. Please create a class first.')
          }

          const newCodes: AccessCode[] = []
          
          for (let i = 0; i < n; i++) {
            const code = genRandomCode()
            const name = names?.[i]?.trim()
            const newCode = await createAccessCode(code, targetClassId, name)
            codes.push(code)
            newCodes.push(newCode)
          }
          
          set(state => ({ 
            codes: [...newCodes, ...state.codes],
            loading: false 
          }))
          
          return codes
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to generate codes',
            loading: false 
          })
          throw error
        }
      },

      revoke: async (code: string) => {
        set({ loading: true, error: null })
        try {
          await revokeAccessCode(code)
          set(state => ({
            codes: state.codes.map(c => 
              c.code === code.toUpperCase() ? { ...c, status: 'revoked' } : c
            ),
            loading: false
          }))
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to revoke code',
            loading: false 
          })
        }
      },

      activate: async (code: string) => {
        set({ loading: true, error: null })
        try {
          await activateAccessCode(code)
          set(state => ({
            codes: state.codes.map(c => 
              c.code === code.toUpperCase() ? { ...c, status: 'active' } : c
            ),
            loading: false
          }))
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to activate code',
            loading: false 
          })
        }
      },

      removeMany: async (codes: string[]) => {
        set({ loading: true, error: null })
        try {
          await deleteAccessCodes(codes)
          const upperCodes = codes.map(c => c.toUpperCase())
          set(state => ({
            codes: state.codes.filter(c => !upperCodes.includes(c.code)),
            selected: state.selected.filter(c => !upperCodes.includes(c)),
            loading: false
          }))
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to delete codes',
            loading: false 
          })
        }
      },

      setError: (error: string | null) => set({ error }),
      
      clearSelection: () => set({ selected: [] }),
      
      toggleSelect: (code: string) => {
        const id = code.toUpperCase()
        set(state => ({
          selected: state.selected.includes(id)
            ? state.selected.filter(x => x !== id)
            : [...state.selected, id]
        }))
      },
      
      selectAllOnPage: (ids: string[]) => {
        set({ selected: ids.map(x => x.toUpperCase()) })
      },
    }),
    {
      name: "code-store-cache",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Only persist UI state, not the codes themselves
      partialize: (state) => ({ 
        selected: state.selected 
      }),
    }
  )
)