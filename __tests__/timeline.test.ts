import { withTimeout, isValidCategory, isValidBlock } from '@/lib/timeline'

describe('withTimeout', () => {
  it('resolves the original promise before timeout', async () => {
    const result = await withTimeout(Promise.resolve(42), 1000)
    expect(result).toBe(42)
  })

  it('rejects when timeout elapses first', async () => {
    await expect(withTimeout(new Promise(() => {}), 50)).rejects.toThrow('请求超时')
  })

  it('accepts PromiseLike (thenable) inputs', async () => {
    const thenable: PromiseLike<number> = {
      then: (onfulfilled) => {
        setTimeout(() => onfulfilled(7), 10)
        return Promise.resolve() as any
      }
    }
    const result = await withTimeout(thenable, 1000)
    expect(result).toBe(7)
  })
})

describe('validators', () => {
  it('validates Category correctly', () => {
    expect(isValidCategory({ id: '1', user_id: 'u', name: 'n', color: '#000', type: 'productive' })).toBe(true)
    expect(isValidCategory({})).toBe(false)
    expect(isValidCategory({ id: '1', user_id: 'u', name: 'n', color: '#000', type: 'bad' })).toBe(false)
  })

  it('validates TimeBlock correctly', () => {
    expect(isValidBlock({ id: '1', user_id: 'u', start_time: '2020-01-01', end_time: '2020-01-01', category_id: 'c' })).toBe(true)
    expect(isValidBlock({})).toBe(false)
    expect(isValidBlock({ id: '1', user_id: 'u', start_time: '2020-01-01' })).toBe(false)
  })
})
