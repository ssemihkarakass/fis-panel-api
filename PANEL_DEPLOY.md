# 🌐 WEB PANEL DEPLOY REHBERİ

## 🎯 EN KOLAY YÖNTEM: Vercel (Ücretsiz)

### ADIM 1: Vercel Hesabı Oluştur

1. **https://vercel.com** adresine git
2. **"Sign Up"** tıkla
3. **GitHub** ile giriş yap
4. ✅ Ücretsiz!

---

### ADIM 2: Panel Klasörünü GitHub'a Yükle

```powershell
# Terminal aç
cd "C:\Users\Semih\Desktop\Fiş Programı\backend-api\panel"

git init
git add .
git commit -m "Panel initial commit"
git branch -M main

# GitHub'da yeni repo oluştur: fis-panel-web
git remote add origin https://github.com/KULLANICI_ADIN/fis-panel-web.git
git push -u origin main
```

---

### ADIM 3: Vercel'e Deploy Et

#### Yöntem 1: Vercel Dashboard (Kolay)

1. **Vercel Dashboard** → **"Add New..."** → **"Project"**
2. **Import Git Repository** → `fis-panel-web` seç
3. **"Import"** tıkla

**Ayarlar:**
```
┌─────────────────────────────────────────┐
│  Configure Project                       │
├─────────────────────────────────────────┤
│                                          │
│  Project Name: [fis-panel-web]          │
│                                          │
│  Framework Preset: [Other]               │
│                                          │
│  Root Directory: [./]                    │
│                                          │
│  Build Command: [boş bırak]             │
│                                          │
│  Output Directory: [./]                  │
│                                          │
│  Install Command: [boş bırak]           │
│                                          │
│  [Deploy]  ← TIKLA                      │
│                                          │
└─────────────────────────────────────────┘
```

4. **"Deploy"** tıkla
5. ⏳ 1-2 dakika bekle
6. ✅ **Panel hazır!**

**URL:** `https://fis-panel-web.vercel.app`

---

#### Yöntem 2: Vercel CLI (Hızlı)

```powershell
# Vercel CLI yükle
npm install -g vercel

# Panel klasörüne git
cd "C:\Users\Semih\Desktop\Fiş Programı\backend-api\panel"

# Deploy et
vercel

# Sorular:
# Set up and deploy? Y
# Which scope? [Seç]
# Link to existing project? N
# Project name? fis-panel-web
# Directory? ./
# Override settings? N

# Production'a deploy
vercel --prod
```

✅ **Hazır!**

---

## 🔧 PANEL'İ API'YE BAĞLA

Panel deploy edildikten sonra, `app.js` dosyasını düzenle:

### ADIM 1: app.js Oluştur

Panel klasöründe `app.js` dosyası yoksa oluştur:

```javascript
// Panel JavaScript Kodu
const API_URL = 'https://fis-panel-api.onrender.com';

// Login fonksiyonu
async function login(username, password) {
    const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/dashboard.html';
    } else {
        alert('Giriş başarısız: ' + data.error);
    }
}

// Lisansları getir
async function getLicenses() {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/api/admin/licenses`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    const data = await response.json();
    return data.data;
}

// ... diğer fonksiyonlar
```

### ADIM 2: index.html'e Ekle

```html
<script src="app.js"></script>
```

---

## 🎯 SONUÇ

✅ **Backend API:** https://fis-panel-api.onrender.com
✅ **Web Panel:** https://fis-panel-web.vercel.app

---

## 🆘 HIZLI ÇÖZÜM: Render Static Site

Eğer Vercel kullanmak istemezsen, Render'da da deploy edebilirsin:

1. **Render Dashboard** → **"New +"** → **"Static Site"**
2. **GitHub repo:** `fis-panel-web`
3. **Publish directory:** `./`
4. **"Create Static Site"**

✅ **URL:** `https://fis-panel-web.onrender.com`

---

## 📱 PANEL GİRİŞ BİLGİLERİ

**Kullanıcı Adı:** `admin`
**Şifre:** `admin123`

⚠️ **İlk girişten sonra şifreyi değiştir!**

---

## ✅ TAMAMLANDI!

Artık panel'e giriş yapabilir, lisansları yönetebilirsin! 🎉
