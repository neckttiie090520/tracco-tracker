// Sound Service for Game Audio Effects
class SoundService {
  private sounds: Map<string, HTMLAudioElement> = new Map()
  private isEnabled: boolean = true
  private volume: number = 0.5
  private audioContext: AudioContext | null = null

  constructor() {
    this.initializeAudioContext()
    this.loadSounds()
    
    // Load settings from localStorage
    const savedVolume = localStorage.getItem('gameVolume')
    const soundEnabled = localStorage.getItem('soundEnabled')
    
    if (savedVolume) this.volume = parseFloat(savedVolume)
    if (soundEnabled) this.isEnabled = soundEnabled === 'true'
  }

  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (error) {
      console.warn('Web Audio API not supported')
    }
  }

  private loadSounds() {
    // Generate sounds using Web Audio API or use data URLs for simple tones
    this.generateSounds()
  }

  private generateSounds() {
    // Task completion sound
    this.createTone('taskComplete', [440, 554.37, 659.25], 0.3, 'sine')
    
    // Achievement unlock sound
    this.createTone('achievement', [261.63, 329.63, 392, 523.25], 0.5, 'triangle')
    
    // Power-up activation
    this.createTone('powerUp', [523.25, 659.25, 783.99, 1046.5], 0.4, 'sawtooth')
    
    // Level up sound
    this.createTone('levelUp', [392, 440, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99], 0.6, 'sine')
    
    // Error/fail sound
    this.createTone('error', [146.83, 123.47, 103.83], 0.4, 'triangle')
    
    // Click/button sound
    this.createTone('click', [800], 0.1, 'square')
    
    // Streak milestone
    this.createTone('streak', [440, 659.25, 880], 0.4, 'sine')
    
    // Bonus/reward sound
    this.createTone('bonus', [523.25, 659.25, 830.61, 1046.5, 1318.51], 0.5, 'triangle')
    
    // Notification sound
    this.createTone('notification', [587.33, 698.46], 0.2, 'sine')
    
    // Challenge start
    this.createTone('challengeStart', [220, 277.18, 369.99, 466.16], 0.6, 'sawtooth')
    
    // Timer warning (last 10 seconds)
    this.createTone('timerWarning', [880, 659.25], 0.3, 'square')
    
    // Victory fanfare
    this.createTone('victory', [
      261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5, 1318.51
    ], 0.8, 'sine')
  }

  private createTone(
    name: string, 
    frequencies: number[], 
    duration: number, 
    waveType: OscillatorType = 'sine'
  ) {
    if (!this.audioContext) {
      // Fallback to simple beep sound data URL
      const audio = new Audio()
      audio.src = this.createBeepDataURL(frequencies[0] || 440, duration)
      this.sounds.set(name, audio)
      return
    }

    // Create audio buffer
    const sampleRate = this.audioContext.sampleRate
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate)
    const channelData = buffer.getChannelData(0)

    for (let i = 0; i < buffer.length; i++) {
      const time = i / sampleRate
      let sample = 0

      // Create chord by combining frequencies
      frequencies.forEach((freq, index) => {
        const noteTime = time - (index * 0.1) // Slight delay between notes
        if (noteTime >= 0) {
          const envelope = this.createEnvelope(noteTime, duration / frequencies.length)
          sample += Math.sin(2 * Math.PI * freq * noteTime) * envelope * (1 / frequencies.length)
        }
      })

      channelData[i] = sample * 0.3 // Overall volume
    }

    // Convert buffer to data URL (simplified approach)
    const audio = new Audio()
    audio.src = this.bufferToDataURL(buffer)
    this.sounds.set(name, audio)
  }

  private createEnvelope(time: number, duration: number): number {
    const attackTime = 0.01
    const decayTime = 0.1
    const sustainLevel = 0.7
    const releaseTime = duration - decayTime - attackTime

    if (time < attackTime) {
      return time / attackTime
    } else if (time < attackTime + decayTime) {
      return 1 - (1 - sustainLevel) * ((time - attackTime) / decayTime)
    } else if (time < releaseTime) {
      return sustainLevel
    } else {
      const releaseProgress = (time - releaseTime) / (duration - releaseTime)
      return sustainLevel * (1 - releaseProgress)
    }
  }

  private createBeepDataURL(frequency: number, duration: number): string {
    const sampleRate = 22050
    const samples = duration * sampleRate
    const buffer = new ArrayBuffer(samples * 2)
    const view = new DataView(buffer)

    for (let i = 0; i < samples; i++) {
      const time = i / sampleRate
      const envelope = Math.sin(Math.PI * time / duration) // Simple envelope
      const sample = Math.sin(2 * Math.PI * frequency * time) * envelope * 0.3
      const intSample = Math.max(-32767, Math.min(32767, sample * 32767))
      view.setInt16(i * 2, intSample, true)
    }

    // Create WAV file header
    const wavBuffer = new ArrayBuffer(44 + buffer.byteLength)
    const wavView = new DataView(wavBuffer)
    
    // WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        wavView.setUint8(offset + i, str.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    wavView.setUint32(4, 36 + buffer.byteLength, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    wavView.setUint32(16, 16, true)
    wavView.setUint16(20, 1, true)
    wavView.setUint16(22, 1, true)
    wavView.setUint32(24, sampleRate, true)
    wavView.setUint32(28, sampleRate * 2, true)
    wavView.setUint16(32, 2, true)
    wavView.setUint16(34, 16, true)
    writeString(36, 'data')
    wavView.setUint32(40, buffer.byteLength, true)

    // Copy audio data
    const audioData = new Uint8Array(buffer)
    const wavData = new Uint8Array(wavBuffer)
    wavData.set(audioData, 44)

    // Convert to base64
    const base64 = btoa(String.fromCharCode(...wavData))
    return `data:audio/wav;base64,${base64}`
  }

  private bufferToDataURL(buffer: AudioBuffer): string {
    // Simplified conversion - in a real implementation, you'd properly encode to WAV
    return this.createBeepDataURL(440, 0.3) // Fallback
  }

  // Public methods
  play(soundName: string, customVolume?: number) {
    if (!this.isEnabled) return

    const sound = this.sounds.get(soundName)
    if (!sound) {
      console.warn(`Sound '${soundName}' not found`)
      return
    }

    try {
      sound.currentTime = 0
      sound.volume = (customVolume ?? this.volume) * this.volume
      sound.play().catch(e => {
        // Handle play promise rejection (common in browsers with autoplay restrictions)
        console.warn('Could not play sound:', e)
      })
    } catch (error) {
      console.warn('Error playing sound:', error)
    }
  }

  // Specific game sound methods
  playTaskComplete() {
    this.play('taskComplete')
  }

  playAchievement() {
    this.play('achievement')
  }

  playPowerUp() {
    this.play('powerUp')
  }

  playLevelUp() {
    this.play('levelUp')
  }

  playError() {
    this.play('error')
  }

  playClick() {
    this.play('click', 0.3) // Quieter for UI sounds
  }

  playStreak() {
    this.play('streak')
  }

  playBonus() {
    this.play('bonus')
  }

  playNotification() {
    this.play('notification', 0.4)
  }

  playChallengeStart() {
    this.play('challengeStart')
  }

  playTimerWarning() {
    this.play('timerWarning')
  }

  playVictory() {
    this.play('victory')
  }

  // Background music methods
  playBackgroundMusic(track: 'lobby' | 'arena' | 'victory' = 'lobby') {
    // For now, we'll create simple ambient tones
    if (!this.isEnabled) return

    const ambientSounds = {
      lobby: this.createAmbientLoop([220, 277.18, 329.63], 4),
      arena: this.createAmbientLoop([146.83, 174.61, 207.65, 246.94], 6),
      victory: this.createAmbientLoop([392, 440, 523.25, 659.25], 3)
    }

    // Play ambient background (simplified)
    this.playAmbientTones(track)
  }

  private createAmbientLoop(frequencies: number[], duration: number) {
    // Create a looping ambient sound
    return frequencies
  }

  private playAmbientTones(track: string) {
    // Simple ambient tone generation
    if (track === 'lobby') {
      // Play a subtle ambient sound every 5-10 seconds
      const playAmbient = () => {
        if (this.isEnabled) {
          this.play('notification', 0.1)
        }
        setTimeout(playAmbient, 5000 + Math.random() * 5000)
      }
      setTimeout(playAmbient, 2000)
    }
  }

  // Settings
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume))
    localStorage.setItem('gameVolume', this.volume.toString())
  }

  getVolume(): number {
    return this.volume
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled
    localStorage.setItem('soundEnabled', enabled.toString())
  }

  isAudioEnabled(): boolean {
    return this.isEnabled
  }

  // Audio visualization support
  createFrequencyAnalyzer(): AnalyserNode | null {
    if (!this.audioContext) return null
    
    const analyser = this.audioContext.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8
    
    return analyser
  }

  // Initialize audio context on user interaction (required by browsers)
  resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
  }

  // Sound effect sequences
  playComboSound(comboCount: number) {
    const baseFreq = 440
    const freq = baseFreq * Math.pow(1.2, comboCount - 1)
    this.createTone(`combo${comboCount}`, [freq], 0.2, 'sine')
    this.play(`combo${comboCount}`)
  }

  playCountdown(seconds: number) {
    if (seconds <= 3 && seconds > 0) {
      this.play('timerWarning')
    }
  }

  // Create sound variations
  createSoundVariations() {
    // Create multiple versions of common sounds for variety
    const variations = ['A', 'B', 'C']
    
    variations.forEach((variant, index) => {
      const pitchShift = 1 + (index * 0.1)
      this.createTone(`click${variant}`, [800 * pitchShift], 0.1, 'square')
      this.createTone(`taskComplete${variant}`, [440 * pitchShift, 554.37 * pitchShift], 0.3, 'sine')
    })
  }

  // Play random variation of a sound
  playVariation(baseSoundName: string) {
    const variations = ['A', 'B', 'C']
    const randomVariation = variations[Math.floor(Math.random() * variations.length)]
    const soundName = `${baseSoundName}${randomVariation}`
    
    if (this.sounds.has(soundName)) {
      this.play(soundName)
    } else {
      this.play(baseSoundName) // Fallback to base sound
    }
  }
}

// Create singleton instance
export const soundService = new SoundService()

// Sound effects hook for React components
export function useSounds() {
  const playSound = (soundName: string, volume?: number) => {
    soundService.play(soundName, volume)
  }

  const playGameSound = {
    taskComplete: () => soundService.playTaskComplete(),
    achievement: () => soundService.playAchievement(),
    powerUp: () => soundService.playPowerUp(),
    levelUp: () => soundService.playLevelUp(),
    error: () => soundService.playError(),
    click: () => soundService.playClick(),
    streak: () => soundService.playStreak(),
    bonus: () => soundService.playBonus(),
    notification: () => soundService.playNotification(),
    challengeStart: () => soundService.playChallengeStart(),
    timerWarning: () => soundService.playTimerWarning(),
    victory: () => soundService.playVictory(),
    combo: (count: number) => soundService.playComboSound(count),
    countdown: (seconds: number) => soundService.playCountdown(seconds)
  }

  return {
    playSound,
    ...playGameSound,
    setVolume: soundService.setVolume.bind(soundService),
    getVolume: soundService.getVolume.bind(soundService),
    setEnabled: soundService.setEnabled.bind(soundService),
    isEnabled: soundService.isAudioEnabled.bind(soundService),
    resumeAudio: soundService.resumeAudioContext.bind(soundService)
  }
}

// Auto-initialize audio context on first user interaction
if (typeof document !== 'undefined') {
  const initAudio = () => {
    soundService.resumeAudioContext()
    document.removeEventListener('click', initAudio)
    document.removeEventListener('keydown', initAudio)
    document.removeEventListener('touchstart', initAudio)
  }

  document.addEventListener('click', initAudio)
  document.addEventListener('keydown', initAudio)
  document.addEventListener('touchstart', initAudio)
}

export default soundService