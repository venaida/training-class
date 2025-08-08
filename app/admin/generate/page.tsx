"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Copy, DownloadCloud, KeyRound, Plus } from 'lucide-react'
import { useCodeStore } from "@/store/code-store"
import { createCodesWithNamesCSV, downloadCSV } from "@/lib/code-utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"

export default function GenerateCodesPage() {
  const { toast } = useToast()
  const { codes, generateOne, generateBulk, setName, findCode } = useCodeStore()
  const [singleCode, setSingleCode] = useState<string | null>(null)
  const [singleName, setSingleName] = useState<string>("")
  const [count, setCount] = useState<number>(10)
  const [bulkCodes, setBulkCodes] = useState<string[]>([])
  const [bulkNamesRaw, setBulkNamesRaw] = useState<string>("") // optional names, one per line or single prefix
  const latestGenerated = useMemo(
    () => bulkCodes.map((code) => findCode(code)).filter(Boolean),
    [bulkCodes, findCode]
  )

  function handleGenerateSingle() {
    const code = generateOne(singleName)
    setSingleCode(code)
    if (singleName.trim()) setName(code, singleName.trim())
    navigator.clipboard?.writeText(code)
    toast({ title: "Code generated and copied", description: code })
  }

  function resolveBulkNames(n: number): (string | undefined)[] {
    const lines = bulkNamesRaw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
    if (lines.length === n) return lines
    if (lines.length === 1) {
      const prefix = lines[0]
      return Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`)
    }
    return Array.from({ length: n }, () => undefined)
  }

  function handleGenerateBulk() {
    const n = Math.max(1, Math.min(1000, Math.floor(count || 0)))
    const names = resolveBulkNames(n)
    const codes = generateBulk(n, names)
    // Ensure names persisted (generateBulk already sets names, but in case undefined => "")
    codes.forEach((c, i) => {
      if (names[i] !== undefined) setName(c, names[i])
    })
    setBulkCodes(codes)
    toast({ title: "Codes generated", description: `${codes.length} codes created` })
  }

  function copySingle() {
    if (!singleCode) return
    navigator.clipboard?.writeText(singleCode)
    toast({ title: "Copied to clipboard", description: singleCode })
  }

  function downloadBulkCSV() {
    if (!latestGenerated.length) return
    const csv = createCodesWithNamesCSV(
      latestGenerated.map((c) => ({ code: c!.code, name: c!.name }))
    )
    downloadCSV("generated-codes-with-names.csv", csv)
  }

  return (
    <main className="p-4 md:p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Generate Codes</h1>
        <p className="text-sm text-muted-foreground">Assign names now or edit later</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-indigo-600" />
              Single Code Generator
            </CardTitle>
            <CardDescription>Generate one code and optionally set a name</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <label htmlFor="single-name" className="text-sm font-medium">Name (optional)</label>
              <Input
                id="single-name"
                placeholder="e.g., John Doe or Student-42"
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
              />
            </div>
            <Button onClick={handleGenerateSingle} className="bg-indigo-600 hover:bg-indigo-500">
              <Plus className="mr-2 h-4 w-4" />
              Generate New Code
            </Button>
            {singleCode && (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Access Code</div>
                  <code className="font-mono text-lg">{singleCode}</code>
                  {singleName && (
                    <div className="text-xs text-muted-foreground">Name: {singleName}</div>
                  )}
                </div>
                <Button variant="outline" size="icon" onClick={copySingle}>
                  <Copy className="h-4 w-4" />
                  <span className="sr-only">Copy</span>
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-purple-600" />
              Bulk Code Generator
            </CardTitle>
            <CardDescription>
              Provide optional names (one per line). If you enter a single line, it will be used as a prefix with incremental numbers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="space-y-2">
                <label htmlFor="bulk-count" className="text-sm font-medium">Number of Codes</label>
                <Input
                  id="bulk-count"
                  type="number"
                  min={1}
                  max={1000}
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value || "0", 10))}
                  className="sm:max-w-[220px]"
                  placeholder="Number of codes"
                />
              </div>
              <div className="flex-1 space-y-2">
                <label htmlFor="bulk-names" className="text-sm font-medium">Names (optional)</label>
                <Textarea
                  id="bulk-names"
                  placeholder={"One name per line\nOR a single prefix (e.g., \"Student-\")"}
                  rows={3}
                  value={bulkNamesRaw}
                  onChange={(e) => setBulkNamesRaw(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleGenerateBulk} className="bg-purple-600 hover:bg-purple-500">
                <Plus className="mr-2 h-4 w-4" />
                Generate Codes
              </Button>
              <Button
                variant="outline"
                onClick={downloadBulkCSV}
                disabled={!latestGenerated.length}
                className="ml-auto"
              >
                <DownloadCloud className="mr-2 h-4 w-4" />
                Download CSV (code,name)
              </Button>
            </div>

            {latestGenerated.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Access Code</TableHead>
                      <TableHead>Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {latestGenerated.map((c, i) => (
                      <TableRow key={c!.code}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="font-mono">{c!.code}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigator.clipboard?.writeText(c!.code)}
                              className="h-7 w-7"
                              title="Copy code"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={c!.name ?? ""}
                            placeholder="Enter name"
                            onChange={(e) => setName(c!.code, e.target.value)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="text-xs text-muted-foreground">
        Total codes in system: {codes.length}
      </div>
    </main>
  )
}
