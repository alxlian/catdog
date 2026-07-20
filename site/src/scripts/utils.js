/** Common breed abbreviation expansions */
const BREED_EXPANSIONS = {
  'RETR': 'Retriever',
  'SH': 'Shorthair',
  'MH': 'Medium Hair',
  'LH': 'Longhair',
  'SHEP': 'Shepherd',
  'SHEPP': 'Shepherd',
  'SHEPPARD': 'Shepherd',
  'SHEPPHER': 'Shepherd',
  'SHEPARD': 'Shepherd',
  'SHEEPDOG': 'Sheepdog',
  'SHEEPDG': 'Sheepdog',
  'GERM': 'German',
  'ENG': 'English',
  'AMER': 'American',
  'AUST': 'Australian',
  'AUSTRAL': 'Australian',
  'AUSTRALIA': 'Australian',
  'AUSTRIALIA': 'Australian',
  'ICELND': 'Icelandic',
  'POR': 'Portuguese',
  'SPAN': 'Spaniel',
  'MOUNT': 'Mountain',
  'MINI': 'Miniature',
  'STD': 'Standard',
  'COON': 'Coonhound',
  'BRIT': 'British',
  'RUSS': 'Russian',
  'SIBERAN': 'Siberian',
  'YORK': 'Yorkshire',
  'CHAS': 'Charles',
  'KING': 'King',
  'CAV': 'Cavalier',
  'TERR': 'Terrier',
  'TER': 'Terrier',
  'PTS': 'Pointer',
  'DACH': 'Dachshund',
  'DACHS': 'Dachshund',
  'LABR': 'Labradoodle',
  'RETREI': 'Retriever',
  'RETRIE': 'Retriever',
  'RETRIV': 'Retriever',
  'RETREIVE': 'Retriever',
  'SWED': 'Swedish',
  'BELG': 'Belgian',
  'CHESA': 'Chesapeake',
  'SHETLD': 'Shetland',
  'PYREN': 'Pyrenean',
  'OLDENG': 'Old English',
  'ANATOL': 'Anatolian',
  'MAREMMA': 'Maremma',
  'PICARDY': 'Picardy',
  'WH': 'Wirehaired',
  'RHODESIAN RIDGBK': 'Rhodesian Ridgeback',
  'CROSS BREED': 'Mixed Breed',
};

/**
 * Convert ALL CAPS breed/name strings to proper readable labels.
 * Expands common abbreviations found in Toronto pet license data.
 */
export function toTitleCase(str) {
  if (!str) return '';

  // Check for full-string matches first
  const upper = str.toUpperCase().trim();
  if (BREED_EXPANSIONS[upper]) return BREED_EXPANSIONS[upper];

  // Expand word-by-word
  const words = upper.split(/\s+/);
  const expanded = words.map(word => {
    if (BREED_EXPANSIONS[word]) return BREED_EXPANSIONS[word];
    // Title-case the word
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return expanded.join(' ');
}
