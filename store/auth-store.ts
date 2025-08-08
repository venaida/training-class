"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

type AuthState = {
  adminAuthed: boolean
  login: (password: string) => boolean
  logout: () => void
}

const ADMIN_PASSWORD_PLACEHOLDER = "admin123"

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      adminAuthed: false,
      login: (password: string) => {
        const ok = password === ADMIN_PASSWORD_PLACEHOLDER
        if (ok) set({ adminAuthed: true })
        return ok
      },
      logout: () => set({ adminAuthed: false }),
    }),
    {
      name: "admin-auth",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
)
