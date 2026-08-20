import { supabase } from './supabase'

const ORDER_PHOTOS_BUCKET = 'order-photos'

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

// === ORDER PHOTOS ===
function dataUrlToBlob(dataUrl) {
  const [header, base64] = String(dataUrl).split(',')
  const mime = header?.match(/data:(.*?);base64/)?.[1] || 'image/jpeg'
  const binary = atob(base64 || '')
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return new Blob([bytes], { type: mime })
}

function isInlineImage(value) {
  return typeof value === 'string' && value.startsWith('data:image/')
}

async function uploadInlineImage(dataUrl, path) {
  const blob = dataUrlToBlob(dataUrl)

  const { data, error } = await supabase.storage
    .from(ORDER_PHOTOS_BUCKET)
    .upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error
  return data.path
}

async function storeOrderPhotos(order) {
  const measurements = {}

  for (const [key, value] of Object.entries(order.measurements || {})) {
    if (isInlineImage(value)) {
      measurements[key] = await uploadInlineImage(
        value,
        `${order.id}/measurements/${key}.jpg`
      )
    } else if (value) {
      measurements[key] = value
    }
  }

  const inspirations = []

  for (let index = 0; index < (order.inspirations || []).length; index += 1) {
    const value = order.inspirations[index]

    if (isInlineImage(value)) {
      inspirations.push(
        await uploadInlineImage(
          value,
          `${order.id}/inspirations/inspiration-${String(index + 1).padStart(2, '0')}.jpg`
        )
      )
    } else if (value) {
      inspirations.push(value)
    }
  }

  return {
    ...order,
    measurements,
    inspirations
  }
}

function collectStoragePaths(order) {
  const paths = []

  for (const value of Object.values(order?.measurements || {})) {
    if (typeof value === 'string' && !value.startsWith('data:')) {
      paths.push(value)
    }
  }

  for (const value of order?.inspirations || []) {
    if (typeof value === 'string' && !value.startsWith('data:')) {
      paths.push(value)
    }
  }

  return paths
}

export async function getOrderPhotoUrls(path, filename = 'photo.jpg') {
  if (!path) throw new Error('Photo path is missing')

  if (String(path).startsWith('data:')) {
    return {
      previewUrl: path,
      downloadUrl: path
    }
  }

  const { data: previewData, error: previewError } = await supabase.storage
    .from(ORDER_PHOTOS_BUCKET)
    .createSignedUrl(path, 60 * 60)

  if (previewError) throw previewError

  const { data: downloadData, error: downloadError } = await supabase.storage
    .from(ORDER_PHOTOS_BUCKET)
    .createSignedUrl(path, 60 * 60, {
      download: filename
    })

  if (downloadError) throw downloadError

  return {
    previewUrl: previewData.signedUrl,
    downloadUrl: downloadData.signedUrl
  }
}

// === ORDERS ===
export async function createOrder(order) {
  try {
    const storedOrder = await storeOrderPhotos(order)

    const { error } = await supabase.from('orders').insert([
      {
        id: storedOrder.id,
        type: storedOrder.type,
        contact: storedOrder.contact,
        status: 'new',
        data: storedOrder
      }
    ])

    if (error) throw error

    return {
      ok: true,
      order: storedOrder
    }
  } catch (error) {
    console.error('createOrder error:', error)
    return {
      ok: false,
      error
    }
  }
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
  const { data: row, error: readError } = await supabase
    .from('orders')
    .select('data')
    .eq('id', id)
    .maybeSingle()

  if (readError) {
    console.error('deleteOrder read error:', readError)
  }

  const paths = collectStoragePaths(row?.data)

  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(ORDER_PHOTOS_BUCKET)
      .remove(paths)

    if (storageError) {
      console.error('deleteOrder storage error:', storageError)
    }
  }

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
