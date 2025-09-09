import React, { useState } from 'react'
import { UserPlus, HelpCircle } from 'lucide-react'
import { groupService } from '../../services/groups'
import { useAuth } from '../../hooks/useAuth'

interface JoinGroupCardProps {
  taskId: string
  onJoined: (group: any) => void
}

export function JoinGroupCard({ taskId, onJoined }: JoinGroupCardProps) {
  const { user } = useAuth()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  const handleJoin = async () => {
    if (!code.trim()) {
      setError('กรุณาระบุรหัสกลุ่ม')
      return
    }

    try {
      setLoading(true)
      setError('')
      
      const group = await groupService.joinByCode(code.trim().toUpperCase(), user!.id)
      onJoined(group)
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถเข้าร่วมกลุ่มได้')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border-2 border-green-200 shadow-lg">
      {/* Header */}
      <div className="bg-green-50 px-6 py-4 border-b border-green-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserPlus className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-green-900">เข้าร่วมกลุ่ม</h3>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="text-green-600 hover:text-green-800"
            title="ดูคำแนะนำ"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Help Section */}
      {showHelp && (
        <div className="bg-blue-50 border-b border-blue-200 p-4">
          <div className="text-sm text-blue-800">
            <h4 className="font-medium mb-2">💡 วิธีเข้าร่วมกลุ่ม:</h4>
            <div className="space-y-2 text-xs">
              <p><strong>รหัสกลุ่มคืออะไร?</strong></p>
              <p>• รหัสกลุ่มเป็นรหัส 6 ตัวอักษร (เช่น ABC123) ที่ใช้สำหรับเข้าร่วมกลุ่ม</p>
              
              <p className="mt-2"><strong>จะเอารหัสมาจากไหน?</strong></p>
              <p>• ขอรหัสจากเพื่อนที่อยู่ในกลุ่มแล้ว</p>
              <p>• หรือขอจากเจ้าของกลุ่มที่สร้างกลุ่มไว้</p>
              
              <p className="mt-2"><strong>เมื่อเข้าร่วมแล้วจะเกิดอะไรขึ้น?</strong></p>
              <p>• คุณจะกลายเป็นสมาชิกของกลุ่มนั้น</p>
              <p>• สามารถส่งงานร่วมกันกับสมาชิกคนอื่นได้</p>
              <p>• เห็นชื่อสมาชิกทุกคนในกลุ่ม</p>
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              รหัสกลุ่ม
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-mono tracking-widest text-center"
              placeholder="ระบุรหัสกลุ่ม (เช่น ABC123)"
              disabled={loading}
              maxLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">
              รหัสกลุ่มประกอบด้วยตัวอักษรและตัวเลข 6 ตัว
            </p>
          </div>
          
          <button
            onClick={handleJoin}
            disabled={loading || !code.trim()}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'กำลังเข้าร่วม...' : 'เข้าร่วมกลุ่ม'}
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <p className="text-xs text-gray-600">
            <strong>💡 เคล็ดลับ:</strong> หากไม่มีรหัสกลุ่ม ให้สร้างกลุ่มใหม่แทน หรือขอให้เพื่อนส่งรหัสให้
          </p>
        </div>
      </div>
    </div>
  )
}