/*
  app.js
  ------
  Teen screens ke beech navigation, Quran data download (splash),
  surah list + search, aur recitation screen (mic + speech match).

  IMPORTANT / IMAANDAARI KI BAAT:
  Speech recognition sirf "lafzi" (word-level) galti pakadti hai —
  yani agar aap koi lafz chhod dein, badal dein, ya order badal dein.
  Ye TAJWEED (makhraj, madd, ghunnah, qalqalah) ki ghaltiyan nahi pakad sakti.

  PAGE LAYOUT KE BAARE MEIN EK IMAANDAARI KI BAAT:
  Ye app ayaton ko alquran.cloud API ke standard 604-page Mushaf number ke
  hisaab se group karke, "poore page" ki tarah continuous dikhati hai (ek
  akeli ayat dikhane ki bajaye). Lekin asal Indo-Pak 16-line Mushaf mein har
  line par THEEK kaunse lafz aate hain, uska koi free/reliable data source
  maujood nahi hai — is liye line-by-line 1:1 match guarantee nahi hai,
  sirf "ek page jaisा continuous ehsaas" diya ja raha hai.
*/

// ---------- Navigation helpers ----------
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ---------- Arabic text normalization (matching ke liye) ----------
function normalizeArabic(text) {
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "") // harakat / tashkeel / waqf marks
    .replace(/\u0640/g, "")                              // tatweel
    .replace(/[إأآا]/g, "ا")                             // alef forms -> plain alef
    .replace(/ى/g, "ي")                                  // alef maqsura -> ya
    .replace(/ة/g, "ه")                                  // ta marbuta -> ha (loose match)
    .replace(/[^\u0600-\u06FF\s]/g, "")                   // sirf Arabic letters + space rakhein
    .replace(/\s+/g, " ")
    .trim();
}

function splitWords(text) {
  return normalizeArabic(text).split(" ").filter(Boolean);
}

function toArabicDigits(n) {
  const map = ["\u0660","\u0661","\u0662","\u0663","\u0664","\u0665","\u0666","\u0667","\u0668","\u0669"];
  return String(n).split("").map(d => (map[+d] !== undefined ? map[+d] : d)).join("");
}

// Ek ayat ke raw (tashkeel ke saath, dikhane ke liye) aur normalized
// (matching ke liye) lafz taiyar karke ayah object par hi cache kar dete hain,
// taake dono jagah (screen par dikhana + mic se compare karna) ke indices
// hamesha barabar rahein (ayah-number ke symbols hata kar).
function getAyahWords(ayah) {
  if (!ayah._words) {
    const tokens = ayah.text.split(" ").filter(t => t.trim().length > 0);
    const words = tokens.filter(t => /[\u0621-\u064A]/.test(t));
    ayah._words = words;
    ayah._normWords = words.map(normalizeArabic);
    ayah._wordStatus = new Array(words.length).fill(null); // null | 'matched' | 'skip' | 'wrong'
  }
  return ayah;
}

function groupAyahsIntoPages(ayahs) {
  const pages = [];
  let current = null;
  ayahs.forEach(ayah => {
    const pageKey = ayah.page || "?";
    if (!current || current.pageNumber !== pageKey) {
      current = { pageNumber: pageKey, ayahs: [] };
      pages.push(current);
    }
    current.ayahs.push(ayah);
  });
  return pages;
}

// ---------- App state ----------
const state = {
  surahList: [],
  currentSurah: null,
  pages: [],           // [{pageNumber, ayahs:[...]}]
  pageIndex: 0,
  ayahPtrInPage: 0,
  matchPointer: 0,      // kitne normalized words ab tak match ho chuke (current ayah ke andar)
  mistakeCount: 0,
  mistakes: [],         // [{ayahNumber, word, type}]
  translations: null,   // is surah ka Urdu/English tarjuma (lazy-loaded)
  recognition: null,
  listening: false
};
let translationVisible = false;

// ---------- Splash / download ----------
async function initSplash() {
  const msg = document.getElementById("splash-message");
  const fill = document.getElementById("progress-fill");
  const retryBtn = document.getElementById("btn-retry");

  if (QuranAPI.isDownloadComplete()) {
    msg.textContent = "Data mil gaya, khol rahe hain\u2026";
    await loadSurahListIntoUI();
    showScreen("screen-list");
    return;
  }

  retryBtn.classList.add("hidden");
  msg.textContent = "Quran Pak ka text pehli dafa download ho raha hai\u2026";

  try {
    await QuranAPI.downloadEntireQuran((done, total, surah) => {
      const pct = Math.round((done / total) * 100);
      fill.style.width = pct + "%";
      msg.textContent = `${surah.englishName} (${done}/${total}) \u2014 ${pct}%`;
    });
    msg.textContent = "Download mukammal! Khol rahe hain\u2026";
    await loadSurahListIntoUI();
    setTimeout(() => showScreen("screen-list"), 400);
  } catch (err) {
    console.error(err);
    msg.textContent = "Download nahi ho saka. Internet connection check karein.";
    retryBtn.classList.remove("hidden");
  }
}

document.getElementById("btn-retry").addEventListener("click", initSplash);

// ---------- Surah list ----------
async function loadSurahListIntoUI() {
  state.surahList = await QuranAPI.fetchSurahList();
  document.getElementById("data-source-note").textContent =
    `${state.surahList.length} Surahein \u2014 offline mojood hain`;
  renderSurahList(state.surahList);
}

function renderSurahList(list) {
  const ul = document.getElementById("surah-list");
  ul.innerHTML = "";
  list.forEach(surah => {
    const li = document.createElement("li");
    li.className = "surah-item";
    li.innerHTML = `
      <div class="surah-number">${surah.number}</div>
      <div class="surah-names">
        <div class="surah-name-en">${surah.englishName} <span class="surah-name-meta">\u00b7 ${surah.englishNameTranslation}</span></div>
        <div class="surah-name-meta">${surah.numberOfAyahs} Ayaat \u00b7 ${surah.revelationType}</div>
      </div>
      <div class="surah-name-ar">${surah.name}</div>
    `;
    li.addEventListener("click", () => openSurah(surah));
    ul.appendChild(li);
  });
}

document.getElementById("surah-search").addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  if (!q) return renderSurahList(state.surahList);
  const filtered = state.surahList.filter(s =>
    s.englishName.toLowerCase().includes(q) ||
    s.englishNameTranslation.toLowerCase().includes(q) ||
    String(s.number) === q ||
    s.name.includes(q)
  );
  renderSurahList(filtered);
});

// ---------- Para (Juz) tab ----------
function renderParaList() {
  const ul = document.getElementById("para-list");
  ul.innerHTML = "";
  for (let i = 1; i <= 30; i++) {
    const li = document.createElement("li");
    li.className = "surah-item";
    li.innerHTML = `
      <div class="surah-number">${i}</div>
      <div class="surah-names">
        <div class="surah-name-en">Para ${i}</div>
      </div>
      <div class="surah-name-ar">\u0627\u0644\u062C\u0632\u0621 ${toArabicDigits(i)}</div>
    `;
    li.addEventListener("click", () => openJuz(i));
    ul.appendChild(li);
  }
  ul.dataset.rendered = "1";
}

document.getElementById("tab-surah").addEventListener("click", () => {
  document.getElementById("tab-surah").classList.add("active");
  document.getElementById("tab-para").classList.remove("active");
  document.getElementById("surah-search-bar").classList.remove("hidden");
  document.getElementById("surah-list").classList.remove("hidden");
  document.getElementById("para-list").classList.add("hidden");
});

document.getElementById("tab-para").addEventListener("click", () => {
  document.getElementById("tab-para").classList.add("active");
  document.getElementById("tab-surah").classList.remove("active");
  document.getElementById("surah-search-bar").classList.add("hidden");
  document.getElementById("surah-list").classList.add("hidden");
  document.getElementById("para-list").classList.remove("hidden");
  if (!document.getElementById("para-list").dataset.rendered) renderParaList();
});

async function openJuz(juzNumber) {
  const ayahs = await QuranAPI.fetchJuzText(juzNumber);
  state.currentSurah = {
    englishName: `Para ${juzNumber}`,
    name: `\u0627\u0644\u062C\u0632\u0621 ${toArabicDigits(juzNumber)}`,
    numberOfAyahs: ayahs.length,
    number: null,
    isJuz: true
  };
  state.pages = groupAyahsIntoPages(ayahs);
  state.pageIndex = 0;
  state.ayahPtrInPage = 0;
  state.mistakeCount = 0;
  state.mistakes = [];
  state.translations = null;
  translationVisible = false;
  document.getElementById("translation-panel").classList.add("hidden");
  document.getElementById("btn-toggle-translation").disabled = true; // Para mein tarjuma abhi supported nahi
  document.getElementById("recite-surah-name").textContent =
    `${state.currentSurah.englishName} \u00b7 ${state.currentSurah.name}`;
  document.getElementById("recite-ayah-count").textContent = `${ayahs.length} Ayaat`;
  updateMistakeUI();
  loadCurrentAyah();
  showScreen("screen-recite");
}

// ---------- Recitation screen ----------
async function openSurah(surah) {
  state.currentSurah = surah;
  const ayahs = await QuranAPI.fetchSurahText(surah.number);
  state.pages = groupAyahsIntoPages(ayahs);
  state.pageIndex = 0;
  state.ayahPtrInPage = 0;
  state.mistakeCount = 0;
  state.mistakes = [];
  state.translations = null;
  translationVisible = false;
  document.getElementById("translation-panel").classList.add("hidden");
  document.getElementById("btn-toggle-translation").disabled = false;
  document.getElementById("recite-surah-name").textContent =
    `${surah.englishName} \u00b7 ${surah.name}`;
  document.getElementById("recite-ayah-count").textContent = `${surah.numberOfAyahs} Ayaat`;
  updateMistakeUI();
  loadCurrentAyah();
  showScreen("screen-recite");
}

function currentAyahObj() {
  const page = state.pages[state.pageIndex];
  if (!page) return null;
  return page.ayahs[state.ayahPtrInPage] || null;
}

function loadCurrentAyah() {
  const page = state.pages[state.pageIndex];
  if (!page) {
    document.getElementById("mic-status").textContent = "Mubarak ho, Surah mukammal hui!";
    stopListening();
    return;
  }
  const ayah = page.ayahs[state.ayahPtrInPage];
  if (!ayah) return;
  getAyahWords(ayah);
  state.matchPointer = 0;
  renderPage();
}

function advanceToNextAyah() {
  const page = state.pages[state.pageIndex];
  state.ayahPtrInPage++;
  if (!page || state.ayahPtrInPage >= page.ayahs.length) {
    state.pageIndex++;
    state.ayahPtrInPage = 0;
  }
  loadCurrentAyah();
}

// Page ko manually aage/peeche navigate karne ke liye (recitation progress se
// alag — sirf dekhne/switch karne ke liye).
function goToPage(delta) {
  const newIndex = state.pageIndex + delta;
  if (newIndex < 0 || newIndex >= state.pages.length) return;
  state.pageIndex = newIndex;
  state.ayahPtrInPage = 0;
  loadCurrentAyah();
}

document.getElementById("btn-prev-page").addEventListener("click", () => goToPage(-1));
document.getElementById("btn-next-page").addEventListener("click", () => goToPage(1));

// Swipe se bhi page badal sakein (Tarteel/Itqan jaisi apps ki tarah "page
// palatne" ka ehsaas — bina kisi se code copy kiye, sirf ek aam touch
// gesture use karke).
(function setupSwipeNavigation() {
  const el = document.getElementById("ayah-display");
  let startX = 0, startY = 0, tracking = false;
  el.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });
  el.addEventListener("touchend", (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goToPage(1);   // left swipe -> agla page
      else goToPage(-1);        // right swipe -> pichla page
    }
  }, { passive: true });
})();

// ---------- Poore Mushaf-jaise "page" ko render karna ----------
function renderPage() {
  const page = state.pages[state.pageIndex];
  const container = document.getElementById("ayah-arabic");
  if (!page) return;

  let html = "";
  page.ayahs.forEach((ayah, ayahIdx) => {
    getAyahWords(ayah);
    ayah._words.forEach((w, wi) => {
      const status = ayah._wordStatus[wi];
      let cls = "word";
      if (status === "matched") cls += " matched";
      else if (status === "wrong") cls += " mistake-wrong";
      else if (status === "skip") cls += " mistake-skip";
      html += `<span class="${cls}">${w}</span> `;
    });
    html += `<span class="ayah-end-mark">${toArabicDigits(ayah.number)}</span> `;
  });
  container.innerHTML = html.trim();

  const page_ = state.pages[state.pageIndex];
  const ayah = currentAyahObj();
  const posEl = document.getElementById("ayah-position");
  if (ayah && page_) {
    posEl.textContent = `Ayat ${ayah.number} / ${state.currentSurah.numberOfAyahs}` +
      (page_.pageNumber && page_.pageNumber !== "?" ? ` \u00b7 Mushaf Page ${page_.pageNumber}` : "");
  }

  document.getElementById("page-indicator").textContent =
    `Page ${state.pageIndex + 1} / ${state.pages.length}`;
  document.getElementById("btn-prev-page").disabled = state.pageIndex <= 0;
  document.getElementById("btn-next-page").disabled = state.pageIndex >= state.pages.length - 1;

  if (translationVisible) renderTranslation();
}

function updateMistakeUI() {
  document.getElementById("mistake-count").textContent = state.mistakeCount;
}

function playAlertBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 440;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    console.warn("Beep nahi baj saka:", e);
  }
}

// ---------- Word matching (sequence alignment) ----------
// Ek "alignment" algorithm (edit-distance jaisa) jo sahi, badle hue, aur
// CHHOOTE hue lafz — teeno ko sahi tarah pehchanta hai (sirf ek-ek lafz
// seedha compare karne se skip hui ghalti nazarandaz ho jaati thi).
//
// IMAANDARI KI BAAT: mobile browser ka Arabic speech recognizer khud kabhi
// kabhi sahi bole gaye lafz ko thoda alag likh deta hai (transcription
// imperfect hoti hai). Isliye hum EXACT match ki bajaye "kareebi match"
// (chhoti si spelling ka farq maaf) istemal karte hain — taake sahi padhi
// gayi cheez ko galti na samjha jaye. Ye 100% perfect nahi hoga (koi bhi
// free/on-device Arabic tilawat recognizer perfect nahi hota), lekin
// pehle se kaafi behtar hoga.
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function wordsMatch(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const dist = levenshtein(a, b);
  const tolerance = a.length <= 4 ? 1 : (a.length <= 8 ? 2 : 3);
  return dist <= tolerance;
}

function alignWords(expected, spoken) {
  const n = expected.length, m = spoken.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (wordsMatch(expected[i - 1], spoken[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  const ops = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && wordsMatch(expected[i - 1], spoken[j - 1]) && dp[i][j] === dp[i - 1][j - 1]) {
      ops.push({ type: "match", expectedIdx: i - 1 });
      i--; j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      ops.push({ type: "sub", expectedIdx: i - 1 });
      i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.push({ type: "delete", expectedIdx: i - 1 });
      i--;
    } else {
      ops.push({ type: "insert" });
      j--;
    }
  }
  return ops.reverse();
}

function processSpokenWords(spokenWords) {
  const ayah = currentAyahObj();
  if (!ayah) return;
  getAyahWords(ayah);
  const expected = ayah._normWords;
  if (state.matchPointer >= expected.length) return;
  if (!spokenWords || spokenWords.length === 0) return;

  const windowSize = Math.min(expected.length - state.matchPointer, spokenWords.length + 6);
  const windowWords = expected.slice(state.matchPointer, state.matchPointer + windowSize);
  const ops = alignWords(windowWords, spokenWords);

  ops.forEach(op => {
    if (op.type === "insert") return; // extra/fazool awaaz, ignore karein
    const absoluteIdx = state.matchPointer + op.expectedIdx;
    if (op.type === "match") {
      ayah._wordStatus[absoluteIdx] = "matched";
    } else {
      const type = op.type === "delete" ? "skip" : "wrong";
      ayah._wordStatus[absoluteIdx] = type;
      state.mistakeCount++;
      state.mistakes.push({
        ayahNumber: ayah.number,
        word: ayah._words[absoluteIdx],
        type
      });
      playAlertBeep();
    }
  });

  state.matchPointer += windowWords.length;
  updateMistakeUI();
  renderPage();

  if (state.matchPointer >= expected.length) {
    setTimeout(advanceToNextAyah, 500);
  }
}

// ---------- Mistakes panel (clickable list) ----------
function openMistakesPanel() {
  const list = document.getElementById("mistakes-list");
  if (state.mistakes.length === 0) {
    list.innerHTML = `<li class="mistakes-empty">Abhi tak koi ghalti nahi hui, MashaAllah!</li>`;
  } else {
    list.innerHTML = state.mistakes.map((m, i) => `
      <li class="mistake-item">
        <span class="mistake-index">${i + 1}.</span>
        <span class="mistake-word" dir="rtl" lang="ar">${m.word}</span>
        <span class="mistake-meta">Ayat ${m.ayahNumber} \u00b7 ${m.type === "skip" ? "lafz chhoot gaya" : "galat bola gaya"}</span>
      </li>
    `).join("");
  }
  document.getElementById("mistakes-panel").classList.remove("hidden");
}

document.getElementById("mistake-counter").addEventListener("click", openMistakesPanel);
document.getElementById("btn-close-mistakes").addEventListener("click", () => {
  document.getElementById("mistakes-panel").classList.add("hidden");
});
document.getElementById("mistakes-panel").addEventListener("click", (e) => {
  if (e.target.id === "mistakes-panel") e.currentTarget.classList.add("hidden");
});

// ---------- Tarjuma (Urdu + English translation) panel ----------
async function toggleTranslation() {
  const btn = document.getElementById("btn-toggle-translation");
  const panel = document.getElementById("translation-panel");
  if (state.currentSurah && state.currentSurah.isJuz) return; // Para mode mein abhi supported nahi

  if (!state.translations) {
    btn.disabled = true;
    btn.textContent = "Tarjuma download ho raha hai\u2026";
    try {
      state.translations = await QuranAPI.fetchSurahTranslations(state.currentSurah.number);
    } catch (e) {
      btn.textContent = "Tarjuma download nahi ho saka \u2014 dobara koshish karein";
      btn.disabled = false;
      return;
    }
    btn.disabled = false;
  }

  translationVisible = !translationVisible;
  btn.textContent = translationVisible
    ? "Tarjuma chhupayein"
    : "Tarjuma (Urdu / English) dekhein";
  panel.classList.toggle("hidden", !translationVisible);
  if (translationVisible) renderTranslation();
}

function renderTranslation() {
  if (!state.translations) return;
  const ayah = currentAyahObj();
  if (!ayah) return;
  const t = state.translations[ayah.number - 1];
  if (!t) return;
  document.getElementById("translation-ur").textContent = t.ur;
  document.getElementById("translation-en").textContent = t.en;
}

document.getElementById("btn-toggle-translation").addEventListener("click", toggleTranslation);

// ---------- Speech recognition (Web Speech API) ----------
// PEHLE sirf "final" result ka intezar karte the — mobile browser aksar
// final result tab tak nahi deta jab tak reciter ruk na jaye, is liye
// puri ayat padhne ke baad hi ghalti pata chalti thi (dair se).
// AB interim (jaari/chalta hua) result bhi use karte hain, taake har lafz
// bolte hi jald az jald check ho jaye. Sirf transcript ka AAKHRI lafz
// (jo abhi adhoora ho sakta hai) rok ke rakhte hain, taake adhoora lafz
// galat na pakda jaye.
function setupRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    document.getElementById("mic-status").textContent =
      "Ye browser speech recognition support nahi karta.";
    return null;
  }
  const recognition = new SR();
  recognition.lang = "ar-SA";
  recognition.continuous = true;
  recognition.interimResults = true;

  state.utteranceIndex = -1;
  state.utteranceProcessed = 0;

  recognition.onresult = (event) => {
    const idx = event.resultIndex;
    const result = event.results[idx];
    const words = splitWords(result[0].transcript);

    if (state.utteranceIndex !== idx) {
      state.utteranceIndex = idx;
      state.utteranceProcessed = 0;
    }

    // Agar result abhi final nahi hua, to aakhri lafz ko "adhoora" maan kar
    // chhod dete hain (agla event use theek se process kar dega).
    const confirmedCount = result.isFinal ? words.length : Math.max(0, words.length - 1);

    if (confirmedCount > state.utteranceProcessed) {
      const newWords = words.slice(state.utteranceProcessed, confirmedCount);
      processSpokenWords(newWords);
      state.utteranceProcessed = confirmedCount;
    }

    if (result.isFinal) {
      state.utteranceIndex = -1;
      state.utteranceProcessed = 0;
    }
  };

  recognition.onerror = (event) => {
    console.warn("Recognition error:", event.error);
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      document.getElementById("mic-permission-note").classList.remove("hidden");
      stopListening();
    }
  };

  recognition.onend = () => {
    if (state.listening) recognition.start();
  };

  return recognition;
}

function startListening() {
  if (!state.recognition) state.recognition = setupRecognition();
  if (!state.recognition) return;
  state.listening = true;
  document.getElementById("btn-mic").classList.add("listening");
  document.getElementById("mic-status").textContent = "Sun raha hoon\u2026 tilawat shuru karein";
  document.getElementById("mic-permission-note").classList.add("hidden");
  try {
    state.recognition.start();
  } catch (e) {
    // already started - ignore
  }
}

function stopListening() {
  state.listening = false;
  document.getElementById("btn-mic").classList.remove("listening");
  document.getElementById("mic-status").textContent = "Rok diya gaya";
  if (state.recognition) {
    try { state.recognition.stop(); } catch (e) {}
  }
}

document.getElementById("btn-mic").addEventListener("click", () => {
  if (state.listening) stopListening();
  else startListening();
});

function resetSurahProgress() {
  state.pages.forEach(page => page.ayahs.forEach(ayah => {
    if (ayah._wordStatus) ayah._wordStatus.fill(null);
  }));
  state.pageIndex = 0;
  state.ayahPtrInPage = 0;
  state.mistakeCount = 0;
  state.mistakes = [];
  updateMistakeUI();
  loadCurrentAyah();
}

document.getElementById("btn-restart").addEventListener("click", resetSurahProgress);

document.getElementById("btn-back").addEventListener("click", () => {
  stopListening();
  showScreen("screen-list");
});

// ---------- Boot ----------
initSplash();
