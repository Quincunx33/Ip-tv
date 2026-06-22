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
