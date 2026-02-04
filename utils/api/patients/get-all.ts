import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // TODO: Add authorization check here (verify admin role from cookie)
  const { data, error } = await supabaseAdmin.from('Patient').select('*')

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
