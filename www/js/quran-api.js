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
  const CACHE_KEY_LIST = "quran_surah_list_v1";
  const CACHE_KEY_SURAH_PREFIX = "quran_surah_text_v1_";

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
    const ayahs = json.data.ayahs.map(a => ({
      number: a.numberInSurah,
      text: a.text
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
    localStorage.setItem("quran_download_complete_v1", "true");
    return list;
  }

  function isDownloadComplete() {
    return localStorage.getItem("quran_download_complete_v1") === "true";
  }

  function clearCache() {
    Object.keys(localStorage)
      .filter(k => k.startsWith("quran_"))
      .forEach(k => localStorage.removeItem(k));
  }

  return { fetchSurahList, fetchSurahText, downloadEntireQuran, isDownloadComplete, clearCache };
})();
