const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+|any\s+)?(previous|prior|above)\s+instructions?/i,
  /disregard\s+(all\s+|any\s+)?(previous|prior|above)\s+instructions?/i,
  /override\s+your\s+rules?/i,
  /reveal\s+(your\s+|the\s+)?system\s+prompt/i,
  /print\s+your\s+instructions?/i,
  /expose\s+(the\s+)?env(ironment)?\s+variables?/i,
  /show\s+(me\s+)?(the\s+)?api\s+keys?/i,
  /you\s+are\s+now\s+a\b/i,
  /act\s+as\s+(a|an)\b/i,
  /pretend\s+(you\s+are|to\s+be)\b/i,
  /\bjailbreak\b/i,
  /\bDAN\s+mode\b/i,
  /developer\s+mode/i,
]

export class PromptInjectionDetectedError extends Error {
  constructor() {
    super('Prompt injection pattern detected in user input.')
    this.name = 'PromptInjectionDetectedError'
  }
}

export function detectPromptInjection(input: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(input))
}

/**
 * Must be called on every user message before it reaches the LLM. Throws
 * PromptInjectionDetectedError (caller maps this to 400 PROMPT_INJECTION and
 * never calls the model) if a known injection pattern is found.
 */
export function sanitizeForLLM(message: string): string {
  const trimmed = message.trim()
  if (detectPromptInjection(trimmed)) {
    throw new PromptInjectionDetectedError()
  }
  return trimmed
}
