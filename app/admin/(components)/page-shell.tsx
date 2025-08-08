"use client"

import * as React from "react"

export default function PageShell({
  title = "Page",
  description = "",
  children,
}: {
  title?: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <main className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </main>
  )
}
