 // ================= Dictionary Application =================
let dictionaryData = {}; // offline data

// Load local JSON dictionary (offline fallback)
async function loadDictionary() {
  try {
    const res = await fetch("pdf_dictionary.example.json");
    if (!res.ok) throw new Error("Failed to load offline JSON");
    dictionaryData = await res.json();
    console.log("✅ Offline dictionary loaded:", Object.keys(dictionaryData).length, "entries");
  } catch (err) {
    console.error("❌ Offline dictionary load error:", err);
    dictionaryData = {};
  }
}

// Detect Arabic text
function isArabicText(text) {
  return /[\u0600-\u06FF]/.test(text);
}

// Search inside offline JSON
function searchDictionary(query) {
  if (!query || !query.trim()) return [];
  const results = [];
  const norm = query.trim();
  const isAr = isArabicText(norm);
  const lower = norm.toLowerCase();

  for (const entry of Object.values(dictionaryData)) {
    let found = false;

    if (isAr ? entry.word.includes(norm) : entry.word.toLowerCase().includes(lower)) {
      results.push(entry);
      continue;
    }

    for (const t of entry.translations) {
      if (t.meanings.some(m => (isAr ? m.includes(norm) : m.toLowerCase().includes(lower)))) {
        results.push(entry);
        found = true;
        break;
      }
    }
    if (found) continue;

    if (entry.synonyms.some(s => (isAr ? s.includes(norm) : s.toLowerCase().includes(lower)))) {
      results.push(entry);
    }
  }

  const seen = new Set();
  return results.filter(e => {
    const key = `${e.word}-${e.language}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ================= Dictionary Class =================
class Dictionary {
  constructor() {
    this.searchInput = document.getElementById("searchInput");
    this.searchBtn = document.getElementById("searchBtn");
    this.resultsContainer = document.getElementById("resultsContainer");
    this.loadingIndicator = document.getElementById("loadingIndicator");
    this.welcomeMessage = document.getElementById("welcomeMessage");

    this.currentSearchResults = [];

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
      console.error("⚠️ API error, fallback to offline:", err);
      const localResults = searchDictionary(query);
      this.displayResults(localResults, query);
    }
  }

  // ================= API Logic =================
  async searchAPIs(query) {
    const results = [];
    const isAr = isArabicText(query);

    if (!isAr) {
      // English → English + Arabic
      const [engDef, arTrans] = await Promise.allSettled([
        this.fetchEnglishDefinition(query),
        this.fetchArabicTranslation(query)
      ]);

      if (engDef.status === "fulfilled" && engDef.value) {
        const entry = engDef.value;
        if (arTrans.status === "fulfilled" && arTrans.value) {
          entry.translations.push({
            type: "Arabic translation",
            meanings: [arTrans.value]
          });
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
          pronunciation: "",
          synonyms: [],
          audio: ""
        });

        const engDef = await this.fetchEnglishDefinition(enTrans);
        if (engDef) results.push(engDef);
      }
    }

    return results;
  }

  // English Definitions API
  async fetchEnglishDefinition(word) {
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
          meanings: m.definitions.slice(0, 2).map(d => d.definition)
        })),
        pronunciation: entry.phonetics?.find(p => p.text)?.text || "",
        synonyms: [...new Set(entry.meanings.flatMap(m => m.definitions.flatMap(d => d.synonyms || [])))],
        audio: ""
      };
    } catch {
      return null;
    }
  }

  // LibreTranslate
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
    } catch {
      return null;
    }
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
}

// ================= Init =================
document.addEventListener("DOMContentLoaded", async () => {
  await loadDictionary();
  new Dictionary();
});
