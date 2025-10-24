# 🚀 RENDER.COM KURULUM KILAVUZU (TAMAMEN ÜCRETSIZ!)

## 📋 ADIM ADIM KURULUM

### 1. Render Hesabı Oluştur

1. **https://render.com** adresine git
2. **"Get Started for Free"** butonuna tıkla
3. GitHub ile giriş yap (veya email)
4. ✅ Kredi kartı istemiyor!

---

### 2. GitHub'a Yükle

```bash
# 1. GitHub'da yeni repo oluştur: "fis-panel-api"

# 2. Projeyi GitHub'a yükle
cd "C:\Users\Semih\Desktop\Fiş Programı\backend-api"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADIN/fis-panel-api.git
git push -u origin main
```

---

### 3. PostgreSQL Veritabanı Oluştur

1. Render Dashboard'a git
2. **"New +"** → **"PostgreSQL"** seç
3. Ayarlar:
   - **Name:** `fis-panel-db`
   - **Database:** `fis_panel`
   - **User:** `fis_user`
   - **Region:** `Frankfurt` (Türkiye'ye en yakın)
   - **Plan:** **Free** ✅
4. **"Create Database"** tıkla
5. ⏳ 2-3 dakika bekle

---

### 4. Veritabanı Tablolarını Oluştur

1. Database sayfasında **"Connect"** → **"External Connection"** tıkla
2. **PSQL Command** kopyala (şuna benzer):
   ```
   PGPASSWORD=xxx psql -h xxx.render.com -U fis_user fis_panel
   ```
3. Bilgisayarında terminalde çalıştır (PostgreSQL kurulu olmalı)
4. Veya **"Shell"** sekmesinden direkt çalıştır
5. `init-db.sql` dosyasının içeriğini yapıştır ve çalıştır

**PostgreSQL yoksa:**
- Windows: https://www.postgresql.org/download/windows/
- Veya Render Shell'den direkt çalıştır

---

### 5. Web Service Oluştur

1. Render Dashboard'a dön
2. **"New +"** → **"Web Service"** seç
3. GitHub reposunu bağla: `fis-panel-api`
4. Ayarlar:
   - **Name:** `fis-panel-api`
   - **Region:** `Frankfurt`
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server-postgres.js`
   - **Plan:** **Free** ✅

---

### 6. Environment Variables Ekle

**"Environment"** sekmesinde:

```
PORT=3000
JWT_SECRET=your_super_secret_key_change_this_123456789
NODE_ENV=production
```

**DATABASE_URL ekle:**
1. **"Add from Database"** tıkla
2. `fis-panel-db` seç
3. Otomatik eklenecek ✅

---

### 7. Deploy Et!

1. **"Create Web Service"** tıkla
2. ⏳ 5-10 dakika bekle (ilk deploy uzun sürer)
3. ✅ Deploy tamamlandı!

**URL'in:** `https://fis-panel-api.onrender.com`

---

## 🧪 TEST ET

### 1. Health Check

```bash
curl https://fis-panel-api.onrender.com/health
```

**Yanıt:**
```json
{
    "status": "healthy",
    "database": "connected"
}
```

### 2. Lisans Kontrolü

```bash
curl -X POST https://fis-panel-api.onrender.com/api/license/check \
  -H "Content-Type: application/json" \
  -d '{
    "license_key": "TEST-1234-5678-ABCD",
    "hardware_id": "test-123",
    "pc_name": "Test PC",
    "os_info": "Windows 11",
    "app_version": "1.0.0"
  }'
```

### 3. Panel Girişi

```bash
curl -X POST https://fis-panel-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

---

## 🔧 ELECTRON'A BAĞLA

`api-client.js` dosyasında:

```javascript
this.API_URL = 'https://fis-panel-api.onrender.com';
```

**Hepsi bu kadar!** ✅

---

## ⚠️ ÖNEMLİ NOTLAR

### Render Free Plan Özellikleri:

✅ **Avantajlar:**
- Tamamen ücretsiz
- PostgreSQL dahil
- Otomatik SSL
- 750 saat/ay (yeterli)

⚠️ **Dezavantajlar:**
- 15 dakika kullanılmazsa uyur
- İlk istek 30 saniye sürer (cold start)
- Sonraki istekler hızlı

### Cold Start Sorunu Çözümü:

**Cron-job.org** ile 10 dakikada bir ping at:

1. https://cron-job.org/en/ adresine git
2. Ücretsiz hesap oluştur
3. Yeni job ekle:
   - **URL:** `https://fis-panel-api.onrender.com/health`
   - **Schedule:** Her 10 dakika
4. ✅ Artık hiç uyumaz!

---

## 📊 MALIYET

| Özellik | Render Free | Ücretli Alternatif |
|---------|-------------|-------------------|
| **Backend API** | ✅ Ücretsiz | 7$/ay |
| **PostgreSQL** | ✅ Ücretsiz | 7$/ay |
| **SSL** | ✅ Ücretsiz | - |
| **Toplam** | **0 TL** | ~500 TL/ay |

---

## 🎯 SONUÇ

✅ **Tamamen ücretsiz**
✅ **Kredi kartı yok**
✅ **Sınırsız kullanım**
✅ **Profesyonel**

**Tek dezavantaj:** Cold start (cron-job ile çözülür)

---

## 🆘 SORUN GİDERME

### Deploy Hatası:

```bash
# Logları kontrol et
Render Dashboard → Logs sekmesi
```

### Veritabanı Bağlantı Hatası:

```bash
# DATABASE_URL doğru mu kontrol et
Render Dashboard → Environment → DATABASE_URL
```

### 500 Hatası:

```bash
# server-postgres.js dosyasını kontrol et
# PostgreSQL syntax farklı olabilir (MySQL değil!)
```

---

## 🚀 HAZIR!

Artık sisteminiz tamamen ücretsiz ve online! 🎉

**API URL:** `https://fis-panel-api.onrender.com`

Electron uygulamasında bu URL'i kullan ve çalışmaya başla! 💪
