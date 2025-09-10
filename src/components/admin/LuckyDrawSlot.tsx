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
      <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 border-2 border-purple-200 rounded-xl p-6 slot-frame relative overflow-hidden shadow-lg">
        <div className="absolute inset-0 pointer-events-none lights" aria-hidden="true" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 animate-pulse"></div>
        
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            🎯 Eligible: {cleanNames.length} • 🎪 Remaining: {remaining.length}
          </div>
          <label className="inline-flex items-center space-x-2 text-sm bg-white/70 backdrop-blur-sm rounded-full px-3 py-1 border border-purple-200">
            <input
              type="checkbox"
              className="rounded text-purple-600 focus:ring-purple-500"
              checked={removal}
              onChange={(e) => setRemoval(e.target.checked)}
            />
            <span className="text-purple-700 font-medium">Remove winner</span>
          </label>
        </div>
        
        <div className="rounded-xl overflow-hidden border-4 border-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 bg-gradient-to-br from-yellow-50 via-pink-50 to-purple-50 shadow-inner relative">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-yellow-300/30 via-pink-300/30 to-purple-300/30 animate-pulse"></div>
          <div id={reelId} className="reel relative z-10 font-bold text-lg" style={{ 
            height: 120,
            background: 'linear-gradient(135deg, #fbbf24 0%, #ec4899 50%, #8b5cf6 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent'
          }} />
        </div>
        
        <div className="mt-6 flex items-center space-x-3">
          <button
            onClick={handleSpin}
            disabled={spinning || cleanNames.length === 0}
            className="px-6 py-3 rounded-xl text-white font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 hover:from-purple-600 hover:via-pink-600 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
          >
            {spinning ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>🎰 Spinning…</span>
              </>
            ) : (
              <>
                <span>🎲 Lucky Draw</span>
                <span className="animate-bounce">✨</span>
              </>
            )}
          </button>
          <div className="text-sm text-purple-600 font-medium bg-white/60 backdrop-blur-sm rounded-full px-3 py-1">
            🎪 Slot animation magic!
          </div>
        </div>
        
        {winner && (
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 border-2 border-yellow-400 animate-winner shadow-lg">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg">🏆</span>
              <span className="text-sm font-bold text-yellow-800">WINNER:</span>
              <span className="text-lg font-black text-purple-700 animate-bounce">{winner}</span>
              <span className="text-lg animate-pulse">🎉</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
