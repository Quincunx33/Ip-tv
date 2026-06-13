const fs = require('fs');
console.log('512', fs.statSync('public/pwa-512x512.png').size);
console.log('512v', fs.readFileSync('public/pwa-512x512.png', 'utf8').substring(0, 10));
console.log('apple', fs.statSync('public/apple-touch-icon.png').size);
console.log('applev', fs.readFileSync('public/apple-touch-icon.png', 'utf8').substring(0, 10));

