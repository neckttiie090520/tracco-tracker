import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Trash2 } from 'lucide-react'
import { groupService } from '../../services/groups'
import { useAuth } from '../../hooks/useAuth'
import { useAlert } from '../../contexts/AlertContext'

interface TaskGroupsModalProps {
  task: any
  onClose: () => void
}

export function TaskGroupsModal({ task, onClose }: TaskGroupsModalProps) {
  const { user } = useAuth()
  const { showAlert, showError, showConfirm } = useAlert()
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [members, setMembers] = useState<Record<string, any[]>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [addingForGroup, setAddingForGroup] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await groupService.listTaskGroups(task.id)
      setGroups(data)
      // Prefetch member counts
      const allMembers: Record<string, any[]> = {}
      for (const g of data) {
        try {
          const mem = await groupService.listMembers(g.id)
          allMembers[g.id] = mem || []
        } catch {}
      }
      setMembers(allMembers)
    } catch (e: any) {
      setError(e?.message || 'Failed to load groups')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [task?.id])

  useEffect(() => {
    let active = true
    const run = async () => {
      if (!searchQuery.trim()) { setSearchResults([]); return }
      try {
        const res = await groupService.searchUsers(searchQuery, 8)
        if (active) setSearchResults(res || [])
      } catch {}
    }
    const t = setTimeout(run, 250)
    return () => { active = false; clearTimeout(t) }
  }, [searchQuery])

  const addUserToGroup = async (groupId: string, userId: string) => {
    try {
      setAddingForGroup(groupId)
      await groupService.addMembers(groupId, [userId])
      const mem = await groupService.listMembers(groupId)
      setMembers(prev => ({ ...prev, [groupId]: mem || [] }))
    } catch (e) {
      console.error('Failed to add member', e)
      showError('เกิดข้อผิดพลาดในการเพิ่มสมาชิก')
    } finally {
      setAddingForGroup(null)
      setSearchQuery('')
      setSearchResults([])
    }
  }

  const removeMember = async (groupId: string, userId: string) => {
    try {
      await groupService.removeMember(groupId, userId)
      const mem = await groupService.listMembers(groupId)
      setMembers(prev => ({ ...prev, [groupId]: mem || [] }))
    } catch (e) {
      console.error('Failed to remove member', e)
      showError('เกิดข้อผิดพลาดในการลบสมาชิก')
    }
  }

  const deleteGroup = async (groupId: string, groupName: string) => {
    const confirmed = await showConfirm(`ยืนยันการลบกลุ่ม "${groupName}"? การกระทำนี้ไม่สามารถยกเลิกได้`)
    if (!confirmed) {
      return
    }
    
    try {
      await groupService.deleteGroup(groupId)
      // Refresh data to update UI
      await fetchData()
    } catch (e) {
      console.error('Failed to delete group', e)
      showError('เกิดข้อผิดพลาดในการลบกลุ่ม')
    }
  }

  const createGroup = async () => {
    if (!newGroupName.trim()) {
      showError('กรุณาใส่ชื่อกลุ่ม')
      return
    }
    
    if (!user?.id) {
      showError('ไม่พบข้อมูลผู้ใช้')
      return
    }
    
    try {
      setCreating(true)
      await groupService.createGroup(task.id, newGroupName.trim(), user.id)
      setNewGroupName('')
      setShowCreateForm(false)
      // Refresh data to update UI
      await fetchData()
    } catch (e) {
      console.error('Failed to create group', e)
      showError('เกิดข้อผิดพลาดในการสร้างกลุ่ม')
    } finally {
      setCreating(false)
    }
  }

  if (!task) return null

  const modal = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Manage Groups for: {task.title}</h2>
            <p className="text-sm text-gray-600">Submission mode: group</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
            >
              + New Group
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
        </div>

        <div className="p-4">
          {/* Create Group Form */}
          {showCreateForm && (
            <div className="mb-4 p-4 border rounded-lg bg-blue-50">
              <h3 className="font-medium mb-3">Create New Group</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Group name"
                  className="flex-1 border px-3 py-2 rounded"
                  onKeyDown={(e) => e.key === 'Enter' && createGroup()}
                />
                <button
                  onClick={createGroup}
                  disabled={creating || !newGroupName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false)
                    setNewGroupName('')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-gray-600">
              <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
              Loading groups...
            </div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : groups.length === 0 ? (
            <div className="text-gray-600">No groups yet for this task.</div>
          ) : (
            <div className="space-y-3">
              {groups.map(g => (
                <div key={g.id} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{g.name}</div>
                      <div className="text-xs text-gray-600">Code: <span className="font-mono tracking-widest">{g.party_code}</span></div>
                      <div className="text-xs text-gray-600">Members: {members[g.id]?.length || 0}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        className="p-2.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        onClick={() => deleteGroup(g.id, g.name)}
                        title="ลบกลุ่ม"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                      <button className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1 rounded border border-blue-200 hover:border-blue-300" onClick={() => setExpandedGroup(expandedGroup === g.id ? null : g.id)}>
                        {expandedGroup === g.id ? 'Hide' : 'Manage'}
                      </button>
                    </div>
                  </div>
                  {expandedGroup === g.id && (
                    <div className="mt-3 space-y-2">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Add member</div>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full border px-3 py-2 rounded"
                          placeholder="Search name or email"
                        />
                        {searchResults.length > 0 && (
                          <div className="border rounded mt-1 bg-white max-h-40 overflow-auto text-sm">
                            {searchResults.map(s => (
                              <button key={s.id} onClick={() => addUserToGroup(g.id, s.id)} className="w-full text-left px-3 py-2 hover:bg-gray-50">
                                <div className="font-medium">{s.name || s.email}</div>
                                <div className="text-xs text-gray-500">{s.email}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Members</div>
                        <div className="flex flex-wrap gap-2">
                          {(members[g.id] || []).map(m => (
                            <span key={m.user_id} className="inline-flex items-center gap-1 bg-gray-100 border px-2 py-1 rounded text-xs">
                              {m.user?.name || m.user_id.slice(0,6)}
                              <button onClick={() => removeMember(g.id, m.user_id)} className="text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full w-7 h-7 flex items-center justify-center transition-colors"><i className="bx bx-x text-xl"></i></button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

