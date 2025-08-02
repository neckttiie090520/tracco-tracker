// Simple event system for profile updates
type ProfileUpdateListener = () => void

class ProfileEventManager {
  private listeners: ProfileUpdateListener[] = []

  subscribe(listener: ProfileUpdateListener) {
    this.listeners.push(listener)
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  notify() {
    this.listeners.forEach(listener => {
      try {
        listener()
      } catch (error) {
        console.error('Error in profile update listener:', error)
      }
    })
  }
}

export const profileEvents = new ProfileEventManager()