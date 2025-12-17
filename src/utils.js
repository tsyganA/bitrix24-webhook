const fs = require('node:fs/promises');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv) {
  const out = { _: [] };
  for (const arg of argv) {
    if (!arg.startsWith('--')) {
      out._.push(arg);
      continue;
    }

    const eq = arg.indexOf('=');
    if (eq === -1) {
      out[arg.slice(2)] = true;
      continue;
    }

    const key = arg.slice(2, eq);
    const value = arg.slice(eq + 1);
    out[key] = value;
  }
  return out;
}

async function readWebhookFromFile(path) {
  try {
    const s = await fs.readFile(path, 'utf8');
    const line = s.split(/\r?\n/).map((x) => x.trim()).find(Boolean);
    return line || null;
  } catch {
    return null;
  }
}

module.exports = {
  sleep,
  parseArgs,
  readWebhookFromFile,
};
