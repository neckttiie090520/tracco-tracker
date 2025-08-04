import React, { useState, useRef, useEffect } from 'react'

interface Participant {
  id: string
  name: string
  email: string
  faculty?: string
  department?: string
}

interface InlineSlotMachineProps {
  participants: Participant[]
  taskTitle: string
}

interface Winner {
  participant: Participant
  timestamp: Date
}

export function InlineSlotMachine({ participants, taskTitle }: InlineSlotMachineProps) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [winner, setWinner] = useState<Participant | null>(null)
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>(participants)
  const [showConfetti, setShowConfetti] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [volume, setVolume] = useState(0.5)
  const [winners, setWinners] = useState<Winner[]>([])
  const reelRef = useRef<HTMLDivElement>(null)

  // Update available participants when participants change
  useEffect(() => {
    setAvailableParticipants(participants)
    setWinner(null)
  }, [participants])

  // Simple beep sounds using Web Audio API
  const createBeepSound = (frequency: number, duration: number) => {
    if (!soundEnabled) return
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = frequency
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(volume * 0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + duration)
    } catch (error) {
      console.log('Audio not supported')
    }
  }

  // Shuffle array function
  const shuffleArray = <T,>(array: T[]): T[] => {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  // Create spinning animation
  const createSpinningNames = (finalWinner: Participant): string[] => {
    const maxItems = 20 // Reduced for modal
    let allNames: string[] = []
    
    // Create repeating names list
    while (allNames.length < maxItems - 1) {
      const shuffled = shuffleArray(availableParticipants.map(p => p.name))
      allNames = [...allNames, ...shuffled]
    }
    
    // Add final winner at the end
    allNames = allNames.slice(0, maxItems - 1)
    allNames.push(finalWinner.name)
    
    return allNames
  }

  // Spin function
  const spin = async () => {
    if (availableParticipants.length === 0 || isSpinning) return

    try {
      setIsSpinning(true)
      setWinner(null)
      setShowConfetti(false)
      
      // Play spin sound
      createBeepSound(400, 0.3)

      // Select random winner
      const randomIndex = Math.floor(Math.random() * availableParticipants.length)
      const selectedWinner = availableParticipants[randomIndex]

      // Create spinning names
      const spinningNames = createSpinningNames(selectedWinner)

      // Clear reel and populate with spinning names
      if (reelRef.current) {
        reelRef.current.innerHTML = ''
        
        spinningNames.forEach((name, index) => {
          const nameElement = document.createElement('div')
          nameElement.className = 'reel-item'
          nameElement.textContent = name
          reelRef.current!.appendChild(nameElement)
        })

        // Start animation
        const animationDuration = 2000 + Math.random() * 1000 // 2-3 seconds (faster for modal)
        const finalPosition = -(spinningNames.length - 1) * 80 // 80px per item (smaller for modal)

        reelRef.current.style.transition = `transform ${animationDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`
        reelRef.current.style.transform = `translateY(${finalPosition}px)`

        // Wait for animation to complete
        await new Promise(resolve => setTimeout(resolve, animationDuration))

        // Clean up - remove all items except winner
        const children = Array.from(reelRef.current.children)
        children.slice(0, -1).forEach(child => child.remove())

        // Show winner effects
        setWinner(selectedWinner)
        setShowConfetti(true)
        
        // Play win sound
        createBeepSound(800, 0.5)
        
        // Add to winners list
        const newWinner: Winner = {
          participant: selectedWinner,
          timestamp: new Date()
        }
        setWinners(prev => [...prev, newWinner])

        // Remove winner from available participants
        setAvailableParticipants(prev => prev.filter(p => p.id !== selectedWinner.id))

        // Hide confetti after 3 seconds
        setTimeout(() => setShowConfetti(false), 3000)
      }
    } catch (error) {
      console.error('Error during spin:', error)
    } finally {
      setIsSpinning(false)
    }
  }

  // Reset function
  const reset = () => {
    setAvailableParticipants(participants)
    setWinner(null)
    setWinners([])
    setShowConfetti(false)
    if (reelRef.current) {
      reelRef.current.innerHTML = ''
      reelRef.current.style.transform = 'translateY(0)'
    }
  }

  return (
    <div className="relative">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          <div className="confetti-container">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][Math.floor(Math.random() * 6)]
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Slot Machine */}
      <div className="slot-machine bg-gradient-to-b from-gray-200 to-gray-300 rounded-2xl p-6 shadow-xl border-2 border-gray-400">
        {/* Title */}
        <h3 className="text-2xl font-bold text-center text-gray-900 mb-4">
          🎰 สุ่มรายชื่อ
        </h3>
        <p className="text-center text-gray-700 mb-4 text-sm font-medium">
          {taskTitle}
        </p>

        {/* Sound Controls */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              soundEnabled
                ? 'bg-gray-600 text-white hover:bg-gray-700'
                : 'bg-gray-400 text-gray-600 hover:bg-gray-500'
            }`}
          >
            {soundEnabled ? '🔊' : '🔇'}
            {soundEnabled ? 'เสียง' : 'ปิดเสียง'}
          </button>
          
          {soundEnabled && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-700">🔉</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-16 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs text-gray-700">🔊</span>
            </div>
          )}
        </div>

        {/* Slot Window */}
        <div className="slot-window bg-black rounded-xl p-3 mb-4 relative overflow-hidden">
          <div className="slot-inner bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg h-24 relative overflow-hidden">
            {/* Reel Container */}
            <div 
              ref={reelRef}
              className="reel absolute inset-0"
            />
            
            {/* Slot Window Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-black to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black to-transparent"></div>
              <div className="absolute top-1/2 left-0 right-0 transform -translate-y-1/2 h-12 border-t-2 border-b-2 border-gray-400"></div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="text-center space-y-3">
          <button
            onClick={spin}
            disabled={isSpinning || availableParticipants.length === 0}
            className={`
              px-6 py-3 rounded-xl font-bold text-lg transition-all duration-200 shadow-md w-full
              ${isSpinning || availableParticipants.length === 0
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white transform hover:scale-105 active:scale-95'
              }
            `}
          >
            {isSpinning ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                กำลังสุ่ม...
              </span>
            ) : availableParticipants.length === 0 ? (
              'สุ่มหมดแล้ว'
            ) : (
              `🎲 สุ่มเลย! (เหลือ ${availableParticipants.length} คน)`
            )}
          </button>

          {winners.length > 0 && (
            <button
              onClick={reset}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors w-full"
            >
              🔄 เริ่มใหม่
            </button>
          )}
        </div>

        {/* Winner Display */}
        {winner && (
          <div className="mt-4 p-4 bg-white bg-opacity-90 backdrop-blur-sm rounded-xl border-2 border-gray-400">
            <h4 className="text-lg font-bold text-gray-900 text-center mb-3">
              🎉 ผู้โชคดี! 🎉
            </h4>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900 mb-1">
                {winner.name}
              </p>
              <p className="text-gray-700 text-sm mb-1">
                {winner.email}
              </p>
              {winner.faculty && (
                <p className="text-gray-700 text-xs">
                  {winner.faculty} {winner.department && `• ${winner.department}`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Winners History */}
        {winners.length > 0 && (
          <div className="mt-4 p-3 bg-gray-100 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">🏆 ผู้โชคดีที่ผ่านมา:</h4>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {winners.map((winner, index) => (
                <div key={index} className="text-xs text-gray-600 flex items-center justify-between">
                  <span>{winner.participant.name}</span>
                  <span className="text-gray-400">
                    {winner.timestamp.toLocaleTimeString('th-TH', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Styles */}
      <style jsx>{`
        .reel-item {
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: bold;
          color: white;
          text-align: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          transform: translate3d(0, 0, 0);
        }

        .confetti {
          position: absolute;
          width: 8px;
          height: 8px;
          animation: confetti-fall 3s linear forwards;
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(-100px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(300px) rotate(720deg);
            opacity: 0;
          }
        }

        .slot-machine {
          background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 50%, #9ca3af 100%);
          box-shadow: 
            0 0 30px rgba(107, 114, 128, 0.3),
            inset 0 2px 5px rgba(255, 255, 255, 0.3),
            inset 0 -2px 5px rgba(0, 0, 0, 0.1);
        }

        .slot-window {
          box-shadow: 
            inset 0 0 15px rgba(0, 0, 0, 0.5),
            0 0 20px rgba(0, 0, 0, 0.3);
        }

        .slot-inner {
          box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.7);
        }
      `}</style>
    </div>
  )
}

