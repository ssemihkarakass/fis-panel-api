# 🚀 BACKEND API KURULUM KILAVUZU

## 📋 GEREKLİ YAZILIMLAR

1. **Node.js** (v16 veya üzeri)
2. **MySQL** veya **PostgreSQL**
3. **npm** veya **yarn**

---

## ⚙️ KURULUM ADIMLARI

### 1. Bağımlılıkları Yükle

```bash
cd backend-api
npm install express cors mysql2 bcrypt jsonwebtoken dotenv
```

### 2. MySQL Veritabanı Oluştur

```sql
CREATE DATABASE fis_panel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fis_panel;

-- Tabloları oluştur (server.js içindeki SQL kodlarını çalıştır)
```

### 3. İlk Admin Kullanıcısı Oluştur

```sql
-- Şifre: admin123 (değiştirmeyi unutma!)
INSERT INTO admin_users (username, password_hash, email, role) 
VALUES ('admin', '$2b$10$rZ5qX8vK9YxH3nF2wL4zOeJ8vK9YxH3nF2wL4zOeJ8vK9YxH3nF2w', 'admin@example.com', 'admin');
```

### 4. Sunucuyu Başlat

```bash
node server.js
```

Sunucu şu adreste çalışacak: `http://localhost:3000`

---

## 🔒 GÜVENLİK AYARLARI

### `.env` Dosyası Oluştur

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=fis_panel
JWT_SECRET=your_super_secret_key_change_this_123456789
```

### `server.js` içinde `.env` kullan

```javascript
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    // ...
});

const JWT_SECRET = process.env.JWT_SECRET;
```

---

## 🌐 PRODUCTION'A ALMA

### 1. VPS/Sunucu Kiralama

- **DigitalOcean** (5$/ay)
- **Hetzner** (4€/ay)
- **AWS EC2** (Free Tier)

### 2. Domain Alma

- **example.com** → API için
- **panel.example.com** → Web panel için

### 3. SSL Sertifikası (Let's Encrypt - Ücretsiz)

```bash
sudo apt install certbot
sudo certbot --nginx -d api.example.com
```

### 4. Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. PM2 ile Sürekli Çalıştır

```bash
npm install -g pm2
pm2 start server.js --name fis-api
pm2 startup
pm2 save
```

---

## 📊 TEST ETME

### Lisans Kontrolü

```bash
curl -X POST http://localhost:3000/api/license/check \
  -H "Content-Type: application/json" \
  -d '{
    "license_key": "XXXX-XXXX-XXXX-XXXX",
    "hardware_id": "test-hardware-123",
    "pc_name": "Test PC",
    "os_info": "Windows 11",
    "app_version": "1.0.0"
  }'
```

### Panel Girişi

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

---

## 🎯 SONRAKİ ADIMLAR

1. ✅ Web Panel (HTML/CSS/JS) oluştur
2. ✅ Electron entegrasyonu
3. ✅ Offline mode cache sistemi
4. ✅ Otomatik yedekleme
