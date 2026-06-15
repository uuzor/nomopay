import Anthropic from '@anthropic-ai/sdk'

export const ai = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL,
})

export const AI_MODEL = 'claude-haiku-4-5-20251001'
