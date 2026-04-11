import { supabase } from '../lib/supabaseClient'

/**
 * Persist a row to public.system_logs (RLS: UFP inserts own university; U&B_ADMIN reads all).
 */
export async function recordSystemLog({ universityId, universityName, actionType, details }) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.user?.id || !universityId) return

    let uniName = universityName
    if (!uniName) {
      const { data: uni } = await supabase.from('universities').select('name').eq('id', universityId).maybeSingle()
      uniName = uni?.name || 'Unknown university'
    }

    const { error } = await supabase.from('system_logs').insert({
      university_id: universityId,
      university_name: uniName,
      action_type: actionType,
      details,
      actor_id: session.user.id,
    })
    if (error) console.warn('recordSystemLog:', error.message)
  } catch (e) {
    console.warn('recordSystemLog failed', e)
  }
}
