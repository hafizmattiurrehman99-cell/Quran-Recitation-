# Tilawat Checker (APK version)

Ye app ab **website ke taur par nahi**, balki ek **installable Android APK**
ke taur par banti hai. Aap Termux se code push karte hain, aur GitHub
**automatically** APK build kar deta hai — koi Android Studio ya local build
tools ki zaroorat nahi.

## Yeh app kya karti hai, aur kya NAHI karti (zaroori)

✅ Karti hai:
- Poora Quran text (Uthmani script) pehli dafa internet se download karke phone mein save kar leti hai — uske baad **offline** chalti hai.
- Aapke phone ka microphone use karke tilawat sunti hai (Arabic speech recognition).
- Jo lafz aap bol rahe hain use surah ke asal lafz se compare karti hai, galat/chhoote lafz par beep bajati hai.

❌ Abhi NAHI karti (scope se bahar):
- **Tajweed** ki ghaltiyan (makhraj, madd, ghunnah, qalqalah) pakadna — is ke liye khaas recitation-trained AI model chahiye, jo bohot bada research project hai.
- 100% sahi Arabic speech recognition — kabhi kabhi galat alert ya missed mistake ho sakti hai.

---

## Project structure (naya)

```
quran-recitation-app/
├── www/                     ← poori website (HTML/CSS/JS) yahan hai
│   ├── index.html
│   ├── css/style.css
│   ├── js/app.js
│   └── js/quran-api.js
├── package.json             ← Capacitor dependencies
├── capacitor.config.json    ← app ka naam, ID, waghera
├── .github/workflows/
│   └── build-apk.yml        ← ye file auto-build karti hai
└── README.md
```

**Modification hamesha `www/` folder ke andar wali files mein karein** —
baaki sab sirf APK banane ki "machinery" hai, usse chhedne ki zaroorat nahi.

---

## Ek hi baar ka setup (agar pehli baar kar rahe hain)

Termux mein:
```bash
pkg update && pkg upgrade
pkg install git
```

Phir project folder mein jaakar (jahan `www`, `package.json` waghera hain):
```bash
git config --global --add safe.directory '*'
git init
git add .
git commit -m "APK version - Capacitor setup"
git branch -M main
git remote add origin https://github.com/hafizmattiurrehman99-cell/Quran-Recitation-.git
git push -u origin main
```

Bas itna karte hi **GitHub Actions khud-ba-khud APK banana shuru kar dega** —
kyunki `.github/workflows/build-apk.yml` file push hote hi GitHub use detect
kar leta hai aur chala deta hai.

---

## APK download kaise karein

1. Apne GitHub repository ko phone ke Chrome mein kholein:
   `https://github.com/hafizmattiurrehman99-cell/Quran-Recitation-`
2. Upar **"Actions"** tab par jaayein — dekhiye ek build chal rahi hai ya
   mukammal ho chuki hai (green tick ka matlab build kamyab hui).
   Build mein 3-5 minute lagte hain.
3. Build mukammal hone ke baad, repo ke right-side mein **"Releases"**
   section mein jaayein (ya seedha ye link kholein:
   `https://github.com/hafizmattiurrehman99-cell/Quran-Recitation-/releases`)
4. Wahan **"Latest Build"** release milegi, uske neeche `app-debug.apk`
   file par tap karein — download shuru ho jayega.
5. Download hone ke baad file ko open karein — Android "Unknown sources /
   Install unknown apps" ki permission maangega, us specific app (Chrome ya
   Files) ke liye ijazat dein, phir **Install** dabayein.

---

## Aage koi modification karni ho to

Sirf `www/` folder ke andar files edit karein, phir:
```bash
git add .
git commit -m "modification ka description yahan likhein"
git push
```
Bas — push hote hi naya APK khud-ba-khud ban kar "Latest Build" release mein
update ho jayega. Har baar naya link banane ki zaroorat nahi, wahi ek release
har baar refresh hoti rahegi.

---

## Agar build fail ho jaye

**Actions** tab mein us build par tap karein, jo step laal dikhe uska
"log" khol kar error dekh sakte hain, ya screenshot yahan bhej dein — main
madad kar dunga.

## Naya update: behtar matching + naya design + app icon

- **Bug fix:** Pehle agar tilawat ke beech mein koi lafz CHHOOT jata tha, to
  us ke baad ke saare lafz galat compare ho kar galat jagah "mistake" dikhate
  the. Ab ek "alignment" algorithm lagaya hai jo chhoote hue lafz, badle hue
  lafz aur sahi lafz — teeno ko sahi tarah pehchanta hai.
- **Naya design:** Surah list, recitation screen aur splash screen ka layout
  behtar banaya gaya hai (Islamic green/gold theme, saaf typography, achi
  spacing).
- **App icon:** `resources/` folder mein ek pyara sa icon (khula hua Quran +
  chaand-taara, green/gold) rakha gaya hai. Build ke waqt
  `@capacitor/assets` tool khud-ba-khud is se Android ke tamam sizes
  (launcher icon, adaptive icon, splash screen) generate kar deta hai —
  aapko kuch manually karne ki zaroorat nahi.
  Agar icon badalna ho, bas `resources/icon.png`,
  `resources/icon-foreground.png`, `resources/icon-background.png` ko
  replace karke push kar dein — agli build mein naya icon aa jayega.

## Naya update #2: page-jaisa layout + naye colors + clickable mistakes list

- **Matching aur behtar hui:** Alignment algorithm ko refine kiya hai taake
  skip/wrong dono tarah ki galtiyan aur bhi reliably pakdi jayein.
- **Page-jaisa layout:** Ab screen par ek akeli ayat dikha kar agli pe jaane
  ki bajaye, poora Mushaf "page" (jaisa alquran.cloud ke 604-page standard
  mein hota hai) continuous text ki tarah dikhta hai — jaisे asal Quran ka
  page hota hai, har ayat ke aakhir mein ek chhota gol number bhi hai.
  **Imaandari ki baat:** Indo-Pak wale 16-line Mushaf ki exact line-by-line
  taqseem ka koi free/reliable data source maujood nahi hai, is liye line
  count 100% match nahi karega — sirf "poore page jaisa ehsaas" hai.
- **Naye colors:** Jo lafz sahi bola jaye wo ab **yellow/gold** ho jata hai.
  Jo lafz CHHOOT jaye wo **"dead"** (grey, katà hua/strikethrough) ho jata
  hai. Jo lafz GALAT bola jaye wo pehle jaisa laal/wavy underline rehta hai.
- **Clickable mistakes list:** "Galtiyan" ab ek button hai — tap karne par
  neeche se ek list khulti hai jisme har ghalti ka lafz, us ki ayat number,
  aur type (chhoota ya galat bola gaya) saaf dikhta hai.

## Naya update #3: real-time matching + page navigation + simple colors

- **Real-time matching:** Pehle mistake sirf poori ayat padhne ke BAAD pata
  chalti thi (mobile browser "final" result dair se deta hai). Ab
  "interim" (jaari) results bhi use karte hain, taake har lafz bolte hi
  turant check ho — bina wajah ki dair nahi hogi.
- **Page navigation:** Ab recitation screen par ⟵ / ⟶ buttons hain jin se
  aap Mushaf ke page manually aage-peeche bhi navigate kar sakte hain
  (recitation progress se alag, sirf dekhne ke liye).
- **Colors simple kiye:** Sahi lafz = **yellow/gold**. Ghalti (chahe lafz
  chhoot jaye ya galat bola jaye) = **red** (dono ek hi rang mein, bas
  underline vs strikethrough se thoda farq).

## Naya update #4: matching tolerance, Para/Sipara section, Tarjuma

- **Ek zaroori baat (imaandari se):** Koi bhi doosri app (Tarteel, Itqan AI,
  waghera) ki files ya recognition model copy karna copyright violation
  hoga, is liye wo NAHI kiya gaya. Un apps ka behtareen recognition unke
  khud ke saalon ke khaas Quran-trained AI model ki wajah se hai — ye app
  free browser Web Speech API par chalti hai, jiski apni had hai.
- **Matching tolerance:** Ab lafz ka "kareebi match" (chhoti spelling ka
  farq maaf) accept hota hai, taake sahi bola gaya lafz browser ki chhoti
  ghalti ki wajah se galat na dikhe. 100% perfect nahi hoga (koi bhi free
  recognizer nahi hota), lekin pehle se behtar.
- **Swipe se page badlna:** Ab page ko button ke sath-sath ungli se swipe
  kar ke bhi aage-peeche badal sakte hain.
- **Para (Sipara) section:** List screen par ab "Surah" aur "Para" do tabs
  hain — 30 Paron mein se koi bhi chun kar seedha recite kar sakte hain.
- **Tarjuma section:** Recitation screen par "Tarjuma dekhein" button se
  Urdu (Jalandhry) aur English (Sahih International) tarjuma dikhta hai.
  Ye pehli baar internet se lagta hai (per surah), phir cache ho jata hai.
  **Note:** Para (Sipara) mode mein tarjuma abhi available nahi hai, sirf
  Surah mode mein hai.

## Aage kya modify kar sakte hain
- Tajweed rules ka basic pattern-matching add karna.
- Har surah ke liye progress/history save karna.
- App ka naam customize karna (capacitor.config.json mein).
- Alag Qira'at (recitation styles) ke liye alag text editions.
