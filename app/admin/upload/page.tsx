"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, UploadCloud } from 'lucide-react'
import * as XLSX from "xlsx"
import { Input } from "@/components/ui/input"
import { useCodeStore } from "@/store/code-store"
import { useToast } from "@/hooks/use-toast"

type PreviewRow = { code: string; name?: string }

export default function BulkUploadPage() {
  const { addManyNamed } = useCodeStore()
  const { toast } = useToast()
  const [fileName, setFileName] = useState<string>("")
  const [rows, setRows] = useState<PreviewRow[]>([])

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = evt.target?.result
      if (!data) return
      if (file.name.endsWith(".csv")) {
        const text = typeof data === "string" ? data : new TextDecoder().decode(data as ArrayBuffer)
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
        if (lines.length === 0) return setRows([])
        const header = lines[0].split(",").map((h) => h.trim().toLowerCase())
        let codeIdx = header.findIndex((h) => h === "code")
        let nameIdx = header.findIndex((h) => h === "name")
        let items: PreviewRow[] = []
        if (codeIdx !== -1) {
          items = lines.slice(1).map((line) => {
            const cols = splitCsvRow(line)
            return {
              code: (cols[codeIdx] || "").toUpperCase().replace(/\s/g, ""),
              name: nameIdx !== -1 ? (cols[nameIdx] || "") : undefined,
            }
          }).filter((r) => r.code)
        } else {
          // No header; assume "code,name?"
          items = lines.map((line) => {
            const cols = splitCsvRow(line)
            return {
              code: (cols[0] || "").toUpperCase().replace(/\s/g, ""),
              name: cols[1] || undefined,
            }
          }).filter((r) => r.code)
        }
        setRows(items)
      } else {
        const workbook = XLSX.read(data, { type: "binary" })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" })
        const mapped: PreviewRow[] = json.map((r) => {
          const keys = Object.keys(r)
          const codeKey = keys.find((k) => k.toLowerCase().includes("code")) || keys[0]
          const nameKey = keys.find((k) => k.toLowerCase().includes("name"))
          return {
            code: String(r[codeKey] ?? "").replace(/\s/g, "").toUpperCase(),
            name: nameKey ? String(r[nameKey] ?? "") : undefined,
          }
        }).filter((r) => r.code)
        setRows(mapped)
      }
    }
    if (file.name.endsWith(".csv")) {
      reader.readAsText(file)
    } else {
      reader.readAsBinaryString(file)
    }
  }

  const validRows = useMemo(() => rows.filter((r) => !!r.code), [rows])

  function confirmUpload() {
    const uniqueMap = new Map<string, string | undefined>()
    for (const r of validRows) {
      if (!uniqueMap.has(r.code)) uniqueMap.set(r.code, r.name)
    }
    const items = Array.from(uniqueMap.entries()).map(([code, name]) => ({ code, name }))
    addManyNamed(items)
    toast({ title: "Codes added/updated", description: `${items.length} code(s) processed` })
    setRows([])
    setFileName("")
  }

  return (
    <main className="p-4 md:p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Bulk Upload</h1>
        <p className="text-sm text-muted-foreground">
          Upload CSV or Excel with columns: code,name. Preview before confirming.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-indigo-600" />
            Upload File
          </CardTitle>
          <CardDescription>CSV (.csv) or Excel (.xlsx, .xls)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={onFile} />
            {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
            <Button
              variant="outline"
              onClick={() => {
                setRows([])
                setFileName("")
              }}
            >
              Clear
            </Button>
          </div>

          {validRows.length > 0 && (
            <>
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
                    {validRows.slice(0, 200).map((r, i) => (
                      <TableRow key={`${r.code}-${i}`}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell><code className="font-mono">{r.code}</code></TableCell>
                        <TableCell>{r.name ?? ""}</TableCell>
                      </TableRow>
                    ))}
                    {validRows.length > 200 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-sm text-muted-foreground">
                          Showing first 200 of {validRows.length} rows
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-end">
                <Button className="bg-indigo-600 hover:bg-indigo-500" onClick={confirmUpload}>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Add {validRows.length} Codes
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

/**
 * Minimal CSV row splitter handling quoted fields.
 */
function splitCsvRow(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"' ) {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current)
      current = ""
    } else {
      current += ch
    }
  }
  result.push(current)
  return result.map((s) => s.trim())
}
