export function genRandomCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // omit confusing chars
  let out = ""
  const array = new Uint32Array(length)
  if (typeof window !== "undefined" && typeof window.crypto !== "undefined" && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array)
    for (let i = 0; i < length; i++) {
      out += chars[array[i] % chars.length]
    }
    return out
  }
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

export function createCodesCSV(codes: string[]): string {
  const rows = ["code"]
  for (const c of codes) rows.push(c)
  return rows.join("\n")
}

export type CodeWithName = { code: string; name?: string }

export function createCodesWithNamesCSV(items: CodeWithName[]): string {
  const rows = ["code,name"]
  for (const it of items) {
    const name = (it.name ?? "").replace(/"/g, '""')
    const code = (it.code ?? "").replace(/"/g, '""')
    rows.push(`${quoteIfNeeded(code)},${quoteIfNeeded(name)}`)
  }
  return rows.join("\n")
}

function quoteIfNeeded(s: string) {
  return /[",\n]/.test(s) ? `"${s}"` : s
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.setAttribute("download", filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
