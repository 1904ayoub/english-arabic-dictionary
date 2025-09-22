// English-Arabic Dictionary Data
const dictionaryData = {
    // English to Arabic entries
    "hello": {
        word: "hello",
        language: "English",
        translations: [
            {
                type: "interjection",
                meanings: ["مرحبا", "أهلا", "السلام عليكم"]
            }
        ],
        pronunciation: "həˈloʊ",
        synonyms: ["hi", "greetings", "salutation"],
        audio: "hello"
    },
    "book": {
        word: "book",
        language: "English",
        translations: [
            {
                type: "noun",
                meanings: ["كتاب", "مؤلف"]
            },
            {
                type: "verb",
                meanings: ["يحجز", "يسجل"]
            }
        ],
        pronunciation: "bʊk",
        synonyms: ["volume", "text", "publication"],
        audio: "book"
    },
    "water": {
        word: "water",
        language: "English",
        translations: [
            {
                type: "noun",
                meanings: ["ماء", "مياه"]
            },
            {
                type: "verb",
                meanings: ["يسقي", "يروي"]
            }
        ],
        pronunciation: "ˈwɔːtər",
        synonyms: ["liquid", "fluid", "H2O"],
        audio: "water"
    },
    "house": {
        word: "house",
        language: "English",
        translations: [
            {
                type: "noun",
                meanings: ["بيت", "منزل", "دار"]
            },
            {
                type: "verb",
                meanings: ["يؤوي", "يسكن"]
            }
        ],
        pronunciation: "haʊs",
        synonyms: ["home", "dwelling", "residence"],
        audio: "house"
    },
    "love": {
        word: "love",
        language: "English",
        translations: [
            {
                type: "noun",
                meanings: ["حب", "محبة", "عشق"]
            },
            {
                type: "verb",
                meanings: ["يحب", "يعشق"]
            }
        ],
        pronunciation: "lʌv",
        synonyms: ["affection", "adoration", "devotion"],
        audio: "love"
    },
    "family": {
        word: "family",
        language: "English",
        translations: [
            {
                type: "noun",
                meanings: ["عائلة", "أسرة", "عشيرة"]
            }
        ],
        pronunciation: "ˈfæməli",
        synonyms: ["relatives", "household", "clan"],
        audio: "family"
    },
    "friend": {
        word: "friend",
        language: "English",
        translations: [
            {
                type: "noun",
                meanings: ["صديق", "رفيق", "خليل"]
            }
        ],
        pronunciation: "frend",
        synonyms: ["companion", "buddy", "pal"],
        audio: "friend"
    },
    "school": {
        word: "school",
        language: "English",
        translations: [
            {
                type: "noun",
                meanings: ["مدرسة", "معهد"]
            },
            {
                type: "verb",
                meanings: ["يعلم", "يدرب"]
            }
        ],
        pronunciation: "skuːl",
        synonyms: ["institution", "academy", "college"],
        audio: "school"
    },
    "food": {
        word: "food",
        language: "English",
        translations: [
            {
                type: "noun",
                meanings: ["طعام", "غذاء", "أكل"]
            }
        ],
        pronunciation: "fuːd",
        synonyms: ["nourishment", "sustenance", "cuisine"],
        audio: "food"
    },
    "work": {
        word: "work",
        language: "English",
        translations: [
            {
                type: "noun",
                meanings: ["عمل", "شغل", "مهنة"]
            },
            {
                type: "verb",
                meanings: ["يعمل", "يشتغل"]
            }
        ],
        pronunciation: "wɜːrk",
        synonyms: ["job", "labor", "employment"],
        audio: "work"
    },

    // Arabic to English entries
    "مرحبا": {
        word: "مرحبا",
        language: "Arabic",
        translations: [
            {
                type: "interjection",
                meanings: ["hello", "welcome", "greetings"]
            }
        ],
        pronunciation: "marḥaban",
        synonyms: ["أهلا", "السلام عليكم", "حياكم الله"],
        audio: "marhaban"
    },
    "كتاب": {
        word: "كتاب",
        language: "Arabic",
        translations: [
            {
                type: "noun",
                meanings: ["book", "written work", "manuscript"]
            }
        ],
        pronunciation: "kitāb",
        synonyms: ["مؤلف", "نص", "مخطوط"],
        audio: "kitab"
    },
    "ماء": {
        word: "ماء",
        language: "Arabic",
        translations: [
            {
                type: "noun",
                meanings: ["water", "liquid"]
            }
        ],
        pronunciation: "māʾ",
        synonyms: ["مياه", "سائل"],
        audio: "maa"
    },
    "بيت": {
        word: "بيت",
        language: "Arabic",
        translations: [
            {
                type: "noun",
                meanings: ["house", "home", "dwelling"]
            }
        ],
        pronunciation: "bayt",
        synonyms: ["منزل", "دار", "مسكن"],
        audio: "bayt"
    },
    "حب": {
        word: "حب",
        language: "Arabic",
        translations: [
            {
                type: "noun",
                meanings: ["love", "affection", "fondness"]
            }
        ],
        pronunciation: "ḥubb",
        synonyms: ["محبة", "عشق", "غرام"],
        audio: "hubb"
    },
    "عائلة": {
        word: "عائلة",
        language: "Arabic",
        translations: [
            {
                type: "noun",
                meanings: ["family", "household", "relatives"]
            }
        ],
        pronunciation: "ʿāʾila",
        synonyms: ["أسرة", "عشيرة", "أهل"],
        audio: "aaila"
    },
    "صديق": {
        word: "صديق",
        language: "Arabic",
        translations: [
            {
                type: "noun",
                meanings: ["friend", "companion", "buddy"]
            }
        ],
        pronunciation: "ṣadīq",
        synonyms: ["رفيق", "خليل", "زميل"],
        audio: "sadeeq"
    },
    "مدرسة": {
        word: "مدرسة",
        language: "Arabic",
        translations: [
            {
                type: "noun",
                meanings: ["school", "institution", "academy"]
            }
        ],
        pronunciation: "madrasa",
        synonyms: ["معهد", "جامعة", "كلية"],
        audio: "madrasa"
    },
    "طعام": {
        word: "طعام",
        language: "Arabic",
        translations: [
            {
                type: "noun",
                meanings: ["food", "meal", "nourishment"]
            }
        ],
        pronunciation: "ṭaʿām",
        synonyms: ["غذاء", "أكل", "وجبة"],
        audio: "taam"
    },
    "عمل": {
        word: "عمل",
        language: "Arabic",
        translations: [
            {
                type: "noun",
                meanings: ["work", "job", "labor"]
            },
            {
                type: "verb",
                meanings: ["to work", "to do", "to make"]
            }
        ],
        pronunciation: "ʿamal",
        synonyms: ["شغل", "مهنة", "وظيفة"],
        audio: "amal"
    },

    // Additional common words
    "time": {
        word: "time",
        language: "English",
        translations: [
            {
                type: "noun",
                meanings: ["وقت", "زمن", "مدة"]
            }
        ],
        pronunciation: "taɪm",
        synonyms: ["moment", "period", "duration"],
        audio: "time"
    },
    "وقت": {
        word: "وقت",
        language: "Arabic",
        translations: [
            {
                type: "noun",
                meanings: ["time", "moment", "period"]
            }
        ],
        pronunciation: "waqt",
        synonyms: ["زمن", "مدة", "حين"],
        audio: "waqt"
    },
    "beautiful": {
        word: "beautiful",
        language: "English",
        translations: [
            {
                type: "adjective",
                meanings: ["جميل", "حسن", "بديع"]
            }
        ],
        pronunciation: "ˈbjuːtɪfəl",
        synonyms: ["pretty", "lovely", "gorgeous"],
        audio: "beautiful"
    },
    "جميل": {
        word: "جميل",
        language: "Arabic",
        translations: [
            {
                type: "adjective",
                meanings: ["beautiful", "handsome", "lovely"]
            }
        ],
        pronunciation: "jamīl",
        synonyms: ["حسن", "بديع", "رائع"],
        audio: "jameel"
    },
    "happy": {
        word: "happy",
        language: "English",
        translations: [
            {
                type: "adjective",
                meanings: ["سعيد", "مسرور", "فرحان"]
            }
        ],
        pronunciation: "ˈhæpi",
        synonyms: ["joyful", "cheerful", "glad"],
        audio: "happy"
    },
    "سعيد": {
        word: "سعيد",
        language: "Arabic",
        translations: [
            {
                type: "adjective",
                meanings: ["happy", "joyful", "glad"]
            }
        ],
        pronunciation: "saʿīd",
        synonyms: ["مسرور", "فرحان", "مبتهج"],
        audio: "saeed"
    }
};

// Helper function to detect Arabic text
function isArabicText(text) {
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    return arabicRegex.test(text);
}

// Helper function to search dictionary
function searchDictionary(query) {
    if (!query || !query.trim()) {
        return [];
    }
    
    const results = [];
    const normalizedQuery = query.trim();
    const isQueryArabic = isArabicText(normalizedQuery);
    const lowerQuery = normalizedQuery.toLowerCase();
    
    for (const [key, entry] of Object.entries(dictionaryData)) {
        let found = false;
        
        // Direct word match (case-sensitive for Arabic, case-insensitive for English)
        if (isQueryArabic) {
            if (key === normalizedQuery || key.includes(normalizedQuery)) {
                results.push(entry);
                found = true;
            }
        } else {
            if (key.toLowerCase() === lowerQuery || key.toLowerCase().includes(lowerQuery)) {
                results.push(entry);
                found = true;
            }
        }
        
        if (found) continue;
        
        // Search in translations
        for (const translation of entry.translations) {
            if (found) break;
            for (const meaning of translation.meanings) {
                if (isQueryArabic) {
                    if (meaning.includes(normalizedQuery)) {
                        results.push(entry);
                        found = true;
                        break;
                    }
                } else {
                    if (meaning.toLowerCase().includes(lowerQuery)) {
                        results.push(entry);
                        found = true;
                        break;
                    }
                }
            }
        }
        
        if (found) continue;
        
        // Search in synonyms
        for (const synonym of entry.synonyms) {
            if (isQueryArabic) {
                if (synonym.includes(normalizedQuery)) {
                    results.push(entry);
                    found = true;
                    break;
                }
            } else {
                if (synonym.toLowerCase().includes(lowerQuery)) {
                    results.push(entry);
                    found = true;
                    break;
                }
            }
        }
    }
    
    // Remove duplicates based on word and language
    const uniqueResults = [];
    const seen = new Set();
    
    for (const entry of results) {
        const key = `${entry.word}-${entry.language}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueResults.push(entry);
        }
    }
    
    return uniqueResults;
}// merge_pdf_to_dictionary.js (Node script)
// Usage: node merge_pdf_to_dictionary.js pdf_dictionary.json dictionary-data.js
const fs = require('fs');
const path = require('path');

if (process.argv.length < 4) {
  console.error("Usage: node merge_pdf_to_dictionary.js <pdf_json> <dictionary_js>");
  process.exit(1);
}

const pdfJsonPath = process.argv[2];
const dictJsPath = process.argv[3];

const pdfObj = JSON.parse(fs.readFileSync(pdfJsonPath, 'utf8'));

// Read dictionary-data.js and extract the object literal
let dictJs = fs.readFileSync(dictJsPath, 'utf8');

// naive extraction: find the first "const dictionaryData = {" and the matching closing "};"
const startIdx = dictJs.indexOf("const dictionaryData");
if (startIdx === -1) {
  console.error("Could not find 'const dictionaryData' in", dictJsPath);
  process.exit(1);
}
const objStart = dictJs.indexOf("{", startIdx);
const objEnd = dictJs.lastIndexOf("};");
if (objStart === -1 || objEnd === -1) {
  console.error("Could not parse dictionary object boundaries.");
  process.exit(1);
}
const objText = dictJs.substring(objStart, objEnd+1);

// Evaluate it safely? We'll write a small wrapper to convert to JSON by replacing trailing commas, etc.
// Simpler: attempt to require it as a module by writing a temp file that exports it.
const tmpModulePath = path.join(__dirname, "tmp_dictionary_module.js");
fs.writeFileSync(tmpModulePath, dictJs + "\nmodule.exports = dictionaryData;", 'utf8');
const existing = require(tmpModulePath);

const merged = Object.assign({}, existing);

// Merge: for each key in pdfObj, if key exists do not override (unless you want), here we'll add and override if missing.
for (const [k,v] of Object.entries(pdfObj)) {
  if (!merged[k]) {
    merged[k] = v;
  } else {
    // if exists, keep existing but if the existing is missing translations add them:
    // simple: do not override existing; you can change behavior here
  }
}

// write merged file
const outPath = path.join(__dirname, "dictionary-data.merged.js");
const outText = "const dictionaryData = " + JSON.stringify(merged, null, 2) + ";\n\nexport default dictionaryData;";
fs.writeFileSync(outPath, outText, 'utf8');
console.log("Merged dictionary saved to", outPath);
