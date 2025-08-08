"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { BarChart2, KeyRound, Settings2, Upload, XCircle, LogOut } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/auth-store"

const items = [
  { title: "Dashboard", url: "/admin", icon: BarChart2 },
  { title: "Generate Codes", url: "/admin/generate", icon: KeyRound },
  { title: "Manage Codes", url: "/admin/manage", icon: Settings2 },
  { title: "Bulk Upload", url: "/admin/upload", icon: Upload },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { logout } = useAuthStore()

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-2">
          <SidebarTrigger />
          <span className="font-semibold">Admin</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Class Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Danger Zone</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => {
                    logout()
                    window.location.href = "/admin/login"
                  }}
                  className="text-rose-600 hover:text-rose-700 data-[active=true]:text-rose-700"
                >
                  <LogOut />
                  <span>Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <div className="px-2 py-1 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Live Class
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
