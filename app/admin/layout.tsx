"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/admin/app-sidebar"
import { useAuthStore } from "@/store/auth-store"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { adminAuthed } = useAuthStore()

  useEffect(() => {
    // Client-side guard for admin area (placeholder auth)
    if (!adminAuthed && pathname !== "/admin/login") {
      router.replace("/admin/login")
    }
  }, [adminAuthed, pathname, router])

  if (!adminAuthed && pathname !== "/admin/login") return null

  if (pathname === "/admin/login") {
    // Render login page without admin chrome
    return children
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
