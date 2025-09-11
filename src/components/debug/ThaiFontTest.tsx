import React, { useEffect, useState } from 'react'

export function ThaiFontTest() {
  const [fontLoadStatus, setFontLoadStatus] = useState<Record<string, boolean>>({})
  
  useEffect(() => {
    const testFonts = ['Prompt', 'Noto Sans Thai', 'Sarabun']
    
    const checkFont = (fontName: string): boolean => {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (!context) return false
      
      // Test Thai character
      const testChar = 'ก'
      context.font = `16px ${fontName}, sans-serif`
      const withFont = context.measureText(testChar).width
      
      context.font = '16px sans-serif'
      const withoutFont = context.measureText(testChar).width
      
      return withFont !== withoutFont
    }
    
    const results: Record<string, boolean> = {}
    testFonts.forEach(font => {
      results[font] = checkFont(font)
    })
    setFontLoadStatus(results)
  }, [])
  
  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg z-50 max-w-md">
      <h3 className="font-bold text-sm mb-2">Thai Font Test</h3>
      
      {/* Test different fonts */}
      <div className="space-y-2 text-sm">
        <div className="font-thai">
          <strong>Prompt:</strong> สวัสดีครับ เทสต์ฟอนต์ไทย
        </div>
        <div style={{ fontFamily: 'Noto Sans Thai, sans-serif' }}>
          <strong>Noto Sans Thai:</strong> สวัสดีครับ เทสต์ฟอนต์ไทย
        </div>
        <div style={{ fontFamily: 'Sarabun, sans-serif' }}>
          <strong>Sarabun:</strong> สวัสดีครับ เทสต์ฟอนต์ไทย
        </div>
        <div className="debug-thai">
          <strong>Debug Class:</strong> สวัสดีครับ เทสต์ฟอนต์ไทย
        </div>
      </div>
      
      {/* Font loading status */}
      <div className="mt-3 pt-3 border-t">
        <div className="text-xs text-gray-600">Font Status:</div>
        {Object.entries(fontLoadStatus).map(([font, loaded]) => (
          <div key={font} className="text-xs flex justify-between">
            <span>{font}:</span>
            <span className={loaded ? 'text-green-600' : 'text-red-600'}>
              {loaded ? '✓' : '✗'}
            </span>
          </div>
        ))}
      </div>
      
      {/* Test common Thai phrases */}
      <div className="mt-3 pt-3 border-t space-y-1 text-xs">
        <div className="font-thai">กรุณาใส่ชื่อกลุ่ม</div>
        <div className="font-thai">เกิดข้อผิดพลาดในการเพิ่มสมาชิก</div>
        <div className="font-thai">ยืนยันการลบกลุ่ม</div>
        <div className="font-thai">ไม่พบข้อมูลผู้ใช้</div>
      </div>
    </div>
  )
}