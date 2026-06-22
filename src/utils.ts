/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const flagCache: Record<string, string> = {
  bd: '🇧🇩', in: '🇮🇳', us: '🇺🇸', ca: '🇨🇦', gb: '🇬🇧', de: '🇩🇪',
  fr: '🇫🇷', es: '🇪🇸', it: '🇮🇹', au: '🇦🇺', jp: '🇯🇵', kr: '🇰🇷',
  br: '🇧🇷', ar: '🇦🇷', mx: '🇲🇽', za: '🇿🇦', tr: '🇹🇷', cn: '🇨🇳', pk: '🇵🇰',
  uk: '🇬🇧'
};

const countryCache: Record<string, string> = {};

let regionNames: Intl.DisplayNames | null = null;
if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
  try {
    regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
  } catch (e) {
    // Silent fallback
  }
}

import { Channel } from './types';

export const getCountryFlag = (code: string) => {
  if (!code || code.length !== 2) return '🌐';
  const lower = code.toLowerCase();
  if (flagCache[lower]) return flagCache[lower];
  try {
    const codePoints = lower
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    const flag = String.fromCodePoint(...codePoints);
    flagCache[lower] = flag;
    return flag;
  } catch (e) {
    return '🌐';
  }
};

export const formatCountryName = (filename: string) => {
  try {
    if (!filename) return 'Select Country';
    const parts = filename.split('_');
    const code = parts[0].toUpperCase();
    
    if (countryCache[code]) {
      return countryCache[code];
    }

    let name = code;
    if (regionNames) {
      name = regionNames.of(code) || code;
    }
    
    countryCache[code] = name;
    return name;
  } catch (e) {
    return filename?.toUpperCase() || 'Select Country';
  }
};

export function parseM3UContent(text: string, serverSource: string = '4'): Channel[] {
  const lines = text.split('\n');
  const list: Channel[] = [];
  let currentItem: any = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    if (line.startsWith('#EXTINF:')) {
      // Parse name (usually after stage or comma)
      const commaIndex = line.lastIndexOf(',');
      if (commaIndex !== -1) {
        currentItem.name = line.substring(commaIndex + 1).trim();
      } else {
        currentItem.name = 'Unknown Channel';
      }
      
      // Parse logo: tvg-logo="..."
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      if (logoMatch) {
        currentItem.logo = logoMatch[1];
      }
      
      // Parse country/group, or check tvg-country="..."
      const countryMatch = line.match(/tvg-country="([^"]+)"/) || line.match(/group-title="([^"]+)"/);
      if (countryMatch) {
        currentItem.country = countryMatch[1].toLowerCase().slice(0, 5);
      }
    } else if (line.startsWith('http') || line.startsWith('rtmp') || line.startsWith('rtsp') || line.includes('.m3u8')) {
      const channelUrl = line;
      if (!currentItem.name) {
        // extract name from url
        try {
          const parts = channelUrl.split('/');
          const filename = parts[parts.length - 1] || 'Custom Stream';
          currentItem.name = filename.replace(/\.[^/.]+$/, "") || 'Custom Stream';
        } catch {
          currentItem.name = 'Custom Stream';
        }
      }
      
      list.push({
        name: currentItem.name || 'Custom Stream',
        url: channelUrl,
        logo: currentItem.logo || '',
        source: serverSource,
        country: currentItem.country || 'custom'
      });
      currentItem = {};
    }
  }
  return list;
}
