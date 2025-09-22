// Dictionary Application JavaScript
class Dictionary {
    constructor() {
        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.resultsContainer = document.getElementById('resultsContainer');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.welcomeMessage = document.getElementById('welcomeMessage');
        this.suppressHistory = false; // Flag to suppress history updates
        this.currentSearchResults = []; // Store current search results
        
        // Add intelligent caching system for millions of words
        this.apiCache = new Map();
        this.maxCacheSize = 1000; // Cache up to 1000 word results  
        this.cacheExpiry = 60 * 60 * 1000; // 1 hour expiry
        
        this.init();
    }
    
    init() {
        // Event listeners
        this.searchInput.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });
        this.searchBtn.addEventListener('click', this.handleSearch.bind(this));
        
        // Focus on search input
        this.searchInput.focus();
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    async handleSearch(options = {}) {
        const query = this.searchInput.value.trim();
        
        if (!query) {
            this.showWelcome();
            return;
        }
        
        this.showLoading();
        
        try {
            // First try local dictionary
            const localResults = searchDictionary(query);
            
            // Then try to get more comprehensive results from APIs
            const apiResults = await this.searchAPIs(query);
            
            // Combine and deduplicate results
            const combinedResults = this.combineResults(localResults, apiResults);
            this.currentSearchResults = combinedResults;
            
            this.displayResults(combinedResults, query);
            
            // Update URL for search history (skip if suppressed)
            if (!options.suppressHistory && !this.suppressHistory) {
                this.updateURL(query);
            }
        } catch (error) {
            console.warn('API search failed, using local results:', error);
            // Fallback to local results if API fails
            const localResults = searchDictionary(query);
            this.currentSearchResults = localResults;
            this.displayResults(localResults, query);
            
            if (!options.suppressHistory && !this.suppressHistory) {
                this.updateURL(query);
            }
        }
    }
    
    async searchAPIs(query) {
        const results = [];
        const isQueryArabic = this.isArabicText(query);
        const cleanQuery = query.trim();
        
        console.log('API Search for:', cleanQuery, 'Is Arabic:', isQueryArabic);
        
        try {
            if (!isQueryArabic) {
                // English query - get English definition and Arabic translation
                console.log('Processing English query:', cleanQuery);
                
                const [englishDef, arabicTranslation] = await Promise.allSettled([
                    this.fetchEnglishDefinition(cleanQuery),
                    this.fetchArabicTranslation(cleanQuery)
                ]);
                
                console.log('English def result:', englishDef);
                console.log('Arabic translation result:', arabicTranslation);
                
                if (englishDef.status === 'fulfilled' && englishDef.value) {
                    const entry = englishDef.value;
                    if (arabicTranslation.status === 'fulfilled' && arabicTranslation.value) {
                        // Add Arabic translations to the English entry
                        entry.translations.push({
                            type: "Arabic translation",
                            meanings: [arabicTranslation.value]
                        });
                    }
                    results.push(entry);
                } else if (arabicTranslation.status === 'fulfilled' && arabicTranslation.value) {
                    // English definition failed but Arabic translation succeeded
                    // Create a basic English entry with Arabic translation
                    const basicEntry = {
                        word: cleanQuery,
                        language: "English",
                        translations: [{
                            type: "Arabic translation",
                            meanings: [arabicTranslation.value]
                        }],
                        pronunciation: "",
                        synonyms: [],
                        audio: `api_en_${Date.now()}`
                    };
                    results.push(basicEntry);
                }
            } else {
                // Arabic query - translate to English
                console.log('Processing Arabic query:', cleanQuery);
                
                // Try Glosbe first, fallback to LibreTranslate
                let englishTranslation = null;
                const glosbeResult = await this.fetchFromGlosbe(cleanQuery, 'ar', 'en');
                if (glosbeResult && glosbeResult.translations && glosbeResult.translations.length > 0) {
                    englishTranslation = glosbeResult.translations[0].meanings[0];
                    console.log('Got Arabic->English from Glosbe:', englishTranslation);
                } else {
                    englishTranslation = await this.fetchEnglishTranslation(cleanQuery);
                    console.log('Fallback to LibreTranslate for Arabic->English:', englishTranslation);
                }
                console.log('English translation for Arabic:', englishTranslation);
                
                if (englishTranslation && englishTranslation.trim() !== '') {
                    // Check if this might be a suspicious result
                    const isSuspicious = this.isSuspiciousTranslation(cleanQuery, englishTranslation);
                    
                    // Create Arabic entry with English translation
                    const arabicEntry = {
                        word: cleanQuery,
                        language: "Arabic",
                        translations: [{
                            type: isSuspicious ? "Uncertain translation" : "English translation", 
                            meanings: [englishTranslation + (isSuspicious ? " (uncertain)" : "")]
                        }],
                        pronunciation: this.arabicToTransliteration(cleanQuery),
                        synonyms: [],
                        audio: `api_ar_${Date.now()}`
                    };
                    
                    results.push(arabicEntry);
                    
                    // Only try to get detailed English definition if translation seems reliable
                    if (!isSuspicious) {
                        try {
                            const englishDef = await this.fetchEnglishDefinition(englishTranslation);
                            if (englishDef) {
                                results.push(englishDef);
                            }
                        } catch (error) {
                            console.warn('Failed to get English definition:', error);
                        }
                    }
                } else {
                    console.warn('Empty or invalid translation result for:', cleanQuery);
                }
            }
        } catch (error) {
            console.error('API search error:', error);
        }
        
        console.log('API search results:', results);
        return results;
    }
    
    async fetchEnglishDefinition(word) {
        // Check cache first
        const cached = this.getFromCache(word);
        if (cached) {
            console.log(`Retrieved ${word} from cache`);
            return cached;
        }
        
        // Try multiple dictionary APIs in sequence for maximum coverage
        const apis = [
            () => this.fetchFromFreeDictionary(word),
            () => this.fetchFromWordnik(word),
            () => this.fetchFromGlosbe(word, 'en', 'ar'), // English to Arabic via Glosbe
            () => this.fetchFromMerriamWebster(word)
        ];
        
        for (const apiCall of apis) {
            try {
                const result = await apiCall();
                if (result && result.translations && result.translations.length > 0) {
                    console.log(`Successfully got definition from ${result.source || 'API'} for: ${word}`);
                    
                    // Cache the successful result
                    this.addToCache(word, result);
                    return result;
                }
            } catch (error) {
                console.warn(`API failed for ${word}:`, error);
                continue; // Try next API
            }
        }
        
        console.warn(`All dictionary APIs failed for: ${word}`);
        return null;
    }
    
    // Cache management methods
    getFromCache(word) {
        const cacheKey = word.toLowerCase();
        const cached = this.apiCache.get(cacheKey);
        
        if (!cached) return null;
        
        // Check if cache entry is expired
        if (Date.now() - cached.timestamp > this.cacheExpiry) {
            this.apiCache.delete(cacheKey);
            return null;
        }
        
        return cached.data;
    }
    
    addToCache(word, data) {
        const cacheKey = word.toLowerCase();
        
        // Clean cache if it's getting too large
        if (this.apiCache.size >= this.maxCacheSize) {
            this.cleanupCache();
        }
        
        this.apiCache.set(cacheKey, {
            data: data,
            timestamp: Date.now()
        });
    }
    
    cleanupCache() {
        // Remove oldest 20% of entries when cache is full
        const entries = Array.from(this.apiCache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        const toDelete = Math.floor(entries.length * 0.2);
        for (let i = 0; i < toDelete; i++) {
            this.apiCache.delete(entries[i][0]);
        }
        
        console.log(`Cache cleanup: removed ${toDelete} old entries`);
    }
    
    async fetchFromFreeDictionary(word) {
        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
            if (!response.ok) return null;
            
            const data = await response.json();
            if (!data || !data[0]) return null;
            
            const entry = data[0];
            const result = {
                word: entry.word,
                language: "English",
                translations: [],
                pronunciation: "",
                synonyms: [],
                audio: `free_${entry.word}_${Date.now()}`,
                source: "Free Dictionary API"
            };
            
            // Extract pronunciations
            if (entry.phonetics && entry.phonetics.length > 0) {
                const phonetic = entry.phonetics.find(p => p.text) || entry.phonetics[0];
                if (phonetic.text) {
                    result.pronunciation = phonetic.text;
                }
            }
            
            // Extract meanings
            if (entry.meanings) {
                for (const meaning of entry.meanings) {
                    const translations = {
                        type: meaning.partOfSpeech || "definition",
                        meanings: []
                    };
                    
                    if (meaning.definitions) {
                        for (const def of meaning.definitions.slice(0, 4)) { // Get more definitions
                            translations.meanings.push(def.definition);
                            
                            // Extract synonyms
                            if (def.synonyms && def.synonyms.length > 0) {
                                result.synonyms.push(...def.synonyms.slice(0, 5));
                            }
                        }
                    }
                    
                    if (translations.meanings.length > 0) {
                        result.translations.push(translations);
                    }
                }
            }
            
            // Remove duplicate synonyms
            result.synonyms = [...new Set(result.synonyms)];
            
            return result;
        } catch (error) {
            console.warn('Free Dictionary API error:', error);
            return null;
        }
    }
    
    async fetchFromWordnik(word) {
        try {
            // Note: Using Wordnik's demo key - users should get their own from https://developer.wordnik.com
            // This demo key has limited usage and may be rate-limited
            const response = await fetch(`https://api.wordnik.com/v4/word.json/${encodeURIComponent(word)}/definitions?limit=6&includeRelated=false&useCanonical=false&includeTags=false&api_key=demo`);
            
            if (!response.ok) return null;
            
            const data = await response.json();
            if (!data || data.length === 0) return null;
            
            const result = {
                word: word,
                language: "English",
                translations: [],
                pronunciation: "",
                synonyms: [],
                audio: `wordnik_${word}_${Date.now()}`,
                source: "Wordnik API (800k+ words)"
            };
            
            // Group definitions by part of speech
            const definitionsByPart = {};
            
            for (const def of data) {
                const partOfSpeech = def.partOfSpeech || 'definition';
                if (!definitionsByPart[partOfSpeech]) {
                    definitionsByPart[partOfSpeech] = [];
                }
                if (def.text && definitionsByPart[partOfSpeech].length < 4) {
                    definitionsByPart[partOfSpeech].push(def.text);
                }
            }
            
            // Convert to translations format
            for (const [partOfSpeech, meanings] of Object.entries(definitionsByPart)) {
                if (meanings.length > 0) {
                    result.translations.push({
                        type: partOfSpeech,
                        meanings: meanings
                    });
                }
            }
            
            // Try to get pronunciation from Wordnik
            try {
                const pronResponse = await fetch(`https://api.wordnik.com/v4/word.json/${encodeURIComponent(word)}/pronunciations?useCanonical=false&limit=1&api_key=demo`);
                if (pronResponse.ok) {
                    const pronData = await pronResponse.json();
                    if (pronData && pronData[0] && pronData[0].raw) {
                        result.pronunciation = pronData[0].raw;
                    }
                }
            } catch (e) {
                console.warn('Wordnik pronunciation fetch failed:', e);
            }

            // Try to get synonyms from Wordnik
            try {
                const synonymResponse = await fetch(`https://api.wordnik.com/v4/word.json/${encodeURIComponent(word)}/relatedWords?useCanonical=false&relationshipTypes=synonym&limitPerRelationshipType=8&api_key=demo`);
                if (synonymResponse.ok) {
                    const synonymData = await synonymResponse.json();
                    if (synonymData && synonymData.length > 0) {
                        for (const relatedGroup of synonymData) {
                            if (relatedGroup.relationshipType === 'synonym' && relatedGroup.words) {
                                result.synonyms.push(...relatedGroup.words.slice(0, 6));
                                break;
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn('Wordnik synonyms fetch failed:', e);
            }

            // Remove duplicate synonyms
            result.synonyms = [...new Set(result.synonyms)];
            
            return result.translations.length > 0 ? result : null;
        } catch (error) {
            console.warn('Wordnik API error:', error);
            return null;
        }
    }
    
    async fetchFromMerriamWebster(word) {
        try {
            // Note: Merriam-Webster API requires a valid key - this is a placeholder
            // Users would need to get their own key from https://dictionaryapi.com/
            return null; // Disabled until proper API key is configured
            
            /* Merriam-Webster API integration disabled for security
             * To enable:
             * 1. Get API key from https://dictionaryapi.com/
             * 2. Store key securely on server-side
             * 3. Create proxy endpoint to avoid client-side key exposure
             * 4. Enable this code with proper server integration
             */
        } catch (error) {
            console.warn('Merriam-Webster API error:', error);
            return null;
        }
    }
    
    async fetchFromGlosbe(word, fromLang = 'en', toLang = 'ar') {
        try {
            console.log(`Fetching from Glosbe: ${word} (${fromLang} -> ${toLang})`);
            
            // Glosbe API provides comprehensive multilingual dictionary
            const response = await fetch(`https://glosbe.com/gapi/translate?from=${fromLang}&dest=${toLang}&format=json&phrase=${encodeURIComponent(word)}&pretty=true`);
            
            if (!response.ok) return null;
            
            const data = await response.json();
            if (!data || !data.tuc || data.tuc.length === 0) return null;
            
            const result = {
                word: word,
                language: fromLang === 'en' ? 'English' : 'Arabic',
                translations: [],
                pronunciation: "",
                synonyms: [],
                audio: `glosbe_${word}_${Date.now()}`,
                source: "Glosbe Multilingual Dictionary"
            };
            
            // Process translations from Glosbe
            const translations = [];
            const seenMeanings = new Set();
            
            for (const tuc of data.tuc.slice(0, 8)) { // Limit to 8 translations
                if (tuc.phrase && tuc.phrase.text && !seenMeanings.has(tuc.phrase.text)) {
                    translations.push(tuc.phrase.text);
                    seenMeanings.add(tuc.phrase.text);
                }
                
                // Also check for meanings array
                if (tuc.meanings && tuc.meanings.length > 0) {
                    for (const meaning of tuc.meanings.slice(0, 3)) {
                        if (meaning.text && !seenMeanings.has(meaning.text)) {
                            translations.push(meaning.text);
                            seenMeanings.add(meaning.text);
                        }
                    }
                }
            }
            
            if (translations.length > 0) {
                result.translations.push({
                    type: toLang === 'ar' ? 'Arabic translation' : 'English translation',
                    meanings: translations
                });
            }
            
            // Extract examples if available
            if (data.examples && data.examples.length > 0) {
                const examples = data.examples.slice(0, 3).map(ex => ex.second).filter(Boolean);
                if (examples.length > 0) {
                    result.translations.push({
                        type: 'Usage examples',
                        meanings: examples
                    });
                }
            }

            // Extract related words/synonyms from all translations as potential synonyms
            if (translations.length > 1) {
                result.synonyms = [...new Set(translations.slice(1, 8))]; // Use alternate translations as synonyms
            }
            
            return result.translations.length > 0 ? result : null;
        } catch (error) {
            console.warn('Glosbe API error:', error);
            return null;
        }
    }
    
    async fetchArabicTranslation(text) {
        try {
            console.log('Translating to Arabic:', text);
            
            const response = await fetch('https://libretranslate.com/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    q: text.trim(),
                    source: 'en',
                    target: 'ar',
                    format: 'text'
                })
            });
            
            if (!response.ok) {
                console.error('Translation API error:', response.status, response.statusText);
                return null;
            }
            
            const data = await response.json();
            console.log('Arabic translation result:', data);
            
            return data.translatedText || null;
        } catch (error) {
            console.error('LibreTranslate API error:', error);
            return null;
        }
    }
    
    async fetchEnglishTranslation(text) {
        try {
            console.log('Translating to English:', text);
            
            const response = await fetch('https://libretranslate.com/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    q: text.trim(),
                    source: 'ar',
                    target: 'en',
                    format: 'text'
                })
            });
            
            if (!response.ok) {
                console.error('Translation API error:', response.status, response.statusText);
                return null;
            }
            
            const data = await response.json();
            console.log('English translation result:', data);
            
            return data.translatedText || null;
        } catch (error) {
            console.error('LibreTranslate API error:', error);
            return null;
        }
    }
    
    isArabicText(text) {
        const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
        return arabicRegex.test(text);
    }
    
    isSuspiciousTranslation(arabicWord, englishTranslation) {
        const suspicious = [
            // Very short translations that might be wrong
            englishTranslation.length <= 2 && !this.isValidShortTranslation(arabicWord, englishTranslation),
            // Common mistranslations
            englishTranslation.toLowerCase() === 'hi' && !this.isArabicGreeting(arabicWord),
            englishTranslation.toLowerCase() === 'no' && arabicWord.length > 3,
            englishTranslation.toLowerCase() === 'a' && arabicWord.length > 2
        ];
        
        return suspicious.some(condition => condition);
    }
    
    isValidShortTranslation(arabicWord, englishTranslation) {
        // Known valid short translations
        const validShort = {
            'لا': 'no',
            'نعم': 'yes',
            'أم': 'or',
            'في': 'in',
            'من': 'from',
            'إلى': 'to',
            'على': 'on',
            'عن': 'about'
        };
        
        return validShort[arabicWord] === englishTranslation.toLowerCase();
    }
    
    isArabicGreeting(arabicWord) {
        const greetings = ['مرحبا', 'هاي', 'أهلا', 'السلام', 'حياك'];
        return greetings.some(greeting => arabicWord.includes(greeting));
    }
    
    combineResults(localResults, apiResults) {
        const combined = [...localResults];
        const seen = new Set(localResults.map(r => `${r.word}-${r.language}`));
        
        for (const result of apiResults) {
            const key = `${result.word}-${result.language}`;
            if (!seen.has(key)) {
                seen.add(key);
                combined.push(result);
            }
        }
        
        return combined;
    }
    
    showLoading() {
        this.welcomeMessage.style.display = 'none';
        this.resultsContainer.innerHTML = '';
        this.loadingIndicator.style.display = 'block';
    }
    
    showWelcome() {
        this.loadingIndicator.style.display = 'none';
        this.resultsContainer.innerHTML = '';
        this.welcomeMessage.style.display = 'block';
        this.resultsContainer.appendChild(this.welcomeMessage);
    }
    
    displayResults(results, query) {
        this.loadingIndicator.style.display = 'none';
        this.welcomeMessage.style.display = 'none';
        
        if (results.length === 0) {
            this.resultsContainer.innerHTML = `
                <div class="no-results">
                    <div class="no-results-icon">🔍</div>
                    <h3>No results found</h3>
                    <p>Try searching for a different word or check your spelling</p>
                </div>
            `;
            return;
        }
        
        const resultsHTML = results.map(entry => this.createResultCard(entry, query)).join('');
        this.resultsContainer.innerHTML = resultsHTML;
        
        // Add event listeners to interactive elements
        this.addInteractiveListeners();
    }
    
    createResultCard(entry, query) {
        const isArabic = entry.language === 'Arabic';
        const wordClass = isArabic ? 'arabic-text' : '';
        const rtlClass = isArabic ? 'rtl' : '';
        const highlightedWord = this.highlightSearchTerm(entry.word, query);
        
        // Fix API result detection - check for source property or new audio prefixes
        const isAPIResult = entry.source || (entry.audio && (
            entry.audio.includes('free_') || 
            entry.audio.includes('wordnik_') || 
            entry.audio.includes('merriam_') || 
            entry.audio.includes('glosbe_') || 
            entry.audio.includes('api_')
        ));
        
        // Get source information for display
        const sourceInfo = entry.source || (isAPIResult ? 'Live API' : 'Offline Dictionary');
        const sourceDisplay = sourceInfo.replace(/API.*$/, 'API'); // Shorten long source names
        
        const meaningsHTML = entry.translations.map(translation => `
            <div class="meaning-group">
                <span class="meaning-type">${translation.type}</span>
                <ul class="meaning-list">
                    ${translation.meanings.map(meaning => `
                        <li class="meaning-item">
                            <span class="translation ${entry.language === 'Arabic' ? '' : 'arabic-text'}">${this.highlightSearchTerm(meaning, query)}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `).join('');
        
        // Enhanced synonym display with better formatting and source indicators
        const synonymsHTML = entry.synonyms.length > 0 ? entry.synonyms.map(synonym => {
            const cleanSynonym = synonym.trim();
            return `<span class="synonym-word ${isArabic ? 'arabic-text' : ''}" data-word="${cleanSynonym}" title="Click to search: ${cleanSynonym}">${cleanSynonym}</span>`;
        }).join('') : '';
        
        return `
            <div class="word-result ${rtlClass} ${isAPIResult ? 'api-result' : ''}" ${isArabic ? 'dir="rtl" lang="ar"' : ''}>
                <div class="word-header">
                    <span class="word-text ${wordClass}">${highlightedWord}</span>
                    <span class="word-language">${entry.language}</span>
                    ${isAPIResult ? `<span class="api-indicator" title="${sourceInfo}">🌐 ${sourceDisplay}</span>` : '<span class="offline-indicator">📚 Offline</span>'}
                    <button class="pronunciation-btn" data-audio="${entry.audio}">
                        <span>🔊</span>
                        <span>${entry.pronunciation || 'Play'}</span>
                    </button>
                </div>
                
                <div class="meanings">
                    ${meaningsHTML}
                </div>
                
                ${entry.synonyms.length > 0 ? `
                <div class="synonyms-section">
                    <div class="synonyms-title">
                        Similar words (${entry.synonyms.length}):
                        ${isAPIResult ? '<span class="synonym-source-indicator" title="Synonyms from live API">🌐</span>' : ''}
                    </div>
                    <div class="synonyms-list">
                        ${synonymsHTML}
                    </div>
                </div>
                ` : ''}
                
                ${entry.source ? `<div class="source-info" title="Source: ${entry.source}">Source: ${sourceDisplay}</div>` : ''}
            </div>
        `;
    }
    
    highlightSearchTerm(text, query) {
        if (!query || query.length < 2) return text;
        
        const regex = new RegExp(`(${this.escapeRegExp(query)})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }
    
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    addInteractiveListeners() {
        // Pronunciation buttons
        const pronunciationBtns = document.querySelectorAll('.pronunciation-btn');
        pronunciationBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.playPronunciation(e.target.closest('.pronunciation-btn').dataset.audio);
            });
        });
        
        // Synonym word clicks
        const synonymWords = document.querySelectorAll('.synonym-word');
        synonymWords.forEach(word => {
            word.addEventListener('click', (e) => {
                const wordText = e.target.dataset.word;
                this.searchInput.value = wordText;
                this.handleSearch();
                this.searchInput.focus();
            });
        });
        
        // Make translation words clickable too
        const translationWords = document.querySelectorAll('.translation');
        translationWords.forEach(word => {
            word.style.cursor = 'pointer';
            word.addEventListener('click', (e) => {
                const wordText = e.target.textContent.trim();
                // Remove any highlight spans and get clean text
                const cleanText = wordText.replace(/<[^>]*>/g, '');
                if (cleanText) {
                    this.searchInput.value = cleanText;
                    this.handleSearch();
                    this.searchInput.focus();
                }
            });
        });
    }
    
    playPronunciation(audioId) {
        // Enhanced error checking and crash prevention
        if (!window.speechSynthesis) {
            console.error('Speech synthesis not available');
            alert('Speech synthesis not supported in this browser');
            return;
        }
        
        try {
            // Prevent multiple simultaneous speech attempts
            if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
                console.log('Speech already in progress, canceling previous');
                window.speechSynthesis.cancel();
                // Wait a moment before proceeding
                setTimeout(() => this.playPronunciation(audioId), 300);
                return;
            }
            
            const entry = Object.values(dictionaryData).find(e => e.audio === audioId) || 
                          this.currentSearchResults?.find(e => e.audio === audioId);
            
            if (!entry) {
                console.error('No entry found for audio ID:', audioId);
                return;
            }
            
            const btn = document.querySelector(`[data-audio="${audioId}"]`);
            
            if (entry.language === 'Arabic') {
                this.speakArabic(entry.word, btn);
            } else {
                this.speakEnglish(entry.word, btn);
            }
            
        } catch (error) {
            console.error('Pronunciation error:', error);
            const btn = document.querySelector(`[data-audio="${audioId}"]`);
            this.updateButtonState(btn, 'error');
        }
    }
    
    // Helper method to handle button state changes safely
    updateButtonState(btn, state) {
        if (!btn) return;
        
        try {
            switch (state) {
                case 'loading':
                    btn.style.background = '#38a169';
                    btn.style.transform = 'scale(0.95)';
                    btn.disabled = true;
                    break;
                case 'success':
                    btn.style.background = '#48bb78';
                    btn.style.transform = 'scale(1)';
                    btn.disabled = false;
                    break;
                case 'error':
                    btn.style.background = '#e53e3e';
                    setTimeout(() => {
                        try {
                            if (btn && btn.style) {
                                btn.style.background = '#48bb78';
                                btn.style.transform = 'scale(1)';
                                btn.disabled = false;
                            }
                        } catch (e) {
                            console.error('Error resetting button state:', e);
                        }
                    }, 1000);
                    break;
            }
        } catch (error) {
            console.error('Error updating button state:', error);
        }
    }
    
    // Separate method for Arabic speech with robust error handling
    speakArabic(word, btn) {
        try {
            console.log('Arabic word detected:', word);
            this.updateButtonState(btn, 'loading');
            
            const transliteration = this.arabicToTransliteration(word);
            console.log('Transliterating:', word, '->', transliteration);
            
            if (!transliteration || transliteration.trim() === '') {
                console.error('Failed to transliterate Arabic word:', word);
                this.updateButtonState(btn, 'error');
                return;
            }
            
            const utterance = new SpeechSynthesisUtterance(transliteration);
            utterance.lang = 'en-US';
            utterance.rate = 0.6;
            utterance.pitch = 1;
            utterance.volume = 0.9;
            
            // Add timeout as backup in case speech gets stuck
            const speechTimeout = setTimeout(() => {
                if (window.speechSynthesis.speaking) {
                    console.warn('Arabic speech timeout, canceling');
                    window.speechSynthesis.cancel();
                    this.updateButtonState(btn, 'error');
                }
            }, 10000);
            
            utterance.onend = () => {
                clearTimeout(speechTimeout);
                console.log('Arabic speech completed successfully');
                this.updateButtonState(btn, 'success');
            };
            
            utterance.onerror = (error) => {
                clearTimeout(speechTimeout);
                console.error('Arabic speech error:', error);
                this.updateButtonState(btn, 'error');
            };
            
            setTimeout(() => {
                try {
                    window.speechSynthesis.speak(utterance);
                    console.log('Speaking Arabic as:', transliteration);
                } catch (err) {
                    console.error('Error starting Arabic speech:', err);
                    clearTimeout(speechTimeout);
                    this.updateButtonState(btn, 'error');
                }
            }, 200);
            
        } catch (error) {
            console.error('Error in speakArabic:', error);
            this.updateButtonState(btn, 'error');
        }
    }
    
    // Separate method for English speech with better error handling  
    speakEnglish(word, btn) {
        const attemptSpeak = () => {
            try {
                this.updateButtonState(btn, 'loading');
                
                const utterance = new SpeechSynthesisUtterance(word);
                const voices = window.speechSynthesis.getVoices();
                const englishVoice = voices.find(voice => 
                    voice.lang.startsWith('en') && 
                    (voice.name.toLowerCase().includes('english') || 
                     voice.lang === 'en-US' || voice.lang === 'en-GB')
                );
                
                if (englishVoice) {
                    utterance.voice = englishVoice;
                    utterance.lang = englishVoice.lang;
                } else {
                    utterance.lang = 'en-US';
                }
                
                utterance.rate = 0.8;
                utterance.pitch = 1;
                utterance.volume = 0.9;
                
                // Add timeout as backup
                const speechTimeout = setTimeout(() => {
                    if (window.speechSynthesis.speaking) {
                        console.warn('English speech timeout, canceling');
                        window.speechSynthesis.cancel();
                        this.updateButtonState(btn, 'error');
                    }
                }, 8000);
                
                utterance.onend = () => {
                    clearTimeout(speechTimeout);
                    console.log('English speech completed successfully');
                    this.updateButtonState(btn, 'success');
                };
                
                utterance.onerror = (error) => {
                    clearTimeout(speechTimeout);
                    console.error('English speech error:', error);
                    this.updateButtonState(btn, 'error');
                };
                
                setTimeout(() => {
                    try {
                        window.speechSynthesis.speak(utterance);
                        console.log('Speaking English word:', word);
                    } catch (err) {
                        console.error('Error starting English speech:', err);
                        clearTimeout(speechTimeout);
                        this.updateButtonState(btn, 'error');
                    }
                }, 100);
                
            } catch (error) {
                console.error('Error in attemptSpeak:', error);
                this.updateButtonState(btn, 'error');
            }
        };
        
        try {
            if (window.speechSynthesis.getVoices().length > 0) {
                attemptSpeak();
            } else {
                // Handle case where voices aren't loaded yet
                let voicesLoaded = false;
                const handleVoicesChanged = () => {
                    if (!voicesLoaded) {
                        voicesLoaded = true;
                        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
                        attemptSpeak();
                    }
                };
                
                window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
                
                // Fallback timeout in case voiceschanged never fires
                setTimeout(() => {
                    if (!voicesLoaded) {
                        voicesLoaded = true;
                        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
                        attemptSpeak();
                    }
                }, 2000);
            }
        } catch (error) {
            console.error('Error setting up English speech:', error);
            this.updateButtonState(btn, 'error');
        }
    }
    
    arabicToTransliteration(arabicWord) {
        // Comprehensive Arabic to phonetic transliteration mapping
        const arabicToEnglish = {
            // Basic Arabic letters
            'ا': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh',
            'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's',
            'ض': 'd', 'ط': 't', 'ظ': 'dh', 'ع': 'aa', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
            'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y',
            'ة': 'ah', 'ى': 'a', 'ء': '',
            // Arabic vowels and diacritics
            'ً': 'an', 'ٌ': 'un', 'ٍ': 'in', 'َ': 'a', 'ُ': 'u', 'ِ': 'i',
            'ّ': '', 'ْ': '', 'ـ': '',
            // Common Arabic words - whole word mappings
            'مرحبا': 'mar-ha-ban',
            'كتاب': 'ki-tab', 
            'ماء': 'maa',
            'بيت': 'bayt',
            'حب': 'hub',
            'عائلة': 'aa-i-la',
            'صديق': 'sa-deeq',
            'مدرسة': 'mad-ra-sa',
            'طعام': 'ta-aam',
            'عمل': 'aa-mal',
            'وقت': 'waqt',
            'جميل': 'ja-meel',
            'سعيد': 'sa-eed',
            // More common words
            'السلام': 'as-sa-lam',
            'عليكم': 'a-lay-kum',
            'شكرا': 'shuk-ran',
            'مع السلامة': 'maa sa-la-ma',
            'كيف حالك': 'kayf ha-lak',
            'نعم': 'naam',
            'لا': 'la'
        };
        
        // Clean the input
        const cleanWord = arabicWord.trim();
        
        // First check if we have a direct mapping for the whole word
        if (arabicToEnglish[cleanWord]) {
            return arabicToEnglish[cleanWord];
        }
        
        // Handle multi-word phrases
        if (cleanWord.includes(' ')) {
            return cleanWord.split(' ').map(word => {
                return arabicToEnglish[word] || this.transliterateChars(word, arabicToEnglish);
            }).join(' ');
        }
        
        // Otherwise, transliterate character by character
        return this.transliterateChars(cleanWord, arabicToEnglish);
    }
    
    transliterateChars(word, mapping) {
        let result = '';
        const vowels = ['a', 'i', 'u', 'e', 'o'];
        
        for (let i = 0; i < word.length; i++) {
            const char = word[i];
            if (mapping[char]) {
                const transliterated = mapping[char];
                result += transliterated;
                
                // Add hyphen between consonants for better pronunciation
                if (i < word.length - 1 && transliterated !== '' && !transliterated.endsWith('-')) {
                    const nextChar = word[i + 1];
                    const nextTranslit = mapping[nextChar];
                    
                    if (nextTranslit && nextTranslit !== '') {
                        // Only add hyphen if both current and next are consonants
                        const currentIsVowel = vowels.some(v => transliterated.endsWith(v));
                        const nextIsVowel = vowels.some(v => nextTranslit.startsWith(v));
                        
                        if (!currentIsVowel && !nextIsVowel && transliterated.length > 1) {
                            result += '-';
                        }
                    }
                }
            } else if (char === ' ') {
                result += ' ';
            }
        }
        return result || word;
    }
}

// Global dictionary instance
let dictionaryApp;

// Initialize the dictionary when the page loads
document.addEventListener('DOMContentLoaded', () => {
    dictionaryApp = new Dictionary();
    
    // Check for search query in URL on page load
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    if (query) {
        dictionaryApp.searchInput.value = query;
        dictionaryApp.handleSearch();
    }
});

// Add some helpful keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Focus search input when pressing '/' key
    if (e.key === '/' && e.target !== document.getElementById('searchInput')) {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
    
    // Clear search when pressing Escape
    if (e.key === 'Escape') {
        const searchInput = document.getElementById('searchInput');
        searchInput.value = '';
        searchInput.blur();
        
        // Show welcome message
        const welcomeHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">📚</div>
                <h3>Welcome to the Dictionary</h3>
                <p>Start typing to search for English or Arabic words</p>
            </div>
        `;
        document.getElementById('resultsContainer').innerHTML = welcomeHTML;
    }
});

// Add smooth scroll behavior for better UX
document.documentElement.style.scrollBehavior = 'smooth';

// Handle browser back/forward buttons
window.addEventListener('popstate', (e) => {
    if (dictionaryApp) {
        if (e.state && e.state.searchQuery) {
            dictionaryApp.searchInput.value = e.state.searchQuery;
            dictionaryApp.handleSearch({ suppressHistory: true });
        } else {
            // Handle case where there's no state (e.g., initial page load)
            const urlParams = new URLSearchParams(window.location.search);
            const query = urlParams.get('q');
            if (query) {
                dictionaryApp.searchInput.value = query;
                dictionaryApp.handleSearch({ suppressHistory: true });
            } else {
                dictionaryApp.searchInput.value = '';
                dictionaryApp.showWelcome();
            }
        }
    }
});

// Add updateURL method to Dictionary class
Dictionary.prototype.updateURL = function(query) {
    if (query && query.trim()) {
        const url = new URL(window.location);
        const currentQuery = new URLSearchParams(window.location.search).get('q');
        
        // Avoid duplicate history entries
        if (currentQuery !== query) {
            url.searchParams.set('q', query);
            history.pushState({ searchQuery: query }, '', url);
        }
    }
};// Merge extra entries from an external JSON into dictionaryData at runtime
async function mergeExternalJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch ' + url);
    const extra = await res.json();

    // Ensure global is there
    window.dictionaryData = window.dictionaryData || dictionaryData;

    let added = 0, skipped = 0;
    for (const [k, v] of Object.entries(extra)) {
      const key = (k || (v && v.word) || '').toLowerCase().trim();
      if (!key) continue;

      if (!window.dictionaryData[key]) {
        window.dictionaryData[key] = v;
        added++;
      } else {
        // keep your existing values; uncomment next line to override if you ever want:
        // window.dictionaryData[key] = v;
        skipped++;
      }
    }
    console.log(`Merged ${added} entries from ${url} (skipped ${skipped} existing)`);
  } catch (err) {
    console.error('mergeExternalJSON error:', err);
  }
}
// Load external data (when hosted on GitHub Pages / Netlify)
mergeExternalJSON('pdf_dictionary.example.json'); // make sure this file is in the repo root
