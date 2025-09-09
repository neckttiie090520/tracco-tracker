import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Settings, Users, Edit2, UserPlus, UserX, LogOut, AlertTriangle } from 'lucide-react'
import { groupService } from '../services/groups'
import { useAuth } from '../hooks/useAuth'
import { Database } from '../types/database'

type TaskGroup = Database['public']['Tables']['task_groups']['Row']
type Member = {
  user_id: string
  role: string
  joined_at: string
  user: {
    id: string
    name: string
    email: string
  }
}

export default function GroupSettingsPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [group, setGroup] = useState<TaskGroup | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  useEffect(() => {
    if (groupId) {
      loadGroupData()
    }
  }, [groupId])

  useEffect(() => {
    if (searchQuery.length >= 2) {
      handleSearch()
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const loadGroupData = async () => {
    try {
      setLoading(true)
      const membersData = await groupService.listMembers(groupId!)
      setMembers(membersData || [])
      
      // Get group info from the first member's group data
      if (membersData && membersData.length > 0) {
        // We need to fetch group details separately since listMembers doesn't return full group info
        const userGroup = await groupService.getUserGroupForTask(membersData[0].user_id, membersData[0].user_id)
        if (userGroup) {
          setGroup(userGroup)
          setNewGroupName(userGroup.name)
        }
      }
    } catch (err) {
      console.error('Failed to load group data:', err)
      setError('ไม่สามารถโหลดข้อมูลกลุ่มได้')
    } finally {
      setLoading(false)
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

  const handleEditGroupName = async () => {
    if (!group || !newGroupName.trim()) return
    
    try {
      await groupService.renameGroup(group.id, newGroupName.trim())
      setGroup({ ...group, name: newGroupName.trim() })
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to rename group:', err)
      setError('ไม่สามารถเปลี่ยนชื่อกลุ่มได้')
    }
  }

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return
    
    try {
      await groupService.addMembers(groupId!, selectedUsers)
      setSelectedUsers([])
      setSearchQuery('')
      setSearchResults([])
      await loadGroupData() // Reload to show new members
    } catch (err) {
      console.error('Failed to add members:', err)
      setError('ไม่สามารถเพิ่มสมาชิกได้')
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบสมาชิกคนนี้ออกจากกลุ่ม?')) return
    
    try {
      await groupService.removeMember(groupId!, userId)
      await loadGroupData() // Reload to update member list
    } catch (err) {
      console.error('Failed to remove member:', err)
      setError('ไม่สามารถลบสมาชิกได้')
    }
  }

  const handleLeaveGroup = async () => {
    if (!user || !window.confirm('คุณแน่ใจหรือไม่ที่จะออกจากกลุ่ม?')) return
    
    try {
      await groupService.removeMember(groupId!, user.id)
      navigate('/workshops') // Redirect to workshops page
    } catch (err) {
      console.error('Failed to leave group:', err)
      setError('ไม่สามารถออกจากกลุ่มได้')
    }
  }

  const isOwner = group && user && groupService.isOwner(group, user.id)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">ไม่พบข้อมูลกลุ่ม</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">การตั้งค่ากลุ่ม</h1>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Group Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อกลุ่ม</label>
            {isEditing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ชื่อกลุ่ม"
                />
                <button
                  onClick={handleEditGroupName}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                >
                  บันทึก
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setNewGroupName(group.name)
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400 transition-colors"
                >
                  ยกเลิก
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-gray-900 font-medium">{group.name}</span>
                {isOwner && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50"
                    title="แก้ไขชื่อกลุ่ม"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Party Code */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">รหัสกลุ่ม</label>
            <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 font-mono text-sm">
              {group.party_code}
            </div>
          </div>
        </div>

        {/* Add Members Section */}
        {isOwner && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">เพิ่มสมาชิกใหม่</h2>
            </div>

            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ค้นหาสมาชิกด้วยชื่อหรืออีเมล"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="p-3 hover:bg-gray-50 border-b border-gray-200 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.id])
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id))
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedUsers.length > 0 && (
                <button
                  onClick={handleAddMembers}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                >
                  เพิ่มสมาชิก ({selectedUsers.length} คน)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Members List */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">สมาชิกในกลุ่ม ({members.length} คน)</h2>
          </div>

          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <p className="font-medium text-gray-900">{member.user.name}</p>
                  <p className="text-sm text-gray-500">{member.user.email}</p>
                  {member.role === 'owner' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                      เจ้าของกลุ่ม
                    </span>
                  )}
                </div>
                {isOwner && member.role !== 'owner' && (
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    className="p-2.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="ลบสมาชิก"
                  >
                    <UserX className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Leave Group */}
        {!isOwner && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-2 mb-4">
              <LogOut className="h-5 w-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-900">ออกจากกลุ่ม</h2>
            </div>
            <p className="text-gray-600 mb-4">หากคุณออกจากกลุ่ม คุณจะไม่สามารถเข้าถึงงานของกลุ่มนี้ได้อีก</p>
            <button
              onClick={handleLeaveGroup}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
            >
              ออกจากกลุ่ม
            </button>
          </div>
        )}
      </div>
    </div>
  )
}