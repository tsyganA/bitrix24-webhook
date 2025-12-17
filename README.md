## Bitrix24 webhook — fetch 10,000 companies

This repository contains a Node.js script that uses a Bitrix24 **incoming webhook** to fetch up to **10,000** companies via REST API (`crm.company.list`).

### Requirements

- Node.js **18+**

### Setup

Provide your webhook URL in **one** of the following ways:

- **CLI argument (recommended)**:

```bash
npm run fetch -- --webhook=https://your-domain.bitrix24.ru/rest/1/xxxxxxxxxxxxxxxx/
```

- **Environment variable**:

```bash
$env:B24_WEBHOOK_URL="https://your-domain.bitrix24.ru/rest/1/xxxxxxxxxxxxxxxx/"
npm run fetch
```

- **File** `webhook.txt` (single line with the webhook URL). You can copy `webhook.example.txt` to `webhook.txt` and replace the URL.

### Usage

Fetch up to 10,000 companies and save to `output/companies.json`:

```bash
npm run fetch -- --webhook=https://your-domain.bitrix24.ru/rest/1/xxxxxxxxxxxxxxxx/
```

Options:

- `--limit=10000` — how many companies to fetch
- `--pageSize=50` — page size (Bitrix list methods usually return up to 50)
- `--select=ID,TITLE` — fields to select (default: `ID,TITLE`)
- `--pretty` — pretty-print JSON
- `--out=output/companies.json` — output file path

Show help:

```bash
npm run fetch -- --help
```

### Output

- JSON file: `output/companies.json`
- Console preview: first 3 companies
