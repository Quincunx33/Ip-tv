const fs = require('fs');

const files = ['public/static-api/bd.json'];
const patterns = [/football world cup/i, /fifa world cup 26/i, /FWC 2026 Football HD 1080p/i];

files.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`Processing ${file}...`);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const filtered = data.filter(item => {
      const name = item.name || '';
      return !patterns.some(pattern => pattern.test(name));
    });
    console.log(`Removed ${data.length - filtered.length} items from ${file}`);
    fs.writeFileSync(file, JSON.stringify(filtered));
  }
});
