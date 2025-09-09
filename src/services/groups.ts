import { supabase } from './supabase'
import { Database } from '../types/database'

type TaskGroup = Database['public']['Tables']['task_groups']['Row']
type TaskGroupInsert = Database['public']['Tables']['task_groups']['Insert']

function generatePartyCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < length; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export const groupService = {
  async createGroup(taskId: string, name: string, ownerId: string) {
    // generate unique party code (retry on collision)
    let attempts = 0
    let partyCode = generatePartyCode(6)
    while (attempts < 5) {
      const { data: exists } = await supabase.from('task_groups').select('id').eq('party_code', partyCode).maybeSingle()
      if (!exists) break
      partyCode = generatePartyCode(6)
      attempts++
    }

    const { data, error } = await supabase
      .from('task_groups')
      .insert({ task_id: taskId, name, owner_id: ownerId, party_code: partyCode } as TaskGroupInsert)
      .select('*')
      .single()

    if (error) throw error

    // auto-add owner as member
    await supabase.from('task_group_members').insert({ task_group_id: data.id, user_id: ownerId, role: 'owner' })

    return data
  },

  async getGroupById(groupId: string) {
    const { data, error } = await supabase
      .from('task_groups')
      .select('*')
      .eq('id', groupId)
      .single()
    if (error) throw error
    return data
  },

  async listTaskGroups(taskId: string) {
    const { data, error } = await supabase
      .from('task_groups')
      .select('id, name, owner_id, party_code, created_at')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async searchUsers(query: string, limit = 8) {
    const q = query.trim()
    if (!q) return []
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email')
      .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(limit)
    if (error) throw error
    return data || []
  },

  async addMembers(groupId: string, userIds: string[]) {
    if (!userIds || userIds.length === 0) return
    const rows = userIds.map(id => ({ task_group_id: groupId, user_id: id }))
    const { error } = await supabase
      .from('task_group_members')
      .insert(rows)
    if (error && (error as any).code !== '23505') throw error
  },

  async removeMember(groupId: string, userId: string) {
    const { error } = await supabase
      .from('task_group_members')
      .delete()
      .eq('task_group_id', groupId)
      .eq('user_id', userId)
    if (error) throw error
  },

  isOwner(group: { owner_id: string }, userId?: string | null) {
    return !!userId && group?.owner_id === userId
  },

  async joinByCode(code: string, userId: string) {
    const { data: group, error } = await supabase
      .from('task_groups')
      .select('*')
      .eq('party_code', code)
      .single()
    if (error) throw new Error('Invalid party code')

    const { error: memberError } = await supabase
      .from('task_group_members')
      .insert({ task_group_id: group.id, user_id: userId })

    if (memberError && (memberError as any).code !== '23505') { // ignore duplicate membership
      throw memberError
    }

    return group
  },

  async getUserGroupForTask(taskId: string, userId: string) {
    const { data, error } = await supabase
      .from('task_group_members')
      .select('task_group_id, group:task_groups!inner(id, name, task_id, owner_id, party_code, created_at)')
      .eq('group.task_id', taskId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return (data as any)?.group || null
  },

  async listMembers(groupId: string) {
    const { data, error } = await supabase
      .from('task_group_members')
      .select('user_id, role, joined_at, user:users(id, name, email)')
      .eq('task_group_id', groupId)
    if (error) throw error
    return data
  },

  async renameGroup(groupId: string, newName: string) {
    const { error } = await supabase
      .from('task_groups')
      .update({ name: newName })
      .eq('id', groupId)
    if (error) throw error
  },

  async deleteGroup(groupId: string) {
    // Try to delete members first, then the group
    const { error: memErr } = await supabase
      .from('task_group_members')
      .delete()
      .eq('task_group_id', groupId)
    if (memErr && (memErr as any).code !== 'PGRST116') throw memErr

    const { error } = await supabase
      .from('task_groups')
      .delete()
      .eq('id', groupId)
    if (error) throw error
  },
}
