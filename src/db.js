import { supabase } from './supabase'

// === SETTINGS (hero, gallery, designs) ===
export async function getSetting(key) {
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()

  if (error) console.error('getSetting error:', error)
  return data?.value ?? null
}

export async function setSetting(key, value) {
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() })

  if (error) console.error('setSetting error:', error)
}

// === ORDERS ===
export async function createOrder(order) {
  const { error } = await supabase.from('orders').insert([
    {
      id: order.id,
      type: order.type,
      contact: order.contact,
      status: 'new',
      data: order
    }
  ])

  if (error) {
    console.error('createOrder error:', error)
    return false
  }

  return true
}

export async function listOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('listOrders error:', error)
    return []
  }

  return (data || []).map((r) => ({
    ...r.data,
    id: r.id,
    status: r.status,
    createdAt: new Date(r.created_at).getTime()
  }))
}

export async function updateOrderStatus(id, status) {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)

  if (error) console.error('updateOrderStatus error:', error)
}

export async function deleteOrder(id) {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id)

  if (error) console.error('deleteOrder error:', error)
}

// === AUTH ===
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  return { user: data?.user, error }
}

export async function signOut() {
  await supabase.auth.signOut()
}

export function onAuthChange(cb) {
  const {
    data: { subscription }
  } = supabase.auth.onAuthStateChange((event, session) => {
    cb(event, session?.user || null)
  })

  return () => subscription.unsubscribe()
}

export async function resetPasswordForEmail(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email)

  if (error) {
    console.error('Password reset error:', error)
  }

  return error
}

export async function exchangeCodeForSession(code) {
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Exchange code error:', error)
  }

  return error
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (error) {
    console.error('Update password error:', error)
  }

  return error
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    console.error('getCurrentUser error:', error)
    return null
  }

  return data?.user || null
}
