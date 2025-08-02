import React, { createContext, useContext, useState, ReactNode } from 'react'

export type Language = 'th' | 'en'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// Placeholder translations - will be expanded later when wording is finalized
const translations = {
  th: {
    // Navigation
    'nav.workshops': 'เวิร์คช็อป',
    'nav.dashboard': 'แดชบอร์ด',
    'nav.materials': 'เนื้อหา',
    'nav.profile': 'โปรไฟล์',
    'nav.signout': 'ออกจากระบบ',
    
    // Profile
    'profile.edit': 'แก้ไขโปรไฟล์',
    'profile.faculty': 'คณะ',
    'profile.department': 'ภาควิชา',
    'profile.organization': 'หน่วยงาน',
    'profile.bio': 'ประวัติย่อ',
    'profile.save': 'บันทึกการเปลี่ยนแปลง',
    'profile.cancel': 'ยกเลิก',
    'profile.custom': 'กรอกเอง',
    
    // Common
    'common.name': 'ชื่อ',
    'common.email': 'อีเมล',
    'common.save': 'บันทึก',
    'common.cancel': 'ยกเลิก',
    'common.loading': 'กำลังโหลด...',
    'common.error': 'เกิดข้อผิดพลาด',
    'common.success': 'สำเร็จ'
  },
  en: {
    // Navigation
    'nav.workshops': 'Workshops',
    'nav.dashboard': 'Dashboard', 
    'nav.materials': 'Materials',
    'nav.profile': 'Profile',
    'nav.signout': 'Sign Out',
    
    // Profile
    'profile.edit': 'Edit Profile',
    'profile.faculty': 'Faculty',
    'profile.department': 'Department',
    'profile.organization': 'Organization',
    'profile.bio': 'Bio',
    'profile.save': 'Save Changes',
    'profile.cancel': 'Cancel',
    'profile.custom': 'Custom Input',
    
    // Common
    'common.name': 'Name',
    'common.email': 'Email',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success'
  }
}

interface LanguageProviderProps {
  children: ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  // Default to Thai language
  const [language, setLanguage] = useState<Language>('th')
  
  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['th']] || key
  }
  
  const value = {
    language,
    setLanguage,
    t
  }
  
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}