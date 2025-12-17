const fs = require('node:fs/promises');
const path = require('node:path');

const { callBitrix } = require('./bitrix24');
const { parseArgs, readWebhookFromFile, sleep } = require('./utils');

function toInt(x, def) {
  const n = Number.parseInt(String(x), 10);
  return Number.isFinite(n) ? n : def;
}

function printHelp() {
  console.log(`\nBitrix24 companies fetcher\n\nUsage:\n  npm run fetch -- --webhook=https://.../rest/1/xxxxxxxx/\n\nOptions:\n  --webhook=URL           Webhook base URL (preferred)\n  --limit=N               How many companies to fetch (default: 10000)\n  --pageSize=N            Page size (default: 50)\n  --select=ID,TITLE,...    Fields to select (default: ID,TITLE)\n  --pretty                Pretty-print JSON output\n  --out=FILE              Output file (default: output/companies.json)\n\nAlso supported:\n  - env: B24_WEBHOOK_URL, B24_LIMIT, B24_PAGE_SIZE\n  - file: ./webhook.txt (single line with webhook URL)\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printHelp();
    process.exit(0);
  }

  const webhookFromFile = await readWebhookFromFile(path.resolve(process.cwd(), 'webhook.txt'));
  const webhookUrl = args.webhook || process.env.B24_WEBHOOK_URL || webhookFromFile;
  if (!webhookUrl) {
    console.error('Missing webhook URL. Provide --webhook=... or set B24_WEBHOOK_URL or create webhook.txt');
    process.exit(1);
  }

  const limit = toInt(args.limit ?? process.env.B24_LIMIT, 10000);
  const pageSize = Math.min(50, Math.max(1, toInt(args.pageSize ?? process.env.B24_PAGE_SIZE, 50)));
  const select = (args.select ? String(args.select) : 'ID,TITLE')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const outFile = args.out || path.resolve(process.cwd(), 'output', 'companies.json');
  await fs.mkdir(path.dirname(outFile), { recursive: true });

  console.log(`Webhook: ${String(webhookUrl).slice(0, 60)}${String(webhookUrl).length > 60 ? '...' : ''}`);
  console.log(`Fetching up to ${limit} companies (pageSize=${pageSize})...`);

  let start = 0;
  const companies = [];

  while (companies.length < limit) {
    const payload = {
      order: { ID: 'ASC' },
      filter: {},
      select,
      start,
    };

    const data = await callBitrix(webhookUrl, 'crm.company.list', payload, {
      maxRetries: 10,
      baseDelayMs: 400,
    });

    const page = Array.isArray(data.result) ? data.result : [];
    if (page.length === 0) break;

    for (const item of page) {
      companies.push(item);
      if (companies.length >= limit) break;
    }

    // Bitrix may return "next" for pagination
    if (typeof data.next === 'number') {
      start = data.next;
    } else {
      start += page.length;
    }

    process.stdout.write(`\rFetched: ${companies.length}`);

    // small delay to be gentle with rate limits
    await sleep(120);
  }

  process.stdout.write('\n');
  console.log(`Done. Total fetched: ${companies.length}`);

  const json = args.pretty
    ? JSON.stringify(companies, null, 2)
    : JSON.stringify(companies);

  await fs.writeFile(outFile, json, 'utf8');
  console.log(`Saved to: ${outFile}`);

  // show a short preview
  console.log('Preview (first 3):');
  console.log(JSON.stringify(companies.slice(0, 3), null, 2));
}

main().catch((err) => {
  console.error('\nERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
