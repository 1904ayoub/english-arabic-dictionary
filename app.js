// ================== Dictionary Application ==================
let dictionaryData = {}; // offline db

// Try to load JSON file at startup
async function loadDictionary() {
  try {
    const res = await fetch("pdf_dictionary.example.json"); // <-- replace with your JSON filename
    if (res.ok) {
      dictionaryData = await res.json();
      console.log("✅ Loaded dictionary.json with", Object.keys(dictionaryData).length, "entries");
    } else {
      throw new Error("dictionary.json not found, fallback to JS file");
    }
  } catch (err) {
    console.warn("⚠️ Using fallback dictionary-data.js:", err);
    // fallback: dictionary-data.js must define global dictionaryData
    if (typeof window.dictionaryData !== "undefined") {
      dictionaryData = window.dictionaryData;
      console.log("✅ Loaded dictionary-data.js with", Object.keys(dictionaryData).length, "entries");
    } else {
      dictionaryData = {};
    }
  }
}

// Detect Arabic
function isArabicText(text) {
  return /[\u0600-\u06FF]/.test(text);
}

// Local search
function searchDictionary(query) {
  if (!query || !query.trim()) return [];
  const norm = query.trim();
  const isAr = isArabicText(norm);
  const lower = norm.toLowerCase();
  const results = [];

  for (const [key, entry] of Object.entries(dictionaryData)) {
    let found = false;

    // match word
    if (isAr ? key.includes(norm) : key.toLowerCase().includes(lower)) {
      results.push(entry);
      found = true;
    }

    if (found) continue;

    // match meanings
    for (const t of entry.translations) {
      if (t.meanings.some(m => (isAr ? m.includes(norm) : m.toLowerCase().includes(lower)))) {
        results.push(entry);
        found = true;
        break;
      }
    }

    if (found) continue;

    // match synonyms
    if (entry.synonyms?.some(s => (isAr ? s.includes(norm) : s.toLowerCase().includes(lower)))) {
      results.push(entry);
    }
  }

  // dedup
  const seen = new Set();
  return results.filter(e => {
    const key = `${e.word}-${e.language}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ================== Main Class ==================
class Dictionary {
  constructor() {
    this.searchInput = document.getElementById("searchInput");
    this.searchBtn = document.getElementById("searchBtn");
    this.resultsContainer = document.getElementById("resultsContainer");
    this.loadingIndicator = document.getElementById("loadingIndicator");
    this.welcomeMessage = document.getElementById("welcomeMessage");

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

    const localResults = searchDictionary(query);
    this.displayResults(localResults, query);
  }

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
        ${r.synonyms?.length ? `<p><b>Synonyms:</b> ${r.synonyms.join(", ")}</p>` : ""}
      </div>
    `).join("");
  }
}

// ================== Init ==================
document.addEventListener("DOMContentLoaded", async () => {
  await loadDictionary();
  new Dictionary();
});
