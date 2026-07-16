const DEFAULT_DELAYS_MS = [1000, 2000, 4000]

export async function withRetry<T>(fn: () => Promise<T>, delays: number[] = DEFAULT_DELAYS_MS): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < delays.length) {
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]))
      }
    }
  }

  throw lastError
}
