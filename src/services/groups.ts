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
}

