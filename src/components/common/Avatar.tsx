import React, { useMemo } from 'react'
import { minidenticon } from 'minidenticons'

interface AvatarProps {
  username?: string
  name?: string
  avatarSeed?: string
  size?: number
  saturation?: number
  lightness?: number
  className?: string
  onClick?: () => void
}

export function Avatar({ 
  username, 
  name, 
  avatarSeed,
  size = 40, 
  saturation = 95, 
  lightness = 45, 
  className = '',
  onClick 
}: AvatarProps) {
  const baseSeed = avatarSeed || username || name || 'anonymous'
  
  // Generate seed for different avatar styles
  // For predefined styles, use variants to get different shapes
  // For custom saturation/lightness values, keep the same seed (only colors change)
  const seed = useMemo(() => {
    // Map predefined saturation/lightness combinations to different seed variants
    const styleMap: Record<string, string> = {
      '95-45': baseSeed, // Original
      '85-55': baseSeed + '_variant_a', // Style A
      '75-50': baseSeed + '_variant_b', // Style B  
      '90-40': baseSeed + '_variant_c', // Style C
      '70-60': baseSeed + '_variant_d', // Style D
      '95-35': baseSeed + '_variant_e', // Style E
      '60-65': baseSeed + '_variant_f', // Style F
      '100-45': baseSeed + '_variant_g', // Style G
    }
    
    const key = `${saturation}-${lightness}`
    
    // If it's one of our predefined styles, use the variant seed for different shapes
    if (styleMap[key]) {
      return styleMap[key]
    }
    
    // For any other combination (custom slider values), use the base seed
    // This way custom colors only change saturation/lightness, not the shape
    return baseSeed
  }, [baseSeed, saturation, lightness])
  
  const svgURI = useMemo(
    () => 'data:image/svg+xml;utf8,' + encodeURIComponent(minidenticon(seed, saturation, lightness)),
    [seed, saturation, lightness]
  )

  const baseClasses = `rounded-full bg-gray-100 flex-shrink-0 ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all' : ''}`
  const finalClasses = `${baseClasses} ${className}`

  return (
    <img
      src={svgURI}
      alt={`${name || username || 'User'} avatar`}
      width={size}
      height={size}
      className={finalClasses}
      onClick={onClick}
    />
  )
}

// Avatar with initials fallback for cases where we want text-based avatars
export function InitialAvatar({ 
  name, 
  size = 40, 
  className = '',
  onClick 
}: { 
  name?: string
  size?: number 
  className?: string
  onClick?: () => void
}) {
  const initials = useMemo(() => {
    if (!name) return '?'
    return name
      .split(' ')
      .slice(0, 2)
      .map(word => word.charAt(0).toUpperCase())
      .join('')
  }, [name])

  const baseClasses = `rounded-full bg-gray-500 text-white font-semibold flex items-center justify-center flex-shrink-0 ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all' : ''}`
  const finalClasses = `${baseClasses} ${className}`

  return (
    <div
      className={finalClasses}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      onClick={onClick}
    >
      {initials}
    </div>
  )
}

// Avatar selector component for profile editing
export function AvatarSelector({ 
  username, 
  name, 
  selectedSaturation = 95, 
  selectedLightness = 45,
  selectedAvatarSeed,
  onSelect 
}: {
  username?: string
  name?: string
  selectedSaturation?: number
  selectedLightness?: number
  selectedAvatarSeed?: string
  onSelect: (saturation: number, lightness: number, avatarSeed?: string) => void
}) {
  const baseSeed = username || name || 'anonymous'
  
  // Generate different avatar styles with various saturation/lightness combinations
  const avatarStyles = [
    { name: 'Original', saturation: 95, lightness: 45 },
    { name: 'Style A', saturation: 85, lightness: 55 },
    { name: 'Style B', saturation: 75, lightness: 50 },
    { name: 'Style C', saturation: 90, lightness: 40 },
    { name: 'Style D', saturation: 70, lightness: 60 },
    { name: 'Style E', saturation: 95, lightness: 35 },
    { name: 'Style F', saturation: 60, lightness: 65 },
    { name: 'Style G', saturation: 100, lightness: 45 },
  ]
  

  // Generate random string for random avatar shapes (like minidenticons tests)
  const generateRandomSeed = (length = 10) => {
    let str = ""
    while (str.length < length) {
      str += Math.random().toString(36).substring(2)
    }
    return str.substring(0, length)
  }

  const handleRandomStyle = () => {
    // Generate random seed for random shapes (different from user's identity)
    const randomSeed = generateRandomSeed(10)
    // Generate random saturation (40-100) and lightness (20-80) for variety  
    const randomSaturation = Math.floor(Math.random() * 61) + 40  // 40-100
    const randomLightness = Math.floor(Math.random() * 61) + 20   // 20-80
    onSelect(randomSaturation, randomLightness, randomSeed)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">Choose Avatar Style</h3>
        <button
          type="button"
          onClick={handleRandomStyle}
          className="flex items-center space-x-2 px-3 py-1 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Random</span>
        </button>
      </div>
      
      {/* Avatar Style Options */}
      <div className="grid grid-cols-4 gap-3">
        {avatarStyles.map((style, index) => {
          const isSelected = style.saturation === selectedSaturation && style.lightness === selectedLightness
          
          return (
            <button
              key={style.name}
              type="button"
              onClick={() => onSelect(style.saturation, style.lightness, selectedAvatarSeed)}
              className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Avatar
                username={username}
                name={name}
                avatarSeed={selectedAvatarSeed}
                size={48}
                saturation={style.saturation}
                lightness={style.lightness}
              />
              <span className="text-xs text-gray-600 mt-2">{style.name}</span>
            </button>
          )
        })}
      </div>

    </div>
  )
}