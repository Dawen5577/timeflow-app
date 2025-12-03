'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-50 px-6 py-3 rounded-full shadow-lg border border-red-200 flex items-center gap-4">
      <span className="text-sm font-medium text-red-700">发生错误，请重试</span>
      <button onClick={() => reset()} className="px-3 py-1 rounded bg-red-600 text-white text-xs">重试</button>
    </div>
  )
}

