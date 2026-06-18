/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const getCountryFlag = (code: string) => {
  if (!code || code.length !== 2) return '🌐';
  const flags: Record<string, string> = {
    bd: '🇧🇩', in: '🇮🇳', us: '🇺🇸', ca: '🇨🇦', gb: '🇬🇧', de: '🇩🇪',
    fr: '🇫🇷', es: '🇪🇸', it: '🇮🇹', au: '🇦🇺', jp: '🇯🇵', kr: '🇰🇷',
    br: '🇧🇷', ar: '🇦🇷', mx: '🇲🇽', za: '🇿🇦', tr: '🇹🇷', cn: '🇨এন', pk: '🇵🇰',
    uk: '🇬🇧'
  };
  const lower = code.toLowerCase();
  if (flags[lower]) return flags[lower];
  try {
    const codePoints = lower
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch (e) {
    return '🌐';
  }
};

export const formatCountryName = (filename: string) => {
  try {
    if (!filename) return 'Select Country';
    const parts = filename.split('_');
    const code = parts[0].toUpperCase();
    let name = code;
    if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
      const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
      name = regionNames.of(code) || code;
    }
    return name;
  } catch (e) {
    return filename?.toUpperCase() || 'Select Country';
  }
};
