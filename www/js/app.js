/*
  app.js
  ------
  Teen screens ke beech navigation, Quran data download (splash),
  surah list + search, aur recitation screen (mic + speech match).

  IMPORTANT / IMAANDAARI KI BAAT:
  Speech recognition sirf "lafzi" (word-level) galti pakadti hai —
  yani agar aap koi lafz chhod dein, badal dein, ya order badal dein.
  Ye TAJWEED (makhraj, madd, ghunnah, qalqalah) ki ghaltiyan nahi pakad sakti,
  kyunki us ke liye khaas Quran-recitation par train kiya AI model chahiye,
  jo is basic app ke scope se bahar hai. Neeche wala matching sirf
  "kya sahi lafz bola gaya" check karta hai.
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

// ---------- App state ----------
const state = {
  surahList: [],
  currentSurah: null,   // {number, englishName, name, numberOfAyahs, ...}
  currentAyahs: [],     // [{number, text}]
  ayahIndex: 0,
  expectedWords: [],    // normalized words of current ayah
  matchPointer: 0,      // kitne expected words ab tak match ho chuke
  mistakeCount: 0,
  recognition: null,
  listening: false
};

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

// ---------- Recitation screen ----------
async function openSurah(surah) {
  state.currentSurah = surah;
  state.currentAyahs = await QuranAPI.fetchSurahText(surah.number);
  state.ayahIndex = 0;
  state.mistakeCount = 0;
  document.getElementById("recite-surah-name").textContent =
    `${surah.englishName} \u00b7 ${surah.name}`;
  document.getElementById("recite-ayah-count").textContent = `${surah.numberOfAyahs} Ayaat`;
  updateMistakeUI();
  loadCurrentAyah();
  showScreen("screen-recite");
}

function loadCurrentAyah() {
  const ayah = state.currentAyahs[state.ayahIndex];
  if (!ayah) {
    // Surah khatam
    document.getElementById("mic-status").textContent = "Mubarak ho, Surah mukammal hui!";
    stopListening();
    return;
  }
  state.expectedWords = splitWords(ayah.text);
  state.matchPointer = 0;
  document.getElementById("ayah-position").textContent =
    `Ayat ${ayah.number} / ${state.currentSurah.numberOfAyahs}`;
  renderAyahWords();
}

function renderAyahWords() {
  const ayah = state.currentAyahs[state.ayahIndex];
  const rawWords = ayah.text.split(" ");
  const container = document.getElementById("ayah-arabic");
  container.innerHTML = rawWords.map((w, i) => {
    let cls = "word";
    if (i < state.matchPointer) cls += " matched";
    else if (i === state.matchPointer) cls += " current";
    return `<span class="${cls}" data-idx="${i}">${w}</span>`;
  }).join(" ");
}

function markMistakeAt(idx) {
  const span = document.querySelector(`#ayah-arabic .word[data-idx="${idx}"]`);
  if (span) span.classList.add("mistake");
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

// ---------- Word matching ----------
function processSpokenText(spokenText) {
  const spokenWords = splitWords(spokenText);
  spokenWords.forEach(spokenWord => {
    if (state.matchPointer >= state.expectedWords.length) return; // ayah khatam ho chuki
    const expectedWord = state.expectedWords[state.matchPointer];
    if (spokenWord === expectedWord) {
      // sahi
    } else {
      state.mistakeCount++;
      updateMistakeUI();
      markMistakeAt(state.matchPointer);
      playAlertBeep();
    }
    state.matchPointer++;
  });
  renderAyahWords();

  if (state.matchPointer >= state.expectedWords.length) {
    setTimeout(() => {
      state.ayahIndex++;
      loadCurrentAyah();
    }, 700);
  }
}

// ---------- Speech recognition (Web Speech API) ----------
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
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    if (result.isFinal) {
      processSpokenText(result[0].transcript);
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
    // Agar user ne khud band nahi kiya, to dobara shuru kar dein
    // (mobile browsers thodi der baad khud rok dete hain)
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

document.getElementById("btn-restart").addEventListener("click", () => {
  state.ayahIndex = 0;
  state.mistakeCount = 0;
  updateMistakeUI();
  loadCurrentAyah();
});

document.getElementById("btn-back").addEventListener("click", () => {
  stopListening();
  showScreen("screen-list");
});

// ---------- Boot ----------
initSplash();
