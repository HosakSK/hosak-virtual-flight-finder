const fs = require('fs');

const now = new Date();
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const day = now.getUTCDate();
const month = months[now.getUTCMonth()];
const year = now.getUTCFullYear();
const hours = String(now.getUTCHours()).padStart(2, '0');
const mins = String(now.getUTCMinutes()).padStart(2, '0');
const formatted = `${month} ${day}, ${year}, ${hours}:${mins} UTC`;

const meta = {
  last_updated_iso: now.toISOString(),
  last_updated_formatted: formatted
};

fs.writeFileSync('metadata.json', JSON.stringify(meta, null, 2) + '\n', 'utf8');
console.log('Updated metadata.json:', formatted);
