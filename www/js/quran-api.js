/*
  quran-api.js
  ------------
  Poora Quran text hum khud type nahi karte — is se ghalti ka khatra hota hai.
  Iski jagah, app pehli dafa internet se ek authentic, free Quran API
  (alquran.cloud) se surah list aur ayat ka text download karti hai,
  aur localStorage mein save kar leti hai. Uske baad app offline chal sakti hai
  (sirf microphone chahiye, internet nahi).

  Agar aap kisi doosre reliable source (jaise Tanzil.net ka verified text file)
  ka istemal karna chahte hain, is file mein sirf BASE_URL aur fetch functions
  badalne honge — baaki app is data ko usi shape mein istemal karti rahegi.
*/

const QuranAPI = (() => {
  const BASE_URL = "https://api.alquran.cloud/v1";
  const EDITION = "quran-uthmani"; // authentic Uthmani script, tashkeel ke saath
  const CACHE_KEY_LIST = "quran_surah_list_v2";
  const CACHE_KEY_SURAH_PREFIX = "quran_surah_text_v2_";

  async function fetchSurahList() {
    const cached = localStorage.getItem(CACHE_KEY_LIST);
    if (cached) return JSON.parse(cached);

    const res = await fetch(`${BASE_URL}/surah`);
    if (!res.ok) throw new Error("Surah list fetch nahi ho saki");
    const json = await res.json();
    const list = json.data; // [{number, name (arabic), englishName, englishNameTranslation, numberOfAyahs, revelationType}]
    localStorage.setItem(CACHE_KEY_LIST, JSON.stringify(list));
    return list;
  }

  async function fetchSurahText(surahNumber) {
    const cacheKey = CACHE_KEY_SURAH_PREFIX + surahNumber;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);

    const res = await fetch(`${BASE_URL}/surah/${surahNumber}/${EDITION}`);
    if (!res.ok) throw new Error(`Surah ${surahNumber} ka text fetch nahi ho saka`);
    const json = await res.json();
    // "page" = standard 604-page Mushaf ka page number (alquran.cloud API deta hai).
    // Isi se hum ayaton ko "ek Mushaf page" ki tarah group karke dikha sakte hain,
    // taake screen par ek ayat akeli na dikhe, balki poora page jaisa mahol bane.
    const ayahs = json.data.ayahs.map(a => ({
      number: a.numberInSurah,
      text: a.text,
      page: a.page || null
    }));
    localStorage.setItem(cacheKey, JSON.stringify(ayahs));
    return ayahs;
  }

  // Poori Quran ek saath download karne ke liye (splash screen progress ke sath),
  // taake baad mein app bilkul offline chal sake.
  async function downloadEntireQuran(onProgress) {
    const list = await fetchSurahList();
    for (let i = 0; i < list.length; i++) {
      const surah = list[i];
      await fetchSurahText(surah.number);
      if (onProgress) onProgress(i + 1, list.length, surah);
    }
    localStorage.setItem("quran_download_complete_v2", "true");
    return list;
  }

  async function fetchSurahTranslations(surahNumber) {
    const cacheKey = "quran_translation_v1_" + surahNumber;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);

    // Urdu: Jalandhry (mash-hoor, alquran.cloud par mojood). English: Sahih International.
    const res = await fetch(`${BASE_URL}/surah/${surahNumber}/editions/ur.jalandhry,en.sahih`);
    if (!res.ok) throw new Error("Tarjuma fetch nahi ho saka");
    const json = await res.json();
    const [urdu, english] = json.data;
    const result = urdu.ayahs.map((a, i) => ({
      number: a.numberInSurah,
      ur: a.text,
      en: english.ayahs[i] ? english.ayahs[i].text : ""
    }));
    localStorage.setItem(cacheKey, JSON.stringify(result));
    return result;
  }

  // Ek Para/Juz (30 sipaaron mein se ek) ki ayaton ko fetch karna — yeh
  // ek se zyada Surah ke ayaat le kar aata hai (jaisa asal Quran mein Para
  // surah ki hadd se aage-peeche ja sakta hai).
  async function fetchJuzText(juzNumber) {
    const cacheKey = "quran_juz_v1_" + juzNumber;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);

    const res = await fetch(`${BASE_URL}/juz/${juzNumber}/${EDITION}`);
    if (!res.ok) throw new Error(`Para ${juzNumber} ka text fetch nahi ho saka`);
    const json = await res.json();
    const ayahs = json.data.ayahs.map(a => ({
      number: a.numberInSurah,
      text: a.text,
      page: a.page || null,
      surahNumber: a.surah ? a.surah.number : null,
      surahName: a.surah ? a.surah.englishName : null
    }));
    localStorage.setItem(cacheKey, JSON.stringify(ayahs));
    return ayahs;
  }

  function isDownloadComplete() {
    return localStorage.getItem("quran_download_complete_v2") === "true";
  }

  function clearCache() {
    Object.keys(localStorage)
      .filter(k => k.startsWith("quran_"))
      .forEach(k => localStorage.removeItem(k));
  }

  return { fetchSurahList, fetchSurahText, fetchSurahTranslations, fetchJuzText, downloadEntireQuran, isDownloadComplete, clearCache };
})();
