export * from '@/lib/validation/schemas'

const BLOCKED_EXTENSIONS = ['.exe', '.js', '.mjs', '.cjs', '.php', '.zip', '.sh', '.bat', '.cmd', '.py', '.rb', '.ps1']

// The security template allows .pdf and .docx generally, but this app's
// extraction pipeline (lib/pdf/extractText.ts) only parses PDF binaries.
// Accepting .docx here would pass validation and then fail unpredictably
// (or worse, mis-parse) in extractText(), so it's deliberately excluded
// until docx extraction is implemented.
const ALLOWED_EXTENSIONS = ['.pdf']
const ALLOWED_MIME_TYPES = ['application/pdf']

export interface FileValidationResult {
  valid: boolean
  message?: string
}

function getExtension(fileName: string): string {
  const match = fileName.toLowerCase().match(/\.[^.]+$/)
  return match ? match[0] : ''
}

/**
 * Validates an upload in strict, independent order: extension blocklist,
 * then extension allowlist, then MIME type, then size. Each check stands on
 * its own — none can be bypassed by manipulating another (e.g. an empty or
 * missing Content-Type no longer lets a non-PDF file through).
 */
export function validateFileUpload(file: File, maxSizeBytes: number): FileValidationResult {
  const extension = getExtension(file.name)

  if (!extension || BLOCKED_EXTENSIONS.includes(extension)) {
    return { valid: false, message: 'This file type is not allowed.' }
  }

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return { valid: false, message: 'Only PDF files are supported.' }
  }

  if (!file.type || !ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, message: 'Only PDF files are supported.' }
  }

  if (file.size > maxSizeBytes) {
    return { valid: false, message: 'File exceeds the size limit.' }
  }

  return { valid: true }
}
