const dictionaryData = {
  "hello": {
    word: "hello",
    language: "English",
    translations: [{ type: "interjection", meanings: ["مرحبا","أهلا","السلام عليكم"] }],
    pronunciation: "həˈloʊ",
    synonyms: ["hi","greetings","salutation"],
    audio: "hello"
  },
  // ... rest of offline words ...
};

function isArabicText(text) {
  return /[\u0600-\u06FF]/.test(text);
}

function searchDictionary(query) {
  if (!query || !query.trim()) return [];
  const results = [];
  const normalized = query.trim();
  const isArabic = isArabicText(normalized);
  const lower = normalized.toLowerCase();

  for (const entry of Object.values(dictionaryData)) {
    if (isArabic ? entry.word.includes(normalized) : entry.word.toLowerCase().includes(lower)) {
      results.push(entry);
      continue;
    }
    for (const t of entry.translations) {
      if (t.meanings.some(m => (isArabic ? m.includes(normalized) : m.toLowerCase().includes(lower)))) {
        results.push(entry); break;
      }
    }
    if (entry.synonyms.some(s => (isArabic ? s.includes(normalized) : s.toLowerCase().includes(lower)))) {
      results.push(entry);
    }
  }

  // Deduplicate
  const seen = new Set();
  return results.filter(e => {
    const key = `${e.word}-${e.language}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}
