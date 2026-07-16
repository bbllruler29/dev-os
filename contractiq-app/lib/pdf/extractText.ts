import pdf from 'pdf-parse'

interface ExtractTextResult {
  text: string
  pageCount: number
}

export async function extractText(buffer: Buffer): Promise<ExtractTextResult> {
  const pages: string[] = []

  await pdf(buffer, {
    pagerender: async (pageData) => {
      const content = await pageData.getTextContent()
      const pageText = content.items.map((item: { str?: string }) => item.str ?? '').join(' ')
      pages.push(pageText)
      return pageText
    },
  })

  const text = pages.map((pageText, index) => `[PAGE ${index + 1}]\n${pageText}`).join('\n\n')

  return { text, pageCount: pages.length }
}

export function countWords(text: string): number {
  return text
    .replace(/\[PAGE \d+\]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}
