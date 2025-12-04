import { supabaseOrigin, supabaseAnonKeyPublic } from '@/lib/supabase/client'
import { sanitizeTimeBlock, sanitizeCategory } from '@/lib/validation'

async function parseJson(resp: Response) {
  try { return await resp.json() } catch { return null }
}

export async function restInsert<T>(table: string, row: T) {
  const url = `${supabaseOrigin}/rest/v1/${table}`
  const payload = table === 'time_blocks' ? sanitizeTimeBlock(row) : table === 'categories' ? sanitizeCategory(row) : row
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKeyPublic,
      'Authorization': `Bearer ${supabaseAnonKeyPublic}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(payload)
  })
  const data = await parseJson(resp)
  if (!resp.ok) {
    const msg = data?.message || data?.details || 'Bad Request'
    throw new Error(typeof msg === 'string' ? msg : 'Bad Request')
  }
  return data
}

export async function restUpdate<T>(table: string, filters: Record<string, string>, patch: T) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => params.append(`${k}=eq.${v}`))
  const url = `${supabaseOrigin}/rest/v1/${table}?${params.toString()}`
  const payload = table === 'time_blocks' ? sanitizeTimeBlock(patch) : table === 'categories' ? sanitizeCategory(patch) : patch
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKeyPublic,
      'Authorization': `Bearer ${supabaseAnonKeyPublic}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(payload)
  })
  const data = await parseJson(resp)
  if (!resp.ok) {
    const msg = data?.message || data?.details || 'Bad Request'
    throw new Error(typeof msg === 'string' ? msg : 'Bad Request')
  }
  return data
}

export async function restDelete(table: string, filters: Record<string, string>) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => params.append(`${k}=eq.${v}`))
  const url = `${supabaseOrigin}/rest/v1/${table}?${params.toString()}`
  const resp = await fetch(url, {
    method: 'DELETE',
    headers: {
      'apikey': supabaseAnonKeyPublic,
      'Authorization': `Bearer ${supabaseAnonKeyPublic}`,
      'Prefer': 'return=representation'
    }
  })
  const data = await parseJson(resp)
  if (!resp.ok) {
    const msg = data?.message || data?.details || 'Bad Request'
    throw new Error(typeof msg === 'string' ? msg : 'Bad Request')
  }
  return data
}
