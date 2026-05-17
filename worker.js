/**
 * CampShare form handler — receives form submissions and emails them via Resend.
 * Routes:
 *   POST /api/host-apply
 *   POST /api/newsletter
 *   POST /api/buyback-enquiry
 *   POST /api/booking-enquiry
 *   POST /api/general-enquiry
 */

const NOTIFY_TO = 'jontydavies7@gmail.com';

const FROM_ADDRESSES = {
  host: 'CampShare <hosts@campshare.co.nz>',
  newsletter: 'CampShare <hello@campshare.co.nz>',
  buyback: 'CampShare <buyback@campshare.co.nz>',
  booking: 'CampShare <bookings@campshare.co.nz>',
  general: 'CampShare <hello@campshare.co.nz>'
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  });
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function sendEmail(env, { from, to, subject, html, replyTo }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from, to: [to], subject, html,
      ...(replyTo ? { reply_to: replyTo } : {})
    })
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('Resend error:', err);
    throw new Error('Email send failed');
  }
  return res.json();
}

function rowsHtml(rows) {
  return rows
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `<tr><td style="padding:8px 12px;background:#f1ebe0;font-weight:600;width:160px;border-radius:4px 0 0 4px;">${escapeHtml(k)}</td><td style="padding:8px 12px;background:#faf6ee;border-radius:0 4px 4px 0;">${escapeHtml(v)}</td></tr>`)
    .join('');
}

function wrapEmail(title, bodyHtml) {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#faf6ee;padding:24px;color:#1a1a1a;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #d8cfbe;">
      <div style="border-bottom:2px solid #c2613a;padding-bottom:16px;margin-bottom:24px;">
        <div style="color:#c2613a;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;font-weight:600;">CampShare NZ</div>
        <h1 style="font-family:Georgia,serif;font-size:24px;margin:6px 0 0;color:#1f2a20;font-weight:500;">${escapeHtml(title)}</h1>
      </div>
      ${bodyHtml}
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #d8cfbe;font-size:12px;color:#8a8478;">Automated notification from campshare.co.nz</div>
    </div>
  </body></html>`;
}

// ---------- Handlers ----------

async function handleHostApply(env, data) {
  const { firstName, lastName, email, phone, location, vanType, vanDescription } = data;
  if (!email || !firstName) return jsonResponse({ error: 'Missing required fields' }, 400);

  const adminHtml = wrapEmail('New host application',
    `<p style="margin:0 0 16px;">A new host wants to list their van on CampShare.</p>
    <table style="width:100%;border-collapse:separate;border-spacing:0 4px;font-size:14px;">${rowsHtml([
      ['Name', `${firstName} ${lastName || ''}`.trim()],
      ['Email', email],
      ['Phone', phone],
      ['Location', location],
      ['Van type', vanType],
      ['Description', vanDescription]
    ])}</table>
    <p style="margin-top:24px;font-size:13px;color:#3a3a3a;">Reply to this email to respond directly to ${escapeHtml(firstName)}.</p>`);

  const userHtml = wrapEmail(`Kia ora ${escapeHtml(firstName)}`,
    `<p>Thanks for applying to list your van on CampShare. We've received your application and will be in touch within two working days.</p>
    <p>In the meantime, if you have any questions, just reply to this email.</p>
    <p style="margin-top:24px;">Ngā mihi,<br/><strong>The CampShare team</strong></p>`);

  await Promise.all([
    sendEmail(env, { from: FROM_ADDRESSES.host, to: NOTIFY_TO, subject: `Host application — ${firstName} ${lastName || ''}`.trim(), html: adminHtml, replyTo: email }),
    sendEmail(env, { from: FROM_ADDRESSES.host, to: email, subject: 'Your CampShare host application', html: userHtml })
  ]);

  return jsonResponse({ ok: true });
}

async function handleNewsletter(env, data) {
  const { email } = data;
  if (!email) return jsonResponse({ error: 'Email required' }, 400);

  const adminHtml = wrapEmail('Newsletter signup',
    `<p style="margin:0 0 16px;">Someone signed up for the CampShare newsletter.</p>
    <table style="width:100%;border-collapse:separate;border-spacing:0 4px;">${rowsHtml([['Email', email]])}</table>`);

  const userHtml = wrapEmail('Kia ora',
    `<p>Thanks for signing up to the CampShare newsletter.</p>
    <p>You'll get slow road-trip itineraries, new vans on the platform, and hot pool recommendations — once a month, no spam.</p>
    <p style="margin-top:24px;">Safe travels,<br/><strong>The CampShare team</strong></p>`);

  await Promise.all([
    sendEmail(env, { from: FROM_ADDRESSES.newsletter, to: NOTIFY_TO, subject: `Newsletter signup — ${email}`, html: adminHtml }),
    sendEmail(env, { from: FROM_ADDRESSES.newsletter, to: email, subject: 'Welcome to CampShare', html: userHtml })
  ]);

  return jsonResponse({ ok: true });
}

async function handleBuybackEnquiry(env, data) {
  const { firstName, lastName, email, phone, when, duration, budget, message } = data;
  if (!email) return jsonResponse({ error: 'Email required' }, 400);

  const fullName = `${firstName || ''} ${lastName || ''}`.trim();

  const adminHtml = wrapEmail('Buyback enquiry',
    `<p>Someone is interested in the buyback programme.</p>
    <table style="width:100%;border-collapse:separate;border-spacing:0 4px;font-size:14px;">${rowsHtml([
      ['Name', fullName],
      ['Email', email],
      ['Phone', phone],
      ['Travel timing', when],
      ['Trip length', duration],
      ['Budget', budget],
      ['Message', message]
    ])}</table>
    <p style="margin-top:24px;font-size:13px;color:#3a3a3a;">Reply to this email to respond directly.</p>`);

  const userHtml = wrapEmail(`Kia ora ${escapeHtml(firstName || '')}`,
    `<p>Thanks for your buyback enquiry. We've got the details and someone from our team will be in touch within one working day with options that fit what you're after.</p>
    <p>If you have anything to add in the meantime, just reply to this email.</p>
    <p style="margin-top:24px;">Ngā mihi,<br/><strong>The CampShare team</strong></p>`);

  await Promise.all([
    sendEmail(env, { from: FROM_ADDRESSES.buyback, to: NOTIFY_TO, subject: `Buyback enquiry — ${fullName || email}`, html: adminHtml, replyTo: email }),
    sendEmail(env, { from: FROM_ADDRESSES.buyback, to: email, subject: 'Your CampShare buyback enquiry', html: userHtml })
  ]);

  return jsonResponse({ ok: true });
}

async function handleBookingEnquiry(env, data) {
  const { vanId, vanName, firstName, email, phone, start, end, adults, children, message } = data;
  if (!email || !vanId) return jsonResponse({ error: 'Email and van required' }, 400);

  const adminHtml = wrapEmail('Booking enquiry',
    `<p>Someone wants to book <strong>${escapeHtml(vanName || vanId)}</strong>.</p>
    <table style="width:100%;border-collapse:separate;border-spacing:0 4px;">${rowsHtml([
      ['Van', vanName || vanId],
      ['Guest name', firstName],
      ['Email', email],
      ['Phone', phone],
      ['Pick-up', start],
      ['Drop-off', end],
      ['Adults', adults],
      ['Children', children],
      ['Message', message]
    ])}</table>
    <p style="margin-top:24px;font-size:13px;color:#3a3a3a;">Reply to this email to contact the guest directly.</p>`);

  const userHtml = wrapEmail(`Kia ora ${escapeHtml(firstName || '')}`,
    `<p>We've received your booking enquiry for <strong>${escapeHtml(vanName || 'this van')}</strong>.</p>
    <p>We'll be in touch within 24 hours to confirm availability and next steps. If you need to add anything, just reply to this email.</p>
    <p style="margin-top:24px;">Ngā mihi,<br/><strong>The CampShare team</strong></p>`);

  await Promise.all([
    sendEmail(env, { from: FROM_ADDRESSES.booking, to: NOTIFY_TO, subject: `Booking enquiry — ${vanName || vanId}`, html: adminHtml, replyTo: email }),
    sendEmail(env, { from: FROM_ADDRESSES.booking, to: email, subject: `Your booking enquiry — ${vanName || 'CampShare'}`, html: userHtml })
  ]);

  return jsonResponse({ ok: true });
}

async function handleGeneralEnquiry(env, data) {
  const { name, email, message } = data;
  if (!email || !message) return jsonResponse({ error: 'Email and message required' }, 400);

  const adminHtml = wrapEmail('General enquiry',
    `<table style="width:100%;border-collapse:separate;border-spacing:0 4px;">${rowsHtml([
      ['Name', name],
      ['Email', email],
      ['Message', message]
    ])}</table>`);

  await sendEmail(env, { from: FROM_ADDRESSES.general, to: NOTIFY_TO, subject: `Enquiry — ${name || email}`, html: adminHtml, replyTo: email });

  return jsonResponse({ ok: true });
}

// ---------- Router ----------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    // Serve static assets for all non-API routes
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400);
    }

    try {
      switch (url.pathname) {
        case '/api/host-apply': return await handleHostApply(env, data);
        case '/api/newsletter': return await handleNewsletter(env, data);
        case '/api/buyback-enquiry': return await handleBuybackEnquiry(env, data);
        case '/api/booking-enquiry': return await handleBookingEnquiry(env, data);
        case '/api/general-enquiry': return await handleGeneralEnquiry(env, data);
        default: return jsonResponse({ error: 'Not found' }, 404);
      }
    } catch (err) {
      console.error(err);
      return jsonResponse({ error: 'Server error' }, 500);
    }
  }
};
