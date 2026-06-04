/**
 * Generate a short random ID (8 chars, base-36).
 */
export const uid = (): string => Math.random().toString(36).slice(2, 10)
