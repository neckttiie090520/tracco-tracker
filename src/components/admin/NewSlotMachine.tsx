import React, { useState, useRef, useEffect } from 'react'

interface Participant {
  id: string
  name: string
  email: string
  faculty?: string
  department?: string
}

interface Session {
  id: string
  title: string
  description: string
  start_date: string
  end_date: string
  max_participants: number
  is_active: boolean
}

interface SlotMachineProps {
  participants: Participant[]
  sessionTitle: string
  sessions: Session[]
  selectedSession: string
  onSessionChange: (sessionId: string) => void
  loadingParticipants: boolean
}

interface SoundSeries {
  key: string
  frequency: number
  duration: number
}

// Piano keys mapping (simplified from original)
const PIANO_KEYS: { [key: string]: number } = {
  'C4': 261.6256,
  'D4': 293.6648,
  'E4': 329.6276,
  'G4': 391.9954,
  'D#3': 155.5635,
  'C#3': 138.5913,
  'C3': 130.8128
}

export function NewSlotMachine({ participants, sessionTitle, sessions, selectedSession, onSessionChange, loadingParticipants }: SlotMachineProps) {
  const [showSessionSelection, setShowSessionSelection] = useState(true)
  const [tempSelectedSession, setTempSelectedSession] = useState('')
  const [isSpinning, setIsSpinning] = useState(false)
  const [winner, setWinner] = useState<Participant | null>(null)
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>(participants)
  const [showConfetti, setShowConfetti] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [volume, setVolume] = useState(0.2)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const reelRef = useRef<HTMLDivElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const maxReelItems = 30

  // Initialize audio context
  useEffect(() => {
    if (window.AudioContext || (window as any).webkitAudioContext) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }, [])

  // Fullscreen functions
  const toggleFullscreen = async () => {
    if (!containerRef.current) return

    try {
      if (!isFullscreen) {
        // Enter fullscreen
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen()
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen()
        } else if ((containerRef.current as any).msRequestFullscreen) {
          await (containerRef.current as any).msRequestFullscreen()
        }
        setIsFullscreen(true)
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen()
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen()
        }
        setIsFullscreen(false)
      }
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      )
      setIsFullscreen(isCurrentlyFullscreen)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('msfullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('msfullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Update available participants when participants change
  useEffect(() => {
    setAvailableParticipants(participants)
    setWinner(null)
  }, [participants])

  // Show session selection again when no session is selected
  useEffect(() => {
    if (!selectedSession) {
      setShowSessionSelection(true)
      setTempSelectedSession('')
    }
  }, [selectedSession])

  // Handle session confirmation
  const handleConfirmSession = () => {
    if (tempSelectedSession) {
      onSessionChange(tempSelectedSession)
      setShowSessionSelection(false)
    }
  }

  // Handle back to session selection
  const handleBackToSelection = () => {
    setShowSessionSelection(true)
    setTempSelectedSession(selectedSession)
    onSessionChange('')
    setWinner(null)
    if (reelRef.current) {
      reelRef.current.innerHTML = ''
    }
  }

  // Sound effects using Web Audio API (from original project)
  const playSound = (sound: SoundSeries[], type: OscillatorType = 'triangle', shouldEaseOut = true, soundVolume = 0.1) => {
    if (!soundEnabled || !audioContextRef.current) return Promise.resolve(false)

    try {
      const audioContext = audioContextRef.current
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.type = type
      gainNode.gain.value = soundVolume * volume

      const { currentTime } = audioContext

      const totalDuration = sound.reduce((currentNoteTime, { frequency, duration }) => {
        oscillator.frequency.setValueAtTime(frequency, currentTime + currentNoteTime)
        return currentNoteTime + duration
      }, 0)

      if (shouldEaseOut) {
        gainNode.gain.exponentialRampToValueAtTime(soundVolume * volume, currentTime + totalDuration - 0.1)
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + totalDuration)
      }

      oscillator.start(currentTime)
      oscillator.stop(currentTime + totalDuration)

      return new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(true), totalDuration * 1000)
      })
    } catch (error) {
      console.log('Audio not supported:', error)
      return Promise.resolve(false)
    }
  }

  // Win sound effect (from original)
  const playWinSound = () => {
    const musicNotes: SoundSeries[] = [
      { key: 'C4', frequency: PIANO_KEYS['C4'], duration: 0.175 },
      { key: 'D4', frequency: PIANO_KEYS['D4'], duration: 0.175 },
      { key: 'E4', frequency: PIANO_KEYS['E4'], duration: 0.175 },
      { key: 'G4', frequency: PIANO_KEYS['G4'], duration: 0.275 },
      { key: 'E4', frequency: PIANO_KEYS['E4'], duration: 0.15 },
      { key: 'G4', frequency: PIANO_KEYS['G4'], duration: 0.9 }
    ]
    return playSound(musicNotes, 'triangle', true, 1)
  }

  // Spin sound effect (from original)
  const playSpinSound = (durationInSecond: number) => {
    const musicNotes: SoundSeries[] = [
      { key: 'D#3', frequency: PIANO_KEYS['D#3'], duration: 0.1 },
      { key: 'C#3', frequency: PIANO_KEYS['C#3'], duration: 0.1 },
      { key: 'C3', frequency: PIANO_KEYS['C3'], duration: 0.1 }
    ]

    const duration = Math.floor(durationInSecond * 10)
    const repeatedNotes = Array.from(Array(duration), (_, index) => musicNotes[index % 3])
    
    return playSound(repeatedNotes, 'triangle', false, 2)
  }

  // Shuffle array function (from original)
  const shuffleNames = <T,>(array: T[]): T[] => {
    const keys = Object.keys(array) as unknown[] as number[]
    const result: T[] = []
    for (let k = 0, n = keys.length; k < array.length && n > 0; k += 1) {
      const i = Math.floor(Math.random() * n)
      const key = keys[i]
      result.push(array[key])
      n -= 1
      const tmp = keys[n]
      keys[n] = key
      keys[i] = tmp
    }
    return result
  }

  // Main spin function (adapted from original)
  const spin = async () => {
    if (availableParticipants.length === 0 || isSpinning) return

    try {
      setIsSpinning(true)
      setWinner(null)
      setShowConfetti(false)

      // Play spin sound
      const animationDuration = maxReelItems * 100 // 100ms per item
      playSpinSound(animationDuration / 1000)

      const { current: reelContainer } = reelRef
      if (!reelContainer) return

      // Shuffle names and create reel items
      let randomNames = shuffleNames(availableParticipants.map(p => p.name))

      while (randomNames.length && randomNames.length < maxReelItems) {
        randomNames = [...randomNames, ...randomNames]
      }

      randomNames = randomNames.slice(0, maxReelItems)

      // Clear existing items
      reelContainer.innerHTML = ''

      // Create reel items
      const fragment = document.createDocumentFragment()
      randomNames.forEach((name) => {
        const newReelItem = document.createElement('div')
        newReelItem.className = 'reel-item'
        newReelItem.textContent = name
        fragment.appendChild(newReelItem)
      })

      reelContainer.appendChild(fragment)

      // Get the winner (last item)
      const winnerName = randomNames[randomNames.length - 1]
      const selectedWinner = availableParticipants.find(p => p.name === winnerName) || availableParticipants[0]

      // Create and play animation (from original logic)
      const itemHeight = isFullscreen ? 160 : 128 // 40 * 4 = 160px, 32 * 4 = 128px (h-40 vs h-32)
      const animation = reelContainer.animate(
        [
          { transform: 'none', filter: 'blur(0)' },
          { filter: 'blur(1px)', offset: 0.5 },
          { transform: `translateY(-${(maxReelItems - 1) * itemHeight}px)`, filter: 'blur(0)' }
        ],
        {
          duration: animationDuration,
          easing: 'ease-in-out',
          iterations: 1
        }
      )

      // Wait for animation to complete
      await new Promise((resolve) => {
        animation.onfinish = resolve
      })

      // Clean up - remove all items except winner
      const children = Array.from(reelContainer.children)
      children.slice(0, -1).forEach(child => child.remove())

      // Style the winner item to stand out
      const winnerElement = children[children.length - 1] as HTMLElement
      if (winnerElement) {
        winnerElement.style.backgroundColor = 'rgba(234, 179, 8, 0.9)'
        winnerElement.style.color = 'white'
        winnerElement.style.fontSize = '3rem'
        winnerElement.style.fontWeight = 'bold'
        winnerElement.style.border = '3px solid #fbbf24'
        winnerElement.style.borderRadius = '12px'
        winnerElement.style.margin = '4px'
        winnerElement.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)'
        
        // Add winner indicator
        winnerElement.innerHTML = `🎉 ${selectedWinner.name} 🎉`
      }

      // Show winner effects
      setWinner(selectedWinner)
      setShowConfetti(true)
      
      // Play win sound
      playWinSound()

      // Remove winner from available participants
      setAvailableParticipants(prev => prev.filter(p => p.id !== selectedWinner.id))

      // Hide confetti after 3 seconds
      setTimeout(() => setShowConfetti(false), 3000)

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
    setShowConfetti(false)
    if (reelRef.current) {
      reelRef.current.innerHTML = ''
    }
  }

  return (
    <div 
      ref={containerRef}
      className={`relative h-full ${isFullscreen ? 'fullscreen-container' : ''}`}
    >
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="confetti-container">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  backgroundColor: ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 6)]
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Button */}
      {!isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 z-10 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-lg transition-all duration-200 shadow-lg"
          title="เต็มจอ"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      {/* Exit Fullscreen Button */}
      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="fixed top-8 right-8 z-50 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-4 rounded-lg transition-all duration-200"
          title="ออกจากเต็มจอ"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Slot Machine */}
      <div className={`slot-machine bg-gradient-to-b from-cyan-400 to-blue-500 w-full h-full ${
        isFullscreen 
          ? 'fullscreen-slot max-w-none h-screen p-8 rounded-3xl' 
          : 'max-w-none p-8 rounded-t-3xl'
      } shadow-2xl border-4 border-pink-300`}>
        
        {/* Session Selection Center Modal */}
        {showSessionSelection && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black bg-opacity-30">
            <div className={`bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 ${
              isFullscreen ? 'max-w-lg p-12' : ''
            }`}>
              <div className="text-center mb-6">
                <div className={`${isFullscreen ? 'text-6xl' : 'text-4xl'} mb-4`}>🎰</div>
                <h2 className={`font-bold text-gray-900 mb-2 ${
                  isFullscreen ? 'text-3xl' : 'text-2xl'
                }`} style={{ fontFamily: 'Concert One, cursive' }}>
                  Lucky Draw Randomizer
                </h2>
                <p className={`text-gray-600 ${
                  isFullscreen ? 'text-xl' : 'text-base'
                }`} style={{ fontFamily: 'Concert One, cursive' }}>
                  กรุณาเลือก Session ที่ต้องการนำเข้า
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <select
                    value={tempSelectedSession}
                    onChange={(e) => {
                      const value = e.target.value
                      setTempSelectedSession(value)
                      // Trigger data loading immediately when session is selected
                      if (value) {
                        onSessionChange(value)
                      }
                    }}
                    className={`w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 text-gray-900 font-medium ${
                      isFullscreen ? 'text-lg' : 'text-base'
                    }`}
                    style={{ fontFamily: 'Concert One, cursive' }}
                  >
                    <option value="">เลือก Session</option>
                    {sessions.map(session => (
                      <option key={session.id} value={session.id}>
                        {session.title}
                      </option>
                    ))}
                  </select>
                </div>

                {tempSelectedSession && (
                  <div className={`px-4 py-3 rounded-lg bg-cyan-50 border-2 border-cyan-200 ${
                    isFullscreen ? 'text-lg' : 'text-base'
                  }`}>
                    {loadingParticipants ? (
                      <div className="flex items-center gap-2 text-cyan-700">
                        <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                        <span style={{ fontFamily: 'Concert One, cursive' }}>กำลังโหลด...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-cyan-700">
                        <span style={{ fontFamily: 'Concert One, cursive' }}>👥 จำนวนผู้เข้าร่วม</span>
                        <span className="font-bold" style={{ fontFamily: 'Concert One, cursive' }}>{participants.length} คน</span>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleConfirmSession}
                  disabled={!tempSelectedSession || loadingParticipants}
                  className={`w-full py-4 rounded-lg font-bold transition-all duration-200 ${
                    isFullscreen ? 'text-xl' : 'text-lg'
                  } ${
                    !tempSelectedSession || loadingParticipants
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white transform hover:scale-105 active:scale-95 shadow-lg'
                  }`}
                  style={{ fontFamily: 'Concert One, cursive' }}
                >
                  {loadingParticipants ? 'กำลังโหลด...' : '🎲 ตกลง เริ่ม Lucky Draw!'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Back Button - only show when not in session selection */}
        {!showSessionSelection && selectedSession && (
          <button
            onClick={handleBackToSelection}
            className={`absolute top-4 left-4 z-10 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg p-3 shadow-lg transition-all duration-200 ${
              isFullscreen ? 'text-lg' : 'text-base'
            }`}
            style={{ fontFamily: 'Concert One, cursive' }}
            title="กลับไปเลือก Session ใหม่"
          >
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-xl">←</span>
              <span className="font-medium">กลับ</span>
            </div>
          </button>
        )}
        {/* Show Lucky Draw Title only if session is selected and not showing selection */}
        {selectedSession && !showSessionSelection && (
          <>
            <h2 className={`font-bold text-center text-white mb-8 ${
              isFullscreen ? 'text-7xl' : 'text-6xl'
            }`} style={{ fontFamily: 'Concert One, cursive' }}>
              🎰 Lucky Draw
            </h2>
            <p className={`text-center text-cyan-100 mb-12 font-medium ${
              isFullscreen ? 'text-3xl' : 'text-2xl'
            }`} style={{ fontFamily: 'Concert One, cursive' }}>
              {sessionTitle}
            </p>
          </>
        )}

        {/* Sound Controls - only show if session is selected and not showing selection */}
        {selectedSession && !showSessionSelection && (
        <div className={`flex items-center justify-center gap-6 ${
          isFullscreen ? 'mb-12' : 'mb-10'
        }`}>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
              soundEnabled
                ? 'bg-pink-300 bg-opacity-30 text-white hover:bg-opacity-40'
                : 'bg-purple-300 bg-opacity-30 text-purple-100 hover:bg-opacity-40'
            }`}
            style={{ fontFamily: 'Concert One, cursive' }}
          >
            {soundEnabled ? '🔊' : '🔇'}
            {soundEnabled ? 'เสียง' : 'ปิดเสียง'}
          </button>
          
          {soundEnabled && (
            <div className="flex items-center gap-3">
              <span className="text-base text-cyan-100">🔉</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-24 h-3 bg-pink-300 bg-opacity-30 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-base text-cyan-100">🔊</span>
            </div>
          )}
        </div>
        )}

        {/* Slot Window - only show if session is selected and has participants and not showing selection */}
        {selectedSession && !showSessionSelection && participants.length > 0 && (
        <div className={`slot-window bg-gradient-to-b from-pink-300 to-pink-400 rounded-2xl p-8 mb-12 relative overflow-hidden border-4 border-yellow-400 ${
          isFullscreen ? 'w-full max-w-none mx-auto' : 'w-full max-w-none mx-auto'
        }`}>
          <div className={`slot-inner bg-gradient-to-b from-purple-400 to-purple-500 rounded-xl relative overflow-hidden ${
            isFullscreen ? 'h-40' : 'h-32'
          }`}>
            {/* Reel Container */}
            <div 
              ref={reelRef}
              className="reel absolute inset-0"
            />
            
            {/* Slot Window Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black to-transparent"></div>
              <div className="absolute top-1/2 left-0 right-0 transform -translate-y-1/2 h-16 border-t-2 border-b-2 border-yellow-400"></div>
            </div>
          </div>
        </div>
        )}

        {/* Winner Details */}
        {selectedSession && !showSessionSelection && winner && (
          <div className="text-center mb-6 p-4 bg-white bg-opacity-20 rounded-xl">
            <p className="text-white text-lg" style={{ fontFamily: 'Concert One, cursive' }}>
              📧 {winner.email}
            </p>
            {winner.faculty && (
              <p className="text-cyan-100 text-base mt-1" style={{ fontFamily: 'Concert One, cursive' }}>
                🏫 {winner.faculty} {winner.department && `• ${winner.department}`}
              </p>
            )}
          </div>
        )}

        {/* Controls - only show if session is selected and not showing selection */}
        {selectedSession && !showSessionSelection && (
        <div className={`text-center ${isFullscreen ? 'space-y-6' : 'space-y-5'}`}>
          <button
            onClick={spin}
            disabled={isSpinning || availableParticipants.length === 0}
            className={`
              ${isFullscreen ? 'px-16 py-8 text-3xl' : 'px-14 py-7 text-2xl'} rounded-2xl font-bold transition-all duration-200 shadow-lg
              ${isSpinning || availableParticipants.length === 0
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-yellow-500 hover:bg-yellow-600 text-white transform hover:scale-105 active:scale-95'
              }
            `}
            style={{ fontFamily: 'Concert One, cursive' }}
          >
            {isSpinning ? (
              <span className="flex items-center gap-3">
                <div className={`${isFullscreen ? 'w-8 h-8' : 'w-6 h-6'} border-2 border-white border-t-transparent rounded-full animate-spin`}></div>
                กำลังสุ่ม...
              </span>
            ) : availableParticipants.length === 0 ? (
              'สุ่มหมดแล้ว'
            ) : (
              `🎲 สุ่มเลย! (เหลือ ${availableParticipants.length} คน)`
            )}
          </button>

          {availableParticipants.length < participants.length && (
            <button
              onClick={reset}
              className={`${isFullscreen ? 'px-12 py-4 text-xl' : 'px-10 py-4 text-lg'} bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors`}
              style={{ fontFamily: 'Concert One, cursive' }}
            >
              🔄 เริ่มใหม่
            </button>
          )}
        </div>
        )}

        {/* Empty State Messages - only show when not showing session selection */}
        {selectedSession && !showSessionSelection && participants.length === 0 && !loadingParticipants && (
          <div className="text-center py-16">
            <div className={`${isFullscreen ? 'text-8xl' : 'text-6xl'} mb-4`}>😔</div>
            <h3 className={`font-bold text-white mb-2 ${
              isFullscreen ? 'text-4xl' : 'text-2xl'
            }`} style={{ fontFamily: 'Concert One, cursive' }}>
              ไม่มีผู้เข้าร่วมใน Session นี้
            </h3>
            <p className={`text-cyan-100 ${
              isFullscreen ? 'text-2xl' : 'text-lg'
            }`} style={{ fontFamily: 'Concert One, cursive' }}>
              กรุณาเลือก Session อื่นที่มีผู้ลงทะเบียนแล้ว
            </p>
          </div>
        )}

      </div>

      {/* Styles */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Concert+One&display=swap');
        .reel-item {
          height: ${isFullscreen ? '160px' : '128px'};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isFullscreen ? '3.5rem' : '2.5rem'};
          font-weight: bold;
          font-family: 'Concert One', cursive;
          color: white;
          text-align: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          transform: translate3d(0, 0, 0);
        }

        .fullscreen-container {
          background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%);
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 9999;
        }

        .fullscreen-slot {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          animation: confetti-fall 3s linear forwards;
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .slot-machine {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #7c3aed 100%);
          box-shadow: 
            0 0 50px rgba(99, 102, 241, 0.3),
            inset 0 2px 10px rgba(255, 255, 255, 0.3),
            inset 0 -2px 10px rgba(0, 0, 0, 0.1);
        }

        .slot-window {
          box-shadow: 
            inset 0 0 20px rgba(0, 0, 0, 0.5),
            0 0 30px rgba(0, 0, 0, 0.3);
        }

        .slot-inner {
          box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.7);
        }

        /* Custom range slider styling */
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
        }

        input[type="range"]::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </div>
  )
}