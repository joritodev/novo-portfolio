import { supabase } from '@/lib/supabase'

export const fetchProjects = async () => {
  const { data } = await supabase
    .from('projects')
    .select('*')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  return data || []
}

export const fetchCertificates = async () => {
  const { data } = await supabase
    .from('certificates')
    .select('*')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  return data || []
}

export const fetchTechStacks = async () => {
  const { data } = await supabase
    .from('tech_stack')
    .select('*')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  return data || []
}