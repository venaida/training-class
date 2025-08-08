"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCodeStore } from "@/store/code-store"
import { Badge } from "@/components/ui/badge"

export default function AdminDashboardPage() {
  const { codes } = useCodeStore()
  const total = codes.length
  const active = codes.filter((c) => c.status === "active").length
  const revoked = codes.filter((c) => c.status === "revoked").length

  return (
    <main className="p-4 md:p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Quick stats overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-indigo-50 to-white">
          <CardHeader>
            <CardTitle>Total Codes</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{total}</CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-white">
          <CardHeader>
            <CardTitle>Active</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold flex items-center gap-2">
            {active}
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
              {(total ? Math.round((active / total) * 100) : 0) + "%"}
            </Badge>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-50 to-white">
          <CardHeader>
            <CardTitle>Revoked</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{revoked}</CardContent>
        </Card>
      </div>
    </main>
  )
}
