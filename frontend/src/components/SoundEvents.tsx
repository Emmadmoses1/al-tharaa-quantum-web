import { useEffect, useRef } from 'react'
import { useUnreadCount } from '../hooks/useData'
import { playSound } from '../lib/sound'

export default function SoundEvents() {
  const { data } = useUnreadCount()
  const prev = useRef<number | null>(null)
  useEffect(() => {
    if (typeof data !== 'number') return
    if (prev.current !== null && data > prev.current) playSound('notify')
    prev.current = data
  }, [data])
  return null
}
