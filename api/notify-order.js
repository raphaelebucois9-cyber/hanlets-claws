import { createClient } from '@supabase/supabase-js'

const ORDER_PHOTOS_BUCKET = 'order-photos'

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function measurementLabel(key) {
  return {
    leftThumb: 'Pouce main gauche',
    leftHand: 'Main gauche entière',
    rightThumb: 'Pouce main droite',
    rightHand: 'Main droite entière'
  }[key] || key
}

function collectPhotoEntries(order) {
  const photos = []

  for (const [key, path] of Object.entries(order.measurements || {})) {
    if (typeof path === 'string' && !path.startsWith('data:')) {
      photos.push({ path, name: `${measurementLabel(key)}.jpg` })
    }
  }

  for (let index = 0; index < (order.inspirations || []).length; index += 1) {
    const path = order.inspirations[index]

    if (typeof path === 'string' && !path.startsWith('data:')) {
      photos.push({
        path,
        name: `Inspiration ${String(index + 1).padStart(2, '0')}.jpg`
      })
    }
  }

  return photos
}

async function buildAttachments(supabase, order) {
  const attachments = []

  for (const photo of collectPhotoEntries(order)) {
    const { data, error } = await supabase.storage
      .from(ORDER_PHOTOS_BUCKET)
      .download(photo.path)

    if (error) {
      console.error('Attachment download failed:', photo.path, error)
      continue
    }

    attachments.push({
      content: Buffer.from(await data.arrayBuffer()).toString('base64'),
      name: photo.name
    })
  }

  return attachments
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const orderId = req.body?.orderId

  if (!orderId) {
    return res.status(400).json({ error: 'orderId is required' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const brevoApiKey = process.env.BREVO_API_KEY
  const recipient = process.env.ORDER_NOTIFICATION_EMAIL || 'axellehanlet@free.fr'
  const sender = process.env.ORDER_FROM_EMAIL || 'axellehanlet@free.fr'
  const siteUrl = process.env.SITE_URL || 'https://annettebakeur.vercel.app'

  if (!supabaseUrl || !serviceRoleKey || !brevoApiKey) {
    return res.status(500).json({ error: 'Missing server environment variables' })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })

  const { data: row, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (orderError || !row) {
    console.error('Order lookup failed:', orderError)
    return res.status(404).json({ error: 'Order not found' })
  }

  const order = row.data || {}
  const attachments = await buildAttachments(supabase, order)

  const typeLabel =
    order.type === 'design'
      ? `Design existant – ${order.designName || ''}`
      : 'Commande personnalisée'

  const customDetails =
    order.type === 'custom'
      ? `
        <tr><td style="padding:6px 0;color:#777">Couleurs</td><td>${escapeHtml(order.colors || '-')}</td></tr>
        <tr><td style="padding:6px 0;color:#777">Chrome</td><td>${escapeHtml(order.chrome || '-')}</td></tr>
        <tr><td style="padding:6px 0;color:#777">Bijoux</td><td>${escapeHtml(order.jewelry || '-')}</td></tr>
        <tr><td style="padding:6px 0;color:#777">Relief</td><td>${escapeHtml(order.relief || '-')}</td></tr>
        <tr><td style="padding:6px 0;color:#777">Description</td><td>${escapeHtml(order.desc || '-')}</td></tr>
      `
      : `
        <tr><td style="padding:6px 0;color:#777">Design</td><td>${escapeHtml(order.designName || '-')}</td></tr>
        <tr><td style="padding:6px 0;color:#777">Prix</td><td>${escapeHtml(order.designPrice ?? '-')} €</td></tr>
      `

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#171717">
      <h1 style="margin-bottom:4px">Nouvelle commande Annettebakeur</h1>
      <p style="margin-top:0;color:#666">Commande #${escapeHtml(orderId)}</p>

      <table style="width:100%;border-collapse:collapse;margin:24px 0">
        <tr><td style="padding:6px 0;color:#777">Type</td><td>${escapeHtml(typeLabel)}</td></tr>
        <tr><td style="padding:6px 0;color:#777">Contact client</td><td>${escapeHtml(order.contact || '-')}</td></tr>
        <tr><td style="padding:6px 0;color:#777">Modèle / forme</td><td>N° ${escapeHtml(order.shape || '-')}</td></tr>
        ${customDetails}
      </table>

      <p>
        Les photos du client sont jointes directement à cet email
        (${attachments.length} pièce(s) jointe(s)).
      </p>

      <p style="margin-top:24px">
        <a href="${escapeHtml(siteUrl)}" style="display:inline-block;background:#7c3aed;color:white;text-decoration:none;padding:12px 18px;border-radius:999px">
          Ouvrir le site / espace admin
        </a>
      </p>
    </div>
  `

  const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': brevoApiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: {
        name: 'Annettebakeur',
        email: sender
      },
      to: [
        {
          email: recipient,
          name: 'Axelle'
        }
      ],
      subject: `Nouvelle commande Annettebakeur – #${orderId}`,
      htmlContent: html,
      attachment: attachments
    })
  })

  const responseBody = await brevoResponse.text()

  if (!brevoResponse.ok) {
    console.error('Brevo error:', responseBody)
    return res.status(502).json({
      error: 'Email provider rejected the message',
      details: responseBody
    })
  }

  return res.status(200).json({ ok: true })
}
