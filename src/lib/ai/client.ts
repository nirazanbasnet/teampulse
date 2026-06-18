// ============================================================
// TeamPulse — Unified AI chat client
// src/lib/ai/client.ts
//
// Single entry point for all server-side LLM calls.
//   - PRIMARY  : Cerebras  (CEREBRAS_API_KEY)
//   - FALLBACK : Groq      (GROQ_API_KEY)
//
// Both providers expose an OpenAI-compatible chat-completions API,
// so a call only needs the equivalent model id for each provider.
// If Cerebras errors (or has no key), we transparently retry on
// Groq. Callers get back the text plus which provider/model served
// it. Server-only — API keys must never reach the browser.
// ============================================================

import Cerebras from '@cerebras/cerebras_cloud_sdk'
import Groq     from 'groq-sdk'

const cerebras = process.env.CEREBRAS_API_KEY
  ? new Cerebras({ apiKey: process.env.CEREBRAS_API_KEY })
  : null

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export interface ChatRequest {
  /** Model id on Cerebras (primary provider), e.g. 'llama-3.3-70b'. */
  cerebrasModel: string
  /** Model id on Groq (fallback provider), e.g. 'llama-3.3-70b-versatile'. */
  groqModel: string
  messages:     ChatMessage[]
  maxTokens?:   number
  temperature?: number
  /** Request a strict JSON object response. */
  json?: boolean
}

export interface ChatResponse {
  text:     string
  provider: 'cerebras' | 'groq'
  model:    string
}

/**
 * Run a chat completion against Cerebras, falling back to Groq on error.
 * Throws only if every configured provider fails (or none is configured).
 */
export async function chatCompletion(req: ChatRequest): Promise<ChatResponse> {
  const attempts = [
    { provider: 'cerebras' as const, client: cerebras, model: req.cerebrasModel },
    { provider: 'groq'     as const, client: groq,     model: req.groqModel },
  ]

  let lastError: unknown
  for (const { provider, client, model } of attempts) {
    if (!client) continue
    try {
      const create = client.chat.completions.create as (args: any) => Promise<any>
      const completion = await create({
        model,
        max_tokens:  req.maxTokens,
        temperature: req.temperature,
        ...(req.json ? { response_format: { type: 'json_object' } } : {}),
        messages:    req.messages,
      })

      const text = (completion as any).choices?.[0]?.message?.content?.trim() ?? ''
      return { text, provider, model }
    } catch (err) {
      lastError = err
      console.error(`[ai] ${provider} (${model}) failed${client === cerebras ? ', falling back to Groq' : ''}:`, err)
    }
  }

  throw lastError ?? new Error('No AI provider configured — set CEREBRAS_API_KEY or GROQ_API_KEY.')
}
