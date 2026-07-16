export function parseCitation(text: string): number | null {
  const match = text.match(/\[Page (\d+)\]/i)
  return match ? Number(match[1]) : null
}
