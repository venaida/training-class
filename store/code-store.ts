"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { genRandomCode } from "@/lib/code-utils"

export type AccessCode = {
  code: string
  name?: string
  status: "active" | "revoked"
  createdAt: number
}

type CodeState = {
  codes: AccessCode[]
  selected: string[]
  // seed
  seedIfEmpty: () => void
  // generation
  generateOne: (name?: string) => string
  generateBulk: (n: number, names?: (string | undefined)[]) => string[]
  // mutations
  revoke: (code: string) => void
  activate: (code: string) => void
  removeMany: (codes: string[]) => void
  addMany: (codes: string[]) => void
  addManyNamed: (items: { code: string; name?: string }[]) => void
  setName: (code: string, name?: string) => void
  setNamesBulk: (codes: string[], names: (string | undefined)[], overwrite?: boolean) => void
  upsertNames: (pairs: { code: string; name?: string }[]) => void
  findCode: (code: string) => AccessCode | undefined
  // selection
  toggleSelect: (code: string) => void
  clearSelection: () => void
  selectAllOnPage: (ids: string[]) => void
}

export const useCodeStore = create<CodeState>()(
  persist(
    (set, get) => ({
      codes: [],
      selected: [],
      seedIfEmpty: () => {
        const { codes } = get()
        if (codes.length > 0) return
        const demo = Array.from({ length: 6 }, () => genRandomCode())
        const now = Date.now()
        set({
          codes: demo.map((c, i) => ({
            code: c,
            name: i === 0 ? "Alice" : i === 1 ? "Bob" : "",
            status: i % 5 === 0 ? "revoked" : "active",
            createdAt: now - i * 3600_000,
          })),
        })
      },
      generateOne: (name?: string) => {
        const code = genRandomCode()
        const item: AccessCode = { code, name: name?.trim() || "", status: "active", createdAt: Date.now() }
        set((s) => ({ codes: [item, ...s.codes] }))
        return code
      },
      generateBulk: (n: number, names?: (string | undefined)[]) => {
        const list = Array.from({ length: n }, () => genRandomCode())
        const now = Date.now()
        const items: AccessCode[] = list.map((code, idx) => ({
          code,
          name: names?.[idx]?.trim() || "",
          status: "active",
          createdAt: now,
        }))
        set((s) => ({ codes: [...items, ...s.codes] }))
        return list
      },
      revoke: (code: string) => {
        const id = code.toUpperCase()
        set((s) => ({
          codes: s.codes.map((c) => (c.code === id ? { ...c, status: "revoked" } : c)),
        }))
      },
      activate: (code: string) => {
        const id = code.toUpperCase()
        set((s) => ({
          codes: s.codes.map((c) => (c.code === id ? { ...c, status: "active" } : c)),
        }))
      },
      removeMany: (ids: string[]) => {
        const setIds = new Set(ids.map((x) => x.toUpperCase()))
        set((s) => ({
          codes: s.codes.filter((c) => !setIds.has(c.code)),
          selected: s.selected.filter((id) => !setIds.has(id)),
        }))
      },
      addMany: (codes: string[]) => {
        const setExisting = new Set(get().codes.map((c) => c.code))
        const now = Date.now()
        const items: AccessCode[] = codes
          .map((code) => code.toUpperCase().trim())
          .filter((c) => c && !setExisting.has(c))
          .map((code) => ({ code, name: "", status: "active", createdAt: now }))
        if (items.length) {
          set((s) => ({ codes: [...items, ...s.codes] }))
        }
      },
      addManyNamed: (items: { code: string; name?: string }[]) => {
        const now = Date.now()
        const existing = new Map(get().codes.map((c) => [c.code, c] as const))
        const newOnes: AccessCode[] = []
        for (const it of items) {
          const code = it.code.toUpperCase().trim()
          const name = it.name?.trim() || ""
          if (!code) continue
          if (existing.has(code)) {
            // update name for existing
            set((s) => ({
              codes: s.codes.map((c) => (c.code === code ? { ...c, name } : c)),
            }))
          } else {
            newOnes.push({ code, name, status: "active", createdAt: now })
          }
        }
        if (newOnes.length) {
          set((s) => ({ codes: [...newOnes, ...s.codes] }))
        }
      },
      setName: (code: string, name?: string) => {
        const id = code.toUpperCase()
        set((s) => ({
          codes: s.codes.map((c) => (c.code === id ? { ...c, name: name?.trim() || "" } : c)),
        }))
      },
      setNamesBulk: (codes: string[], names: (string | undefined)[], overwrite = true) => {
        const nameMap = new Map<string, string | undefined>()
        codes.forEach((c, idx) => nameMap.set(c.toUpperCase(), names[idx]))
        set((s) => ({
          codes: s.codes.map((c) => {
            const nxt = nameMap.get(c.code)
            if (nxt === undefined) return c
            if (!overwrite && c.name) return c
            return { ...c, name: (nxt ?? "").trim() }
          }),
        }))
      },
      upsertNames: (pairs: { code: string; name?: string }[]) => {
        const map = new Map(pairs.map((p) => [p.code.toUpperCase(), (p.name ?? "").trim()]))
        set((s) => ({
          codes: s.codes.map((c) => (map.has(c.code) ? { ...c, name: map.get(c.code) } : c)),
        }))
      },
      findCode: (code: string) => {
        const needle = code.toUpperCase()
        return get().codes.find((c) => c.code === needle)
      },
      toggleSelect: (code: string) => {
        const id = code.toUpperCase()
        set((s) => ({
          selected: s.selected.includes(id)
            ? s.selected.filter((x) => x !== id)
            : [...s.selected, id],
        }))
      },
      clearSelection: () => set({ selected: [] }),
      selectAllOnPage: (ids: string[]) => {
        set({ selected: ids.map((x) => x.toUpperCase()) })
      },
    }),
    {
      name: "code-store",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted: any, fromVersion) => {
        if (!persisted) return persisted
        if (fromVersion < 2 && Array.isArray(persisted.state?.codes)) {
          persisted.state.codes = persisted.state.codes.map((c: any) => ({
            name: "",
            ...c,
          }))
        }
        return persisted
      },
    }
  )
)
