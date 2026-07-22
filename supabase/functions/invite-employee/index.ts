// supabase/functions/invite-employee/index.ts
import { serve } from 'https://deno.land/x/sift/mod.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: { persistSession: false },
    db: { schema: 'public' },
  },
)

interface InvitePayload {
  email: string
  password: string
  role_id: string
  branch_id?: string
  first_name?: string
  last_name?: string
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const body = (await req.json()) as InvitePayload

  // 1️⃣ Create auth user (service role bypasses RLS)
  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
  })

  if (authErr) {
    return new Response(JSON.stringify({ error: authErr.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 2️⃣ Insert profile row
  const profile = {
    auth_user_id: authUser.id,
    email: body.email,
    first_name: body.first_name ?? '',
    last_name: body.last_name ?? '',
    full_name: `${body.first_name ?? ''} ${body.last_name ?? ''}`.trim(),
    role_id: body.role_id,
    branch_id: body.branch_id ?? null,
    approval_status: 'pending',
    is_active: true,
  }

  const { error: insertErr } = await supabase.from('users').insert(profile)

  if (insertErr) {
    // rollback auth user to avoid orphan
    await supabase.auth.admin.deleteUser(authUser.id)
    return new Response(JSON.stringify({ error: insertErr.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true, userId: authUser.id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
