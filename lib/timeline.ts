import { Category, TimeBlock } from '@/types'

export function withTimeout<T>(promise: PromiseLike<T>, ms = 8000) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('请求超时')), ms))
  ])
}

export function isValidCategory(c: any): c is Category {
  return c && typeof c.id === 'string' && typeof c.user_id === 'string' && typeof c.name === 'string' && typeof c.color === 'string' && (c.type === 'productive' || c.type === 'rest' || c.type === 'other')
}

export function isValidBlock(b: any): b is TimeBlock {
  return b && typeof b.id === 'string' && typeof b.user_id === 'string' && typeof b.start_time === 'string' && typeof b.end_time === 'string' && typeof b.category_id === 'string'
}
