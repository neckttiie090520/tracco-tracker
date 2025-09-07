import React, { useEffect, useMemo, useRef, useState } from 'react'
import Slot from '../../lib/Slot'

interface LuckyDrawSlotProps {
  names: string[]
  reelId: string
  onWinner?: (name: string) => void
}

export function LuckyDrawSlot({ names, reelId, onWinner }: LuckyDrawSlotProps) {
  const slotRef = useRef<Slot | null>(null)
  const [removal, setRemoval] = useState(true)
  const [spinning, setSpinning] = useState(false)
  const [remaining, setRemaining] = useState<string[]>([])

  const cleanNames = useMemo(() => {
    // Deduplicate and remove falsy values
    const uniq = Array.from(new Set((names || []).filter(Boolean)))
    return uniq
  }, [names])

  useEffect(() => {
    slotRef.current = new Slot({
      reelContainerSelector: `#${reelId}`,
      removeWinner: removal,
      onSpinStart: () => setSpinning(true),
      onSpinEnd: () => setSpinning(false),
      onNameListChanged: () => setRemaining(slotRef.current?.names || [])
    })
    slotRef.current.names = cleanNames
    setRemaining(cleanNames)

    return () => {
      slotRef.current = null
    }
  }, [reelId])

  useEffect(() => {
    if (slotRef.current) {
      slotRef.current.names = cleanNames
      slotRef.current.shouldRemoveWinnerFromNameList = removal
    }
  }, [cleanNames, removal])

  const handleSpin = async () => {
    if (!slotRef.current) return
    const before = [...(slotRef.current.names || [])]
    const ok = await slotRef.current.spin()
    if (ok) {
      const after = slotRef.current.names
      // winner is the element removed (if removal), or the last displayed; infer from diff
      let winner = ''
      if (removal) {
        winner = before.find((n) => !after.includes(n)) || ''
      }
      // Fallback: we can’t easily read rendered last item; skip
      if (winner && onWinner) onWinner(winner)
      setRemaining(after)
    }
  }

  return (
    <div className="w-full">
      <div className="bg-white border rounded-lg p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">Eligible: {cleanNames.length} • Remaining: {remaining.length}</div>
          <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="rounded"
              checked={removal}
              onChange={(e) => setRemoval(e.target.checked)}
            />
            <span>Remove winner from list</span>
          </label>
        </div>
        <div className="rounded-md overflow-hidden border bg-gray-50">
          <div id={reelId} className="reel" style={{ height: 120 }} />
        </div>
        <div className="mt-4 flex items-center space-x-2">
          <button
            onClick={handleSpin}
            disabled={spinning || cleanNames.length === 0}
            className="px-4 py-2 rounded-md text-white bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {spinning ? 'Spinning…' : 'Lucky Draw'}
          </button>
          <div className="text-xs text-gray-500">Uses the slot animation to pick a random name.</div>
        </div>
      </div>
    </div>
  )
}

