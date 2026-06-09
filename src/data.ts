/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LetterTheme, StaticStamp } from './types';

export const LETTER_THEMES: LetterTheme[] = [
  {
    id: 'natural_tones',
    name: 'Natural Tones',
    background: '#F4E9D8',
    paperColor: '#EAD7B7',
    primary: '#7A4E2D',
    secondary: '#A67C52',
    accent: '#8B0000',
    goldAccent: '#D4AF37',
    text: '#2E1E12',
    feel: '',
    recommendedFor: 'Elegant vintage letters, luxury parchments'
  },

  {
    id: 'royal_scroll',
    name: 'Royal Scroll',
    background: '#0F172A',
    primary: '#D4AF37',
    secondary: '#C08457',
    accent: '#991B1B',
    goldAccent: '#D4AF37',
    paperColor: '#F7E7C6',
    text: '#2B1810',
    feel: '',
    recommendedFor: 'Ancient scrolls, royal messages, ceremonial letters'
  },
  {
    id: 'romantic_rose',
    name: 'Romantic Rose',
    background: '#FFF1F2',
    primary: '#E11D48',
    secondary: '#FB7185',
    accent: '#BE123C',
    goldAccent: '#FB7185',
    paperColor: '#FFF8F5',
    text: '#4A1D28',
    feel: '',
    recommendedFor: 'Love letters, anniversaries, Valentine\'s messages'
  },

  {
    id: 'sakura_dreams',
    name: 'Sakura Dreams',
    background: '#FFF7F8',
    primary: '#E8A0BF',
    secondary: '#F4C2C2',
    accent: '#C08497',
    goldAccent: '#F4C2C2',
    paperColor: '#FFFDF8',
    text: '#513747',
    feel: '',
    recommendedFor: 'Friendship letters, thank-you notes, personal messages'
  },
  {
    id: 'dark_academia',
    name: 'Dark Academia',
    background: '#1B1A17',
    primary: '#8B6B4A',
    secondary: '#C9A66B',
    accent: '#6B4423',
    goldAccent: '#C9A66B',
    paperColor: '#E6D5B8',
    text: '#F2E6D0',
    feel: '',
    recommendedFor: 'Journal entries, poetry, thoughtful letters'
  },
  {
    id: 'celestial_letters',
    name: 'Celestial Letters',
    background: '#0F0A24',
    primary: '#7C3AED',
    secondary: '#A78BFA',
    accent: '#D4AF37',
    goldAccent: '#A78BFA',
    paperColor: '#FAF8FF',
    text: '#E5E7EB',
    feel: '',
    recommendedFor: 'Fantasy themes, magical scrolls, creative messages'
  },
  {
    id: 'forest_manuscript',
    name: 'Forest Manuscript',
    background: '#132A13',
    primary: '#4F772D',
    secondary: '#90A955',
    accent: '#ECF39E',
    goldAccent: '#90A955',
    paperColor: '#F8F3E8',
    text: '#2C3E20',
    feel: '',
    recommendedFor: 'Nature lovers, rustic letters, personal journals'
  }
];

// Generates exactly 102 distinct high-quality vintage stamp templates covering different themes
export const STAMPS_LIBRARY: StaticStamp[] = (() => {
  const categories: ('historical' | 'nature' | 'romance' | 'fantasy' | 'travel' | 'seasonal')[] = [
    'historical', 'nature', 'romance', 'fantasy', 'travel', 'seasonal'
  ];

  const countries = ['British Empire', 'République Française', 'Posta Romana', 'Deutsches Reich', 'Mughal Empire', 'Qing Post', 'US Postage', 'Nippon Post', 'Italia', 'Ottoman Post', 'Royal Mail'];
  const symbols = {
    historical: ['👑', '📜', '🏛️', '🛡️', '⚓', '🦁', '🦅', '⚔️', '⚙️', '⚜️', '🗝️', '♟️', '🎖️', '🏺', '🧭', '🗼', '🕯️'],
    nature: ['🌸', '🐦', '🌲', '🦋', '⛰️', '🦌', '🦊', '🦉', '🍁', '🍄', '🏔️', '🌊', '🦢', '🌹', '🐠', '🌴', '🐿️'],
    romance: ['❤️', '💖', '🌹', '💌', '🦢', '💍', '🕊️', '🏹', '💏', '🧸', '🧁', '🗝️', '🎻', '🔮', '🦋', '💐', '🥂'],
    fantasy: ['🐉', '✨', '🧙', '🦄', '🏰', '🦉', '🌙', '🌌', '🌠', '🐺', '🌿', '🔮', '🧿', '🔱', '🧝', '🦾', '🦅'],
    travel: ['🗼', '✈️', '⛵', '🗺️', '🚅', '🎒', '🏟️', '⛩️', '🗽', '🕌', '🏰', '🗿', '🎡', '⛰️', '🌉', '🏜️', '🏔️'],
    seasonal: ['❄️', '⛄', '🌲', '🎃', '🍂', '🍁', '🌸', '☀️', '🌻', '🎉', '🥂', '🍰', '🕯️', '🧧', '🌙', '🕌', '💐']
  };

  const prices = ['1d', '2d', '5c', '10c', '1c', '25c', '50c', '1s', '5s', '10s', '1/2d', '1½d', '3 Kreuzer', '10 Para', '5 Pfennig', '10 Pfennig', '20 Centimes', '1 Dollar', '5 Dollars'];

  const library: StaticStamp[] = [];

  // Generate 17 stamps per category to reach exactly 102 stamps
  categories.forEach(cat => {
    for (let i = 1; i <= 17; i++) {
      const symList = symbols[cat];
      const icon = symList[(i - 1) % symList.length];
      const country = countries[(i * 3 + idxOfCat(cat)) % countries.length];
      const price = prices[(i * 7) % prices.length];
      const id = `stamp_${cat}_${i}`;

      const namePrefix = cat.charAt(0).toUpperCase() + cat.slice(1);
      const name = `${namePrefix} No. ${i}`;

      let color = '#7A4E2D'; // default copper
      if (cat === 'romance') color = '#BE123C'; // crimson
      else if (cat === 'nature') color = '#2C3E20'; // forest green
      else if (cat === 'fantasy') color = '#5D3FD3'; // spiritual purple
      else if (cat === 'travel') color = '#1E3A8A'; // vintage blue
      else if (cat === 'seasonal') color = '#991B1B'; // rich red

      library.push({
        id,
        name,
        category: cat,
        icon,
        country,
        price,
        color
      });
    }
  });

  return library;
})();

function idxOfCat(cat: string): number {
  switch (cat) {
    case 'historical': return 0;
    case 'nature': return 1;
    case 'romance': return 2;
    case 'fantasy': return 3;
    case 'travel': return 4;
    case 'seasonal': return 5;
    default: return 0;
  }
}

export const FONTS_LIBRARY = [
  // Elegant
  { name: 'Great Vibes', category: 'Elegant', fontClass: '\'Great Vibes\', cursive' },
  { name: 'Allura', category: 'Elegant', fontClass: '\'Allura\', cursive' },
  { name: 'Parisienne', category: 'Elegant', fontClass: '\'Parisienne\', cursive' },
  { name: 'Alex Brush', category: 'Elegant', fontClass: '\'Alex Brush\', cursive' },
  { name: 'Sacramento', category: 'Elegant', fontClass: '\'Sacramento\', cursive' },
  { name: 'Rochester', category: 'Elegant', fontClass: '\'Rochester\', cursive' },
  { name: 'Pinyon Script', category: 'Elegant', fontClass: '\'Pinyon Script\', cursive' },
  { name: 'Monsieur La Doulaise', category: 'Elegant', fontClass: '\'Monsieur La Doulaise\', cursive' },

  // Casual
  { name: 'Caveat', category: 'Casual', fontClass: '\'Caveat\', cursive' },
  { name: 'Patrick Hand', category: 'Casual', fontClass: '\'Patrick Hand\', cursive' },
  { name: 'Kalam', category: 'Casual', fontClass: '\'Kalam\', cursive' },
  { name: 'Reenie Beanie', category: 'Casual', fontClass: '\'Reenie Beanie\', cursive' },
  { name: 'Shadows Into Light', category: 'Casual', fontClass: '\'Shadows Into Light\', cursive' },
  { name: 'Love Light', category: 'Casual', fontClass: '\'Love Light\', cursive' },
  { name: 'Ms Madi', category: 'Casual', fontClass: '\'Ms Madi\', cursive' },

  // Vintage
  { name: 'Dancing Script', category: 'Vintage', fontClass: '\'Dancing Script\', cursive' },
  { name: 'Tangerine', category: 'Vintage', fontClass: '\'Tangerine\', serif' },
  { name: 'Clicker Script', category: 'Vintage', fontClass: '\'Clicker Script\', cursive' },
  { name: 'WindSong', category: 'Vintage', fontClass: '\'WindSong\', cursive' },
  { name: 'Herr Von Muellerhoff', category: 'Vintage', fontClass: '\'Herr Von Muellerhoff\', cursive' },
  { name: 'Homemade Apple', category: 'Vintage', fontClass: '\'Homemade Apple\', cursive' }
];
