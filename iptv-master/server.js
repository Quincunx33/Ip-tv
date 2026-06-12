const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/channels', (req, res) => {
  const streamsDir = path.join(__dirname, 'streams');
  let allChannels = [];

  try {
    const files = fs.readdirSync(streamsDir).filter(f => f.endsWith('.m3u'));
    
    // Default to 'bd.m3u' if exist, otherwise read a few randomly to limit size for the initial load
    // But let's just group them by country.
    // For simplicity, let's just read 'bd.m3u' first (Bangladesh) and some popular ones or all.
    // Reading all might be too much for memory if there are hundreds.
    // But let's read them when requested.
    
    // Instead of all, let's return a list of countries (files)
    const countries = files.map(f => f.replace('.m3u', ''));
    res.json(countries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/channels/:country', (req, res) => {
  const country = req.params.country;
  const filePath = path.join(__dirname, 'streams', `${country}.m3u`);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const channels = [];
    
    let currentChannel = {};
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#EXTINF:')) {
            // Extract name
            // format: #EXTINF:-1 tvg-id="...",Name
            const parts = line.split(',');
            if (parts.length > 1) {
                currentChannel.name = parts[parts.length - 1].trim();
            } else {
                currentChannel.name = 'Unknown';
            }
        } else if (line.startsWith('http')) {
            if (currentChannel.name) {
                currentChannel.url = line;
                channels.push({ ...currentChannel });
                currentChannel = {};
            }
        }
    }
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
