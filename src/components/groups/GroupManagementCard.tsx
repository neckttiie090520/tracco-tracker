import React, { useState, useEffect } from 'react'
import { Users, Plus, X, Edit2, Trash2, Copy, HelpCircle } from 'lucide-react'
import { groupService } from '../../services/groups'
import { useAuth } from '../../hooks/useAuth'

interface GroupManagementCardProps {
  group?: any
  taskId: string
  onGroupUpdated: (group: any) => void
  onGroupDeleted: () => void
}

export function GroupManagementCard({ group, taskId, onGroupUpdated, onGroupDeleted }: GroupManagementCardProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Group data
  const [groupName, setGroupName] = useState(group?.name || '')
  const [members, setMembers] = useState<any[]>([])
  
  // Search for new members
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  
  // Edit mode
  const [isEditing, setIsEditing] = useState(!group) // If no group, start in create mode
  const [showTutorial, setShowTutorial] = useState(false)

  const isOwner = group && user && group.owner_id === user.id

  useEffect(() => {
    if (group) {
      setGroupName(group.name)
      loadMembers()
    }
  }, [group])

  useEffect(() => {
    if (searchQuery.length >= 2) {
      handleSearch()
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const loadMembers = async () => {
    if (!group) return
    try {
      const membersData = await groupService.listMembers(group.id)
      setMembers(membersData || [])
    } catch (err) {
      console.error('Failed to load members:', err)
    }
  }

  const handleSearch = async () => {
    try {
      const results = await groupService.searchUsers(searchQuery)
      // Filter out users who are already members
      const memberIds = members.map(m => m.user_id)
      const filteredResults = results.filter(u => !memberIds.includes(u.id))
      setSearchResults(filteredResults)
    } catch (err) {
      console.error('Search failed:', err)
    }
  }

  const handleCreateOrUpdateGroup = async () => {
    if (!groupName.trim()) {
      setError('กรุณาระบุชื่อกลุ่ม')
      return
    }

    try {
      setLoading(true)
      setError('')
      
      let updatedGroup
      if (group) {
        // Update existing group
        await groupService.renameGroup(group.id, groupName.trim())
        updatedGroup = { ...group, name: groupName.trim() }
      } else {
        // Create new group
        updatedGroup = await groupService.createGroup(taskId, groupName.trim(), user!.id)
      }
      
      setSuccess(group ? 'บันทึกการเปลี่ยนแปลงแล้ว' : 'สร้างกลุ่มเรียบร้อย')
      setIsEditing(false)
      onGroupUpdated(updatedGroup)
      
      if (!group) {
        // If this was a create operation, load members
        await loadMembers()
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async (userId: string) => {
    if (!group) return
    
    try {
      setLoading(true)
      await groupService.addMembers(group.id, [userId])
      setSearchQuery('')
      setSearchResults([])
      await loadMembers()
      setSuccess('เพิ่มสมาชิกแล้ว')
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถเพิ่มสมาชิกได้')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!group) return
    
    const isLeavingGroup = userId === user?.id
    const confirmMessage = isLeavingGroup 
      ? 'คุณแน่ใจหรือไม่ที่จะออกจากกลุ่ม?' 
      : 'คุณแน่ใจหรือไม่ที่จะลบสมาชิกคนนี้?'
    
    if (!window.confirm(confirmMessage)) return
    
    try {
      setLoading(true)
      await groupService.removeMember(group.id, userId)
      
      if (isLeavingGroup) {
        onGroupDeleted() // User left the group
      } else {
        await loadMembers()
        setSuccess('ลบสมาชิกแล้ว')
      }
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถลบสมาชิกได้')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = async () => {
    if (!group || !isOwner) return
    
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบกลุ่มนี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) return
    
    try {
      setLoading(true)
      await groupService.deleteGroup(group.id)
      setSuccess('ลบกลุ่มแล้ว')
      onGroupDeleted()
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถลบกลุ่มได้')
    } finally {
      setLoading(false)
    }
  }

  const copyGroupCode = () => {
    if (group?.party_code) {
      navigator.clipboard.writeText(group.party_code)
      setSuccess('คัดลอกรหัสกลุ่มแล้ว')
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  return (
    <div className="bg-white rounded-xl border-2 border-blue-200 shadow-lg">
      {/* Header */}
      <div className="bg-blue-50 px-6 py-4 border-b border-blue-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900">
            {group ? 'ตั้งค่ากลุ่ม' : 'สร้างกลุ่มใหม่'}
          </h3>
          {!group && (
            <button
              onClick={() => setShowTutorial(!showTutorial)}
              className="text-blue-600 hover:text-blue-800"
              title="วิธีใช้งาน"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {group && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 font-medium">รหัสเข้าร่วมกลุ่ม:</span>
            <button
              onClick={copyGroupCode}
              className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded flex items-center gap-1 transition-colors font-mono"
              title="คัดลอกรหัสกลุ่ม"
            >
              <Copy className="h-3 w-3" />
              {group.party_code}
            </button>
          </div>
        )}
      </div>

      {/* Tutorial */}
      {showTutorial && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-4">
          <div className="text-sm text-yellow-800">
            <h4 className="font-medium mb-2">💡 วิธีใช้งานระบบกลุ่ม:</h4>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>สร้างกลุ่มด้วยชื่อที่ต้องการ</li>
              <li>เชิญสมาชิกโดยค้นหาชื่อหรืออีเมล แล้วคลิกชื่อเพื่อเพิ่ม</li>
              <li>แชร์รหัสกลุ่มให้เพื่อนเพื่อให้เข้าร่วมเอง</li>
              <li>ส่งงานโดยสมาชิกคนใดคนหนึ่งแทนกลุ่ม</li>
              <li>เจ้าของกลุ่มสามารถจัดการสมาชิกและลบกลุ่มได้</li>
            </ol>
          </div>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-green-600 text-sm">{success}</p>
          </div>
        )}

        {/* Group Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ชื่อกลุ่ม
          </label>
          {isEditing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ระบุชื่อกลุ่ม"
                disabled={loading}
              />
              <button
                onClick={handleCreateOrUpdateGroup}
                disabled={loading || !groupName.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'กำลัง...' : (group ? 'บันทึก' : 'สร้างกลุ่ม')}
              </button>
              {group && (
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setGroupName(group.name)
                    setError('')
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400 transition-colors"
                >
                  ยกเลิก
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-gray-900 font-medium">{group?.name}</span>
              {isOwner && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50"
                  title="แก้ไขชื่อกลุ่ม"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Add Members (only if group exists and user is owner) */}
        {group && isOwner && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              เพิ่มสมาชิกใหม่
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ค้นหาชื่อหรืออีเมล"
                disabled={loading}
              />
              
              {searchResults.length > 0 && (
                <div className="border border-gray-200 rounded-md max-h-40 overflow-y-auto bg-white">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleAddMember(user.id)}
                      disabled={loading}
                      className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 disabled:opacity-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Members List */}
        {group && members.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              สมาชิกในกลุ่ม ({members.length} คน)
            </label>
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <div className="font-medium text-gray-900">{member.user.name}</div>
                    <div className="text-xs text-gray-500">{member.user.email}</div>
                    {member.role === 'owner' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                        เจ้าของกลุ่ม
                      </span>
                    )}
                  </div>
                  
                  {(isOwner || member.user_id === user?.id) && member.role !== 'owner' && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      disabled={loading}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                      title={member.user_id === user?.id ? 'ออกจากกลุ่ม' : 'ลบสมาชิก'}
                    >
                      <i className="bx bx-x text-lg"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete Group (only for owner) */}
        {group && isOwner && (
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleDeleteGroup}
              disabled={loading}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-md transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              ลบกลุ่ม
            </button>
            <p className="text-xs text-gray-500 mt-1">
              การลบกลุ่มจะทำให้สามารถสร้างกลุ่มใหม่สำหรับงานนี้ได้
            </p>
          </div>
        )}
      </div>
    </div>
  )
}