// ================= Dictionary Application =================
let dictionaryData = {}; // will be loaded from JSON

// Load dictionary.json dynamically at startup
async function loadDictionary() {
  try {
    // Prefer your custom JSON file
    const res = await fetch("pdf_dictionary.example.json");
    if (!res.ok) throw new Error("Failed to load pdf_dictionary.example.json");
    dictionaryData = await res.json();
    console.log("✅ Offline dictionary loaded:", Object.keys(dictionaryData).length, "entries");
  } catch (err) {
    console.error("❌ Error loading pdf_dictionary.example.json:", err);
    dictionaryData = {}; // empty fallback
  }
}

// Helper: detect Arabic text
function isArabicText(text) {
  return /[\u0600-\u06FF]/.test(text);
}

// Helper: search local JSON dictionary
function searchDictionary(query) {
  if (!query || !query.trim()) return [];
  const results = [];
  const norm = query.trim();
  const isAr = isArabicText(norm);
  const lower = norm.toLowerCase();

  for (const entry of Object.values(dictionaryData)) {
    let found = false;

    // Match word itself
    if (isAr ? entry.word.includes(norm) : entry.word.toLowerCase().includes(lower)) {
      results.push(entry);
      continue;
    }

    // Match translations
    for (const t of entry.translations) {
      if (t.meanings.some(m => (isAr ? m.includes(norm) : m.toLowerCase().includes(lower)))) {
        results.push(entry);
        found = true;
        break;
      }
    }
    if (found) continue;

    // Match synonyms
    if (entry.synonyms.some(s => (isAr ? s.includes(norm) : s.toLowerCase().includes(lower)))) {
      results.push(entry);
    }
  }

  // Deduplicate
  const seen = new Set();
  return results.filter(e => {
    const key = `${e.word}-${e.language}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ================= Main Class =================
class Dictionary {
  constructor() {
    this.searchInput = document.getElementById("searchInput");
    this.searchBtn = document.getElementById("searchBtn");
    this.resultsContainer = document.getElementById("resultsContainer");
    this.loadingIndicator = document.getElementById("loadingIndicator");
    this.welcomeMessage = document.getElementById("welcomeMessage");

    this.currentSearchResults = [];
    this.apiCache = new Map();
    this.maxCacheSize = 1000;
    this.cacheExpiry = 60 * 60 * 1000; // 1h

    this.init();
  }

  init() {
    this.searchBtn.addEventListener("click", () => this.handleSearch());
    this.searchInput.addEventListener("keypress", e => {
      if (e.key === "Enter") this.handleSearch();
    });
  }

  async handleSearch() {
    const query = this.searchInput.value.trim();
    if (!query) {
      this.showWelcome();
      return;
    }

    this.showLoading();

    try {
      const localResults = searchDictionary(query);
      const apiResults = await this.searchAPIs(query);
      const combined = this.combineResults(localResults, apiResults);

      this.currentSearchResults = combined;
      this.displayResults(combined, query);
    } catch (err) {
      console.error("⚠️ API error, using offline JSON:", err);
      const localResults = searchDictionary(query);
      this.displayResults(localResults, query);
    }
  }

  // ================= API Search =================
  async searchAPIs(query) {
    const results = [];
    const isAr = isArabicText(query);

    if (!isAr) {
      // English → English def + Arabic translation
      const [engDef, arTrans] = await Promise.allSettled([
        this.fetchEnglishDefinition(query),
        this.fetchArabicTranslation(query)
      ]);

      if (engDef.status === "fulfilled" && engDef.value) {
        const entry = engDef.value;
        if (arTrans.status === "fulfilled" && arTrans.value) {
          entry.translations.push({ type: "Arabic translation", meanings: [arTrans.value] });
        }
        results.push(entry);
      }
    } else {
      // Arabic → English
      const enTrans = await this.fetchEnglishTranslation(query);
      if (enTrans) {
        results.push({
          word: query,
          language: "Arabic",
          translations: [{ type: "English translation", meanings: [enTrans] }],
          pronunciation: this.arabicToTransliteration(query),
          synonyms: [],
          audio: `api_ar_${Date.now()}`
        });

        const engDef = await this.fetchEnglishDefinition(enTrans);
        if (engDef) results.push(engDef);
      }
    }
    return results;
  }

  // ================= English Definitions =================
  async fetchEnglishDefinition(word) {
    const cached = this.getFromCache(word);
    if (cached) return cached;

    const apis = [
      () => this.fetchFromFreeDictionary(word),
      () => this.fetchFromWordnik(word),
      () => this.fetchFromGlosbe(word, "en", "ar")
    ];

    for (const api of apis) {
      try {
        const result = await api();
        if (result) {
          this.addToCache(word, result);
          return result;
        }
      } catch { continue; }
    }
    return null;
  }

  async fetchFromFreeDictionary(word) {
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data[0]) return null;

      const entry = data[0];
      return {
        word: entry.word,
        language: "English",
        translations: entry.meanings.map(m => ({
          type: m.partOfSpeech,
          meanings: m.definitions.slice(0, 3).map(d => d.definition)
        })),
        pronunciation: entry.phonetics?.find(p => p.text)?.text || "",
        synonyms: [...new Set(entry.meanings.flatMap(m => m.definitions.flatMap(d => d.synonyms || [])))],
        audio: `free_${word}_${Date.now()}`,
        source: "FreeDictionary"
      };
    } catch { return null; }
  }

  async fetchFromWordnik(word) {
    try {
      const res = await fetch(`https://api.wordnik.com/v4/word.json/${encodeURIComponent(word)}/definitions?limit=4&includeRelated=false&useCanonical=false&api_key=demo`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.length) return null;

      return {
        word,
        language: "English",
        translations: data.map(d => ({ type: d.partOfSpeech || "definition", meanings: [d.text] })),
        pronunciation: "",
        synonyms: [],
        audio: `wordnik_${word}_${Date.now()}`,
        source: "Wordnik"
      };
    } catch { return null; }
  }

  async fetchFromGlosbe(word, from = "en", to = "ar") {
    try {
      const res = await fetch(`https://glosbe.com/gapi/translate?from=${from}&dest=${to}&format=json&phrase=${encodeURIComponent(word)}&pretty=true`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.tuc?.length) return null;

      return {
        word,
        language: from === "en" ? "English" : "Arabic",
        translations: [{
          type: to === "ar" ? "Arabic translation" : "English translation",
          meanings: data.tuc.slice(0, 5).map(t => t.phrase?.text).filter(Boolean)
        }],
        pronunciation: "",
        synonyms: [],
        audio: `glosbe_${word}_${Date.now()}`,
        source: "Glosbe"
      };
    } catch { return null; }
  }

  // ================= Translations =================
  async fetchArabicTranslation(text) {
    return this.fetchViaLibre(text, "en", "ar");
  }
  async fetchEnglishTranslation(text) {
    return this.fetchViaLibre(text, "ar", "en");
  }
  async fetchViaLibre(text, source, target) {
    try {
      const res = await fetch("https://libretranslate.com/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source, target, format: "text" })
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.translatedText;
    } catch { return null; }
  }

  // ================= Cache =================
  getFromCache(word) {
    const c = this.apiCache.get(word.toLowerCase());
    if (!c) return null;
    if (Date.now() - c.timestamp > this.cacheExpiry) {
      this.apiCache.delete(word.toLowerCase());
      return null;
    }
    return c.data;
  }
  addToCache(word, data) {
    if (this.apiCache.size >= this.maxCacheSize) this.cleanupCache();
    this.apiCache.set(word.toLowerCase(), { data, timestamp: Date.now() });
  }
  cleanupCache() {
    const oldest = [...this.apiCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < oldest.length * 0.2; i++) this.apiCache.delete(oldest[i][0]);
  }

  // ================= UI =================
  showLoading() {
    this.resultsContainer.innerHTML = "";
    this.loadingIndicator.style.display = "block";
  }
  showWelcome() {
    this.loadingIndicator.style.display = "none";
    this.resultsContainer.innerHTML = this.welcomeMessage.outerHTML;
  }
  displayResults(results, query) {
    this.loadingIndicator.style.display = "none";
    if (!results.length) {
      this.resultsContainer.innerHTML = `<p>No results for "${query}"</p>`;
      return;
    }
    this.resultsContainer.innerHTML = results.map(r => `
      <div class="result">
        <h3>${r.word} <small>(${r.language})</small></h3>
        <p><em>${r.pronunciation || ""}</em></p>
        ${r.translations.map(t => `<b>${t.type}:</b> ${t.meanings.join(", ")}`).join("<br>")}
        ${r.synonyms.length ? `<p><b>Synonyms:</b> ${r.synonyms.join(", ")}</p>` : ""}
      </div>
    `).join("");
  }

  combineResults(local, api) {
    const combined = [...local];
    const seen = new Set(local.map(r => `${r.word}-${r.language}`));
    for (const r of api) {
      const key = `${r.word}-${r.language}`;
      if (!seen.has(key)) {
        combined.push(r);
        seen.add(key);
      }
    }
    return combined;
  }

  arabicToTransliteration(word) {
    const map = { 'ا': 'a','ب': 'b','ت': 't','ث': 'th','ج': 'j','ح': 'h','خ': 'kh','د': 'd','ذ': 'dh','ر': 'r','ز': 'z','س': 's','ش': 'sh','ص': 's','ض': 'd','ط': 't','ظ': 'dh','ع': 'ʿ','غ': 'gh','ف': 'f','ق': 'q','ك': 'k','ل': 'l','م': 'm','ن': 'n','ه': 'h','و': 'w','ي': 'y','ة': 'ah','ى': 'a','ء': 'ʔ' };
    return word.split("").map(ch => map[ch] || ch).join("");
  }
}

// ================= Init =================
document.addEventListener("DOMContentLoaded", async () => {
  await loadDictionary();
  new Dictionary();
});
