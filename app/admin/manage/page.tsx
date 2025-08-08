"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useCodeStore } from "@/store/code-store"
import { useToast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { CheckCircle2, Circle, ClipboardCopy, FileDown, Search, ShieldOff, Trash2 } from 'lucide-react'
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { createCodesWithNamesCSV, downloadCSV } from "@/lib/code-utils"

export default function ManageCodesPage() {
  const { toast } = useToast()
  const {
    codes,
    selected,
    toggleSelect,
    selectAllOnPage,
    clearSelection,
    revoke,
    activate,
    removeMany,
    setName,
  } = useCodeStore()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<"all" | "active" | "revoked">("all")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return codes.filter((c) => {
      const matchQ = !q || c.code.toLowerCase().includes(q) || (c.name ?? "").toLowerCase().includes(q)
      const matchS = status === "all" ? true : c.status === status
      return matchQ && matchS
    })
  }, [codes, query, status])

  const allPageIds = filtered.map((c) => c.code)
  const allSelectedOnPage = allPageIds.every((id) => selected.includes(id))

  function bulkRevoke() {
    selected.forEach((id) => revoke(id))
    toast({ title: "Selected codes revoked", description: `${selected.length} code(s) updated` })
    clearSelection()
  }

  function bulkDelete() {
    removeMany(selected)
    toast({ title: "Selected codes deleted", description: `${selected.length} code(s) removed` })
    clearSelection()
  }

  function copyCode(code: string) {
    navigator.clipboard?.writeText(code)
    toast({ title: "Copied", description: code })
  }

  function exportSelectedCSV() {
    const map = new Map(codes.map((c) => [c.code, c] as const))
    const items = selected.map((id) => map.get(id)!).filter(Boolean)
    const csv = createCodesWithNamesCSV(items.map((i) => ({ code: i.code, name: i.name })))
    downloadCSV("selected-codes-with-names.csv", csv)
  }

  return (
    <main className="p-4 md:p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Manage Codes</h1>
        <p className="text-sm text-muted-foreground">Search, filter, edit names, revoke/activate, copy, delete, and export</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find by code or name"
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v: "all" | "active" | "revoked") => setStatus(v)}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="hidden sm:block" />
        </CardContent>
      </Card>

      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <button
                  className={cn(
                    "h-5 w-5 inline-flex items-center justify-center rounded border",
                    allSelectedOnPage ? "bg-indigo-600 border-indigo-600" : "bg-background"
                  )}
                  aria-label="Select all on page"
                  onClick={() => selectAllOnPage(allSelectedOnPage ? [] : allPageIds)}
                >
                  {allSelectedOnPage && <CheckCircle2 className="h-4 w-4 text-white" />}
                </button>
              </TableHead>
              <TableHead>Access Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => {
              const isSelected = selected.includes(c.code)
              return (
                <TableRow key={c.code} data-state={isSelected ? "selected" : undefined}>
                  <TableCell>
                    <button
                      className={cn(
                        "h-5 w-5 inline-flex items-center justify-center rounded border",
                        isSelected ? "bg-indigo-600 border-indigo-600" : "bg-background"
                      )}
                      aria-label={`Select ${c.code}`}
                      onClick={() => toggleSelect(c.code)}
                    >
                      {isSelected ? <CheckCircle2 className="h-4 w-4 text-white" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="font-mono">{c.code}</code>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyCode(c.code)} title="Copy code">
                        <ClipboardCopy className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={c.name ?? ""}
                      placeholder="Assign a name"
                      onChange={(e) => setName(c.code, e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        c.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      )}
                    >
                      {c.status === "active" ? "Active" : "Revoked"}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(c.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {c.status === "active" ? (
                      <Button variant="outline" size="sm" onClick={() => revoke(c.code)}>
                        <ShieldOff className="mr-2 h-4 w-4" />
                        Revoke
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => activate(c.code)}>
                        Activate
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete code {c.code}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-rose-600 hover:bg-rose-700"
                            onClick={() => {
                              // reuse removeMany with single
                              useCodeStore.getState().removeMany([c.code])
                            }}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              )
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No codes found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20">
          <div className="mx-auto max-w-6xl px-4 pb-4">
            <div className="rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3 shadow-lg flex items-center gap-2">
              <div className="text-sm">
                {selected.length} selected
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={bulkRevoke}>
                  Revoke Selected
                </Button>

                <Button variant="outline" onClick={exportSelectedCSV}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export Selected CSV
                </Button>

                <BulkAssignNamesButton />

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Selected
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete selected codes?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This cannot be undone. You are about to delete {selected.length} code(s).
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={bulkDelete}>
                        Confirm Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Button variant="ghost" onClick={clearSelection}>
                  Clear Selection
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function BulkAssignNamesButton() {
  const { selected, setNamesBulk } = useCodeStore()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [prefix, setPrefix] = useState("Student-")
  const [startAt, setStartAt] = useState<number>(1)
  const [overwrite, setOverwrite] = useState(true)

  function apply() {
    const names = selected.map((_, i) => `${prefix}${i + (Number.isFinite(startAt) ? startAt : 1)}`)
    setNamesBulk(selected, names, overwrite)
    toast({ title: "Names assigned", description: `Assigned ${names.length} name(s)` })
    setOpen(false)
  }

  function clear() {
    const names = selected.map(() => "")
    setNamesBulk(selected, names, true)
    toast({ title: "Names cleared", description: `${names.length} entry(ies) cleared` })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          Assign Names
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Assign Names</DialogTitle>
          <DialogDescription>Use a prefix with incremental numbers.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="prefix">Prefix</Label>
            <Input id="prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startAt">Start at</Label>
            <Input
              id="startAt"
              type="number"
              min={0}
              value={startAt}
              onChange={(e) => setStartAt(parseInt(e.target.value || "1", 10))}
              className="max-w-[180px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="overwrite" checked={overwrite} onCheckedChange={(v) => setOverwrite(Boolean(v))} />
            <Label htmlFor="overwrite">Overwrite existing names</Label>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={clear}>Clear Names</Button>
          <Button onClick={apply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
