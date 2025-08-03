import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Navigate, useLocation } from 'react-router-dom'

// Extend Window interface for Vanta.js
declare global {
  interface Window {
    VANTA: any;
    p5: any;
  }
}

export function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [vantaEffect, setVantaEffect] = useState<any>(null)
  const vantaRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    if (!vantaEffect && vantaRef.current) {
      // Load p5.js first, then Vanta.js from CDN
      const loadScript = (src: string) => {
        return new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = src
          script.onload = resolve
          script.onerror = reject
          document.head.appendChild(script)
        })
      }

      const loadVanta = async () => {
        try {
          // Load p5.js if not already loaded
          if (!window.p5) {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.1.9/p5.min.js')
          }
          
          // Load Vanta.js if not already loaded
          if (!window.VANTA) {
            await loadScript('https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.topology.min.js')
          }
          
          // Initialize Vanta effect
          if (window.VANTA && vantaRef.current) {
            setVantaEffect(
              window.VANTA.TOPOLOGY({
                el: vantaRef.current,
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200.00,
                minWidth: 200.00,
                scale: 1.00,
                scaleMobile: 1.00,
                color: 0xffffff,
                backgroundColor: 0x4f46e5, // indigo-600
                spacing: 18.00,
                noise: 2.00
              })
            )
          }
        } catch (error) {
          console.error('Error loading Vanta.js:', error)
        }
      }

      loadVanta()
    }
    return () => {
      if (vantaEffect) vantaEffect.destroy()
    }
  }, [vantaEffect])

  useEffect(() => {
    return () => {
      if (vantaEffect) vantaEffect.destroy()
    }
  }, [])

  // Redirect if already authenticated
  if (user && !loading) {
    const from = location.state?.from?.pathname || '/dashboard'
    return <Navigate to={from} replace />
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true)
      await signInWithGoogle()
    } catch (error) {
      console.error('Google Sign-In Error:', error)
      alert('Failed to sign in with Google. Please try again.')
    } finally {
      setIsSigningIn(false)
    }
  }

  if (loading) {
    return (
      <div ref={vantaRef} className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div ref={vantaRef} className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="group bg-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-500 hover:shadow-3xl hover:scale-105 transform-gpu perspective-1000"
             style={{
               background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
               backdropFilter: 'blur(20px)',
               boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
             }}
             onMouseMove={(e) => {
               const rect = e.currentTarget.getBoundingClientRect();
               const x = e.clientX - rect.left - rect.width / 2;
               const y = e.clientY - rect.top - rect.height / 2;
               e.currentTarget.style.transform = `perspective(1000px) rotateY(${x / 20}deg) rotateX(${-y / 20}deg) translateZ(20px)`;
             }}
             onMouseLeave={(e) => {
               e.currentTarget.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) translateZ(0px)';
             }}
        >
          <div className="flex justify-center mb-6">
            <div className="relative">
              <img 
                src="/logo.png" 
                alt="Traco Logo" 
                className="h-20 w-20 filter drop-shadow-lg"
              />
              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl"></div>
            </div>
          </div>
          <h2 className="text-center text-4xl font-extrabold text-white mb-2 drop-shadow-lg">
            Traco
          </h2>
          <p className="text-center text-white/80 mb-8 drop-shadow-md">
            Workshop Tracker Tools - Sign in to access workshops and track your progress
          </p>
          
          <button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="group relative w-full flex justify-center py-4 px-6 border border-white/30 text-sm font-medium rounded-xl text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 hover:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 transform-gpu"
            style={{
              backdropFilter: 'blur(10px)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 10px 20px rgba(0, 0, 0, 0.2)'
            }}
          >
            {isSigningIn ? (
              <span>Signing in...</span>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}