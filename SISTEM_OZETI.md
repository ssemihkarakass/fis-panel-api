# 🚀 FİŞ YÖNETİM SİSTEMİ - KAPSAMLI DÖKÜMANTASYON

## 📊 SİSTEM ÖZETİ

### ✅ TAMAMLANAN ÖZELLİKLER

#### 1. **Backend API (Node.js + MySQL)**
- ✅ Lisans yönetimi (oluştur, kontrol, güncelle, askıya al)
- ✅ Kullanıcı (PC) takibi
- ✅ Fiş kayıt sistemi
- ✅ Günlük istatistikler
- ✅ JWT tabanlı kimlik doğrulama
- ✅ Activity log sistemi
- ✅ Excel export API

#### 2. **Electron Entegrasyonu**
- ✅ Offline çalışma desteği (7 gün cache)
- ✅ Otomatik lisans kontrolü (24 saatte bir)
- ✅ Offline queue sistemi (internet gelince senkronize)
- ✅ Donanım ID oluşturma
- ✅ PC bilgileri toplama

#### 3. **Web Panel (Dashboard)**
- ✅ Modern ve responsive tasarım
- ✅ Lisans yönetimi arayüzü
- ✅ Kullanıcı listesi
- ✅ Fiş geçmişi
- ✅ İstatistik grafikleri
- ✅ Excel export
- ✅ Filtreleme sistemi

---

## 🔧 KURULUM REHBERİ

### 1. Backend Kurulumu

```bash
# Bağımlılıkları yükle
cd backend-api
npm install express cors mysql2 bcrypt jsonwebtoken dotenv

# MySQL veritabanını oluştur
mysql -u root -p
CREATE DATABASE fis_panel;
USE fis_panel;

# Tabloları oluştur (server.js içindeki SQL'leri çalıştır)

# Sunucuyu başlat
node server.js
```

### 2. Electron Entegrasyonu

`index.html` dosyasına ekle:

```html
<script src="api-client.js"></script>
```

`main.js` dosyasına ekle:

```javascript
const { contextBridge } = require('electron');
const os = require('os');

contextBridge.exposeInMainWorld('electronAPI', {
    getHardwareId: async () => {
        // Donanım ID oluştur
        const cpus = os.cpus();
        const networkInterfaces = os.networkInterfaces();
        let hardwareString = cpus[0].model + cpus[0].speed;
        
        for (const name of Object.keys(networkInterfaces)) {
            for (const iface of networkInterfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    hardwareString += iface.mac;
                    break;
                }
            }
        }
        
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(hardwareString).digest('hex');
    },
    
    getPCName: () => os.hostname(),
    getOSInfo: () => `${os.type()} ${os.release()}`
});
```

### 3. Fiş Yazdırma Entegrasyonu

`script.js` içinde yazdırma fonksiyonuna ekle:

```javascript
// Fiş yazdırıldığında API'ye gönder
async function yazdirFis() {
    // ... mevcut yazdırma kodu ...
    
    // API'ye kaydet
    await window.apiClient.logReceipt({
        company_name: firmaData.firmaAdi,
        receipt_no: fisNo,
        amount: toplam,
        vat_rate: kdvOrani,
        vat_amount: kdvTutari,
        description: aciklama,
        cashier: kasiyerAdi,
        template: secilenSablon
    });
}
```

---

## 🌐 PRODUCTION'A ALMA

### 1. VPS Kiralama

**Önerilen Sağlayıcılar:**
- **Hetzner** (4€/ay) - En ucuz
- **DigitalOcean** (5$/ay) - Kolay kullanım
- **AWS EC2** (Free Tier) - İlk yıl ücretsiz

### 2. Sunucu Kurulumu

```bash
# Ubuntu 22.04 LTS
sudo apt update
sudo apt install -y nodejs npm mysql-server nginx certbot python3-certbot-nginx

# MySQL güvenlik
sudo mysql_secure_installation

# Veritabanı oluştur
sudo mysql -u root -p
CREATE DATABASE fis_panel;
CREATE USER 'fis_user'@'localhost' IDENTIFIED BY 'güçlü_şifre';
GRANT ALL PRIVILEGES ON fis_panel.* TO 'fis_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Proje dosyalarını yükle
cd /var/www
git clone your-repo.git fis-api
cd fis-api
npm install

# PM2 ile sürekli çalıştır
sudo npm install -g pm2
pm2 start server.js --name fis-api
pm2 startup
pm2 save
```

### 3. Domain ve SSL

```bash
# Domain ayarla (A kaydı)
# api.yoursite.com -> Sunucu IP

# SSL sertifikası
sudo certbot --nginx -d api.yoursite.com
```

### 4. Nginx Yapılandırması

```nginx
# /etc/nginx/sites-available/fis-api
server {
    listen 80;
    server_name api.yoursite.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yoursite.com;

    ssl_certificate /etc/letsencrypt/live/api.yoursite.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yoursite.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/fis-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 📱 KULLANIM SENARYOLARı

### Senaryo 1: Yeni Müşteri

1. **Panel'den yeni lisans oluştur**
   - Şirket adı: "Ahmet Market"
   - Süre: 365 gün
   - Max cihaz: 1

2. **Lisans anahtarını müşteriye gönder**
   - Örnek: `A1B2-C3D4-E5F6-G7H8`

3. **Müşteri Electron uygulamasına girer**
   - İlk açılışta lisans ister
   - Anahtarı girer
   - Donanım ID otomatik oluşturulur
   - Lisans aktive olur

4. **Müşteri fiş yazdırır**
   - Her fiş otomatik API'ye kaydedilir
   - Panel'den canlı takip edilir

### Senaryo 2: Lisans Uzatma

1. **Panel'de lisansı bul**
2. **"+ Gün Ekle" butonuna tıkla**
3. **Gün sayısını gir (örn: 365)**
4. **Kaydet**
5. **Müşterinin uygulaması otomatik güncellenir**

### Senaryo 3: Offline Çalışma

1. **Müşterinin interneti kesilir**
2. **Uygulama offline mode'a geçer**
3. **7 gün boyunca çalışmaya devam eder**
4. **Fişler offline queue'ya eklenir**
5. **İnternet gelince otomatik senkronize olur**

---

## 📊 PANEL ÖZELLİKLERİ

### Dashboard
- Toplam lisans sayısı
- Aktif lisans sayısı
- Online kullanıcı sayısı
- Günlük/Aylık fiş sayısı
- Günlük/Aylık ciro
- Grafikler (son 7 gün)
- Son aktiviteler

### Lisans Yönetimi
- Yeni lisans oluşturma
- Lisans detayları görüntüleme
- Gün ekleme/çıkarma
- Askıya alma/Aktifleştirme
- Lisans silme
- Notlar ekleme

### Kullanıcı Takibi
- Aktif PC'leri görme
- Son görülme zamanı
- Toplam fiş sayısı
- Toplam ciro
- Online/Offline durumu

### Fiş Geçmişi
- Tüm fişleri listeleme
- Tarih filtresi
- Lisans filtresi
- Excel'e aktarma
- Detaylı arama

### İstatistikler
- Günlük/Haftalık/Aylık grafikler
- Şirket bazlı dağılım
- Kasiyer bazlı dağılım
- KDV raporları

---

## 🔒 GÜVENLİK

### API Güvenliği
- ✅ JWT token tabanlı kimlik doğrulama
- ✅ Bcrypt ile şifre hashleme
- ✅ HTTPS zorunlu
- ✅ Rate limiting (opsiyonel)
- ✅ SQL injection koruması (prepared statements)

### Lisans Güvenliği
- ✅ Donanım ID ile bağlama
- ✅ Maksimum cihaz limiti
- ✅ Süre kontrolü
- ✅ Askıya alma özelliği
- ✅ Activity log

---

## 💰 FİYATLANDIRMA ÖNERİSİ

### Müşteriye Satış
- **Aylık:** 500 TL/ay
- **Yıllık:** 5.000 TL/yıl (2 ay bedava)
- **Kurulum:** 1.000 TL (tek seferlik)

### Maliyetler
- **VPS:** 150 TL/ay (Hetzner)
- **Domain:** 100 TL/yıl
- **SSL:** Ücretsiz (Let's Encrypt)
- **Toplam:** ~200 TL/ay

### Kar Marjı
- 10 müşteri = 5.000 TL/ay gelir
- Maliyet = 200 TL/ay
- **Net Kar:** 4.800 TL/ay

---

## 🎯 SONRAKİ ADIMLAR

### Kısa Vadeli (1 Hafta)
1. ✅ Backend API'yi test et
2. ✅ Electron entegrasyonunu tamamla
3. ✅ Web panel'i tamamla
4. ⏳ Production sunucusuna deploy et
5. ⏳ İlk müşteriyle test et

### Orta Vadeli (1 Ay)
1. ⏳ Mobil uygulama (React Native)
2. ⏳ E-posta bildirimleri
3. ⏳ WhatsApp entegrasyonu
4. ⏳ Otomatik yedekleme
5. ⏳ Multi-language desteği

### Uzun Vadeli (3 Ay)
1. ⏳ AI tabanlı satış tahminleri
2. ⏳ Stok yönetimi entegrasyonu
3. ⏳ Muhasebe yazılımı entegrasyonu
4. ⏳ Franchise sistemi
5. ⏳ White-label çözümü

---

## 📞 DESTEK

Herhangi bir sorun olursa:
1. Backend loglarını kontrol et: `pm2 logs fis-api`
2. Veritabanı bağlantısını test et
3. API endpoint'lerini Postman ile test et
4. Electron console'u kontrol et

**Başarılar! 🚀**
