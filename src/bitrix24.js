const { sleep } = require('./utils');

function normalizeWebhookUrl(webhookUrl) {
  if (!webhookUrl || typeof webhookUrl !== 'string') return null;
  let s = webhookUrl.trim();
  if (!s) return null;
  if (!s.endsWith('/')) s += '/';
  return s;
}

function buildMethodUrl(webhookUrl, method) {
  const base = normalizeWebhookUrl(webhookUrl);
  if (!base) throw new Error('Webhook URL is missing');
  const cleanMethod = method.replace(/^\/+/, '').replace(/\.json$/i, '');
  return `${base}${cleanMethod}.json`;
}

async function callBitrix(webhookUrl, method, params, opts = {}) {
  const url = buildMethodUrl(webhookUrl, method);
  const maxRetries = Number.isFinite(opts.maxRetries) ? opts.maxRetries : 8;
  const baseDelayMs = Number.isFinite(opts.baseDelayMs) ? opts.baseDelayMs : 350;

  let attempt = 0;
  // Bitrix expects form-encoded for many methods; JSON works sometimes but form is safest.
  const body = new URLSearchParams();
  if (params && typeof params === 'object') {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) continue;
      body.set(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  }

  while (true) {
    attempt += 1;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body,
    });

    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Non-JSON response from Bitrix24 (${res.status}): ${text.slice(0, 500)}`);
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${JSON.stringify(json)}`);
    }

    if (json && json.error) {
      const code = String(json.error);
      const desc = json.error_description ? String(json.error_description) : '';

      const retryable = code === 'QUERY_LIMIT_EXCEEDED' || code === 'ERROR_BATCH_METHOD_NOT_ALLOWED';
      if (retryable && attempt <= maxRetries) {
        const delay = Math.min(8000, baseDelayMs * Math.pow(2, attempt - 1));
        await sleep(delay);
        continue;
      }

      throw new Error(`Bitrix error ${code}: ${desc}`);
    }

    return json;
  }
}

module.exports = {
  normalizeWebhookUrl,
  buildMethodUrl,
  callBitrix,
};
