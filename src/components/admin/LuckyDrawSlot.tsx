import React, { useEffect, useMemo, useRef, useState } from 'react'
import Slot from '../../lib/Slot'
import { startSpinSound, stopSpinSound, playWinJingle } from '../../utils/sfx'
import { burstConfetti } from '../../utils/confetti'

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
  const [winner, setWinner] = useState<string | null>(null)
  const stopConfettiRef = useRef<null | (() => void)>(null)

  const cleanNames = useMemo(() => {
    // Deduplicate and remove falsy values
    const uniq = Array.from(new Set((names || []).filter(Boolean)))
    return uniq
  }, [names])

  useEffect(() => {
    slotRef.current = new Slot({
      reelContainerSelector: `#${reelId}`,
      removeWinner: removal,
      onSpinStart: () => {
        setSpinning(true)
        startSpinSound()
        setWinner(null)
      },
      onSpinEnd: () => {
        setSpinning(false)
        stopSpinSound()
        const w = slotRef.current?.lastWinner || null
        setWinner(w)
        playWinJingle()
        try { stopConfettiRef.current?.() } catch {}
        stopConfettiRef.current = burstConfetti()
      },
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
      // prefer Slot.lastWinner
      const w = slotRef.current.lastWinner || (removal ? before.find((n) => !after.includes(n)) || '' : '')
      if (w && onWinner) onWinner(w)
      setRemaining(after)
    }
  }

  return (
    <div className={`w-full lucky-slot ${spinning ? 'spinning' : ''}`}>
      <div className="bg-white border rounded-lg p-4 slot-frame relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none lights" aria-hidden="true" />
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
        {winner && (
          <div className="mt-3 p-3 rounded-md bg-gradient-to-r from-yellow-100 to-pink-100 border border-yellow-300 animate-winner">
            <span className="text-sm font-semibold text-yellow-800">Winner:</span>
            <span className="ml-2 text-sm font-bold text-pink-700">{winner}</span>
          </div>
        )}
      </div>
    </div>
  )
}
