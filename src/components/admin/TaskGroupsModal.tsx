import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { groupService } from '../../services/groups'

interface TaskGroupsModalProps {
  task: any
  onClose: () => void
}

export function TaskGroupsModal({ task, onClose }: TaskGroupsModalProps) {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [members, setMembers] = useState<Record<string, any[]>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [addingForGroup, setAddingForGroup] = useState<string | null>(null)

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
      alert('Failed to add member')
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
      alert('Failed to remove member')
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
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="p-4">
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
                        className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        onClick={() => navigate(`/group-settings/${g.id}`)}
                        title="การตั้งค่ากลุ่ม"
                      >
                        <Settings className="h-5 w-5" />
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
                              <button onClick={() => removeMember(g.id, m.user_id)} className="text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full w-4 h-4 flex items-center justify-center text-sm font-bold transition-colors">×</button>
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

