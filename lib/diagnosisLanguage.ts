export type DiagnosisLanguage = 'roman_urdu' | 'english';

const romanUrduMarkers = new Set([
  'aap',
  'ap',
  'awaz',
  'awaaz',
  'bahut',
  'bohat',
  'bohot',
  'gadi',
  'gari',
  'gaadi',
  'gaari',
  'ganda',
  'gandi',
  'gaya',
  'gayi',
  'hai',
  'hain',
  'hoga',
  'hogi',
  'hua',
  'hui',
  'ka',
  'kee',
  'ke',
  'ki',
  'kar',
  'karna',
  'kharab',
  'khrab',
  'ky',
  'kya',
  'kyun',
  'lagta',
  'lagti',
  'masla',
  'mein',
  'meri',
  'mere',
  'mujhe',
  'nahin',
  'nahi',
  'nhi',
  'raha',
  'rahi',
  'rahe',
  'se',
  'thik',
  'theek',
  'wajah',
  'waja',
]);

const strongRomanUrduMarkers = new Set([
  'aap',
  'ap',
  'awaz',
  'awaaz',
  'bahut',
  'bohat',
  'bohot',
  'gadi',
  'gari',
  'gaadi',
  'gaari',
  'ganda',
  'gandi',
  'hoga',
  'hogi',
  'kharab',
  'khrab',
  'masla',
  'mujhe',
  'nahin',
  'nahi',
  'nhi',
  'wajah',
  'waja',
]);

export function detectDiagnosisLanguage(text: string): DiagnosisLanguage {
  const words = text.toLowerCase().match(/[a-z]+/g) || [];
  const markerCount = words.filter((word) => romanUrduMarkers.has(word)).length;

  if (
    markerCount >= 2 ||
    words.some((word) => strongRomanUrduMarkers.has(word)) ||
    /[\u0600-\u06ff]/.test(text)
  ) {
    return 'roman_urdu';
  }

  return 'english';
}
