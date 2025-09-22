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

        // Offline first
        const localResults = searchDictionary(query);

        // Online fallback
        let apiResults = [];
        try {
            apiResults = await this.searchAPIs(query);
        } catch (e) {
            console.warn("API error, using offline only:", e);
        }

        const combined = this.combineResults(localResults, apiResults);
        this.displayResults(combined, query);
    }

    async searchAPIs(query) {
        const results = [];
        const isArabic = isArabicText(query);

        if (!isArabic) {
            const [englishDef, arabicTrans] = await Promise.all([
                this.fetchEnglishDefinition(query),
                this.fetchArabicTranslation(query)
            ]);

            if (englishDef) {
                if (arabicTrans) {
                    englishDef.translations.push({
                        type: "Arabic translation",
                        meanings: [arabicTrans]
                    });
                }
                results.push(englishDef);
            }
        } else {
            const en = await this.fetchEnglishTranslation(query);
            if (en) {
                results.push({
                    word: query,
                    language: "Arabic",
                    translations: [{ type: "English translation", meanings: [en] }],
                    pronunciation: "",
                    synonyms: [],
                    audio: ""
                });
                const engDef = await this.fetchEnglishDefinition(en);
                if (engDef) results.push(engDef);
            }
        }

        return results;
    }

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

    async fetchArabicTranslation(text) {
        return this.fetchLibre(text, "en", "ar");
    }
    async fetchEnglishTranslation(text) {
        return this.fetchLibre(text, "ar", "en");
    }
    async fetchLibre(q, source, target) {
        try {
            const res = await fetch("https://libretranslate.com/translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ q, source, target, format: "text" })
            });
            if (!res.ok) return null;
            const data = await res.json();
            return data.translatedText;
        } catch {
            return null;
        }
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

    // UI
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
}

// Init
document.addEventListener("DOMContentLoaded", () => new Dictionary());
