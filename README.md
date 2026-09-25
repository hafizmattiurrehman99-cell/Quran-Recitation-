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

## Aage kya modify kar sakte hain
- Tajweed rules ka basic pattern-matching add karna.
- Har surah ke liye progress/history save karna.
- App ka icon aur naam customize karna (capacitor.config.json mein).
- Alag Qira'at (recitation styles) ke liye alag text editions.
