# 🎯 YENİ ÖZELLİKLER - GÜNCELLENDİ

## ✅ EKLENEN ÖZELLİKLER

### 1. **Maksimum Cihaz Sayısı Ayarlanabilir** 🖥️

Artık her lisans için farklı cihaz limiti belirleyebilirsin:

- **1 Cihaz** (Standart)
- **3 Cihaz** (Küçük işletme)
- **5 Cihaz** (Orta işletme)
- **10 Cihaz** (Büyük işletme)
- **Sınırsız** (999 olarak ayarla)

#### Panel'den Kullanım:

```javascript
// Yeni lisans oluştururken
{
    "company_name": "Ahmet Market",
    "days": 365,
    "max_devices": 3  // 3 cihaz izni
}

// Mevcut lisansı güncellerken
PUT /api/admin/licenses/123
{
    "action": "set_max_devices",
    "max_devices": 5  // 5 cihaza çıkar
}
```

#### Nasıl Çalışır:

1. Müşteri ilk PC'de lisansı aktive eder
2. İkinci PC'de aynı lisansı kullanmaya çalışır
3. Sistem kontrol eder:
   - Eğer limit dolmadıysa → İzin verir
   - Eğer limit dolduysa → "Maksimum cihaz limitine ulaşıldı" hatası

#### Hata Mesajı:

```json
{
    "success": false,
    "error": "Maksimum cihaz limitine ulaşıldı (3 cihaz)",
    "status": "device_limit_reached",
    "max_devices": 3,
    "current_devices": 3
}
```

---

### 2. **Offline Süre 30 Güne Çıkarıldı** 📴

Artık internet olmadan **30 gün** çalışabilir!

#### Önceki Durum:
- ❌ 7 gün offline çalışma
- ❌ Kısa süre

#### Yeni Durum:
- ✅ 30 gün offline çalışma
- ✅ Uzun süre güvenlik

#### Nasıl Çalışır:

1. **İnternet varken:**
   - 24 saatte bir lisans kontrolü
   - Fişler anında API'ye gönderilir

2. **İnternet kesilince:**
   - Offline mode'a geçer
   - 30 gün boyunca çalışmaya devam eder
   - Fişler offline queue'ya eklenir
   - Cache'den lisans bilgisi okunur

3. **İnternet gelince:**
   - Otomatik online mode'a döner
   - Queue'daki tüm fişler senkronize edilir
   - Lisans yeniden kontrol edilir

#### Kod:

```javascript
// api-client.js
this.OFFLINE_GRACE_PERIOD = 30 * 24 * 60 * 60 * 1000; // 30 gün
```

---

### 3. **Excel'de Detaylı Fiş Bilgileri** 📊

Artık Excel'de **her şeyi** görebilirsin!

#### Excel Kolonları:

| Kolon | Açıklama |
|-------|----------|
| **Fiş ID** | Benzersiz fiş numarası |
| **Yazdırma Zamanı** | Tam tarih ve saat |
| **Tarih** | Fiş tarihi |
| **Fiş No** | Fiş numarası |
| **Firma Adı** | Hangi firmaya kesildi |
| **Tutar (TL)** | Toplam tutar |
| **KDV Oranı (%)** | KDV yüzdesi |
| **KDV Tutarı (TL)** | KDV tutarı |
| **Açıklama** | Ürün açıklaması |
| **Kasiyer** | Hangi kasiyer kesti |
| **Şablon** | Hangi şablon kullanıldı |
| **Lisans Anahtarı** | Hangi lisans |
| **Lisans Sahibi** | Lisans sahibi firma |
| **PC Adı** | Hangi bilgisayar |
| **Donanım ID** | PC'nin donanım ID'si |
| **İşletim Sistemi** | Windows 11, vb. |

#### API Endpoint:

```
GET /api/admin/receipts/export?start_date=2024-01-01&end_date=2024-12-31
```

#### Örnek Yanıt:

```json
{
    "success": true,
    "data": [
        {
            "Fiş ID": 1234,
            "Yazdırma Zamanı": "24.10.2024 20:45:32",
            "Tarih": "2024-10-24",
            "Fiş No": "00125",
            "Firma Adı": "SIMKIRTASIYE",
            "Tutar (TL)": "150.00",
            "KDV Oranı (%)": 20,
            "KDV Tutarı (TL)": "25.00",
            "Açıklama": "İÇECEK",
            "Kasiyer": "KASİYER 2",
            "Şablon": "carrefour",
            "Lisans Anahtarı": "A1B2-C3D4-E5F6-G7H8",
            "Lisans Sahibi": "Ahmet Market",
            "PC Adı": "KASA-01",
            "Donanım ID": "abc123def456...",
            "İşletim Sistemi": "Windows 11 Pro"
        }
    ]
}
```

---

## 🎯 PANEL'DEN KULLANIM

### Cihaz Sayısını Değiştirme:

1. Panel'e giriş yap
2. **Lisanslar** sayfasına git
3. Lisansa tıkla
4. **"Cihaz Sayısını Değiştir"** butonuna tıkla
5. Yeni sayıyı gir (1, 3, 5, 10, vb.)
6. **Kaydet**

### Excel'e Aktarma:

1. Panel'e giriş yap
2. **Fişler** sayfasına git
3. Tarih aralığını seç
4. **"Excel'e Aktar"** butonuna tıkla
5. Dosya indirilir (tüm detaylarla)

---

## 📋 API KULLANIM ÖRNEKLERİ

### 1. Cihaz Sayısını Güncelle

```bash
curl -X PUT https://api.yoursite.com/api/admin/licenses/123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "set_max_devices",
    "max_devices": 5
  }'
```

### 2. Gün Ekle

```bash
curl -X PUT https://api.yoursite.com/api/admin/licenses/123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add_days",
    "days": 365
  }'
```

### 3. Excel Export

```bash
curl -X GET "https://api.yoursite.com/api/admin/receipts/export?start_date=2024-01-01&end_date=2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔄 GÜNCELLEME ADIMLARI

### Backend Güncelleme:

```bash
cd backend-api
# server.js dosyası zaten güncellenmiş durumda
node server.js
```

### Electron Güncelleme:

```bash
cd akyıldız
# api-client.js dosyası zaten güncellenmiş durumda
# Uygulamayı yeniden başlat
```

---

## ✅ TEST SENARYOLARI

### Test 1: Cihaz Limiti

1. Lisans oluştur (max_devices: 2)
2. İlk PC'de aktive et → ✅ Başarılı
3. İkinci PC'de aktive et → ✅ Başarılı
4. Üçüncü PC'de aktive et → ❌ "Limit doldu" hatası

### Test 2: Offline Mode

1. İnternet bağlantısını kes
2. Fiş yazdır → ✅ Çalışıyor
3. 30 gün bekle → ✅ Hala çalışıyor
4. 31. gün → ❌ "Offline cache geçersiz" hatası
5. İnternet bağla → ✅ Otomatik senkronize

### Test 3: Excel Export

1. Panel'e giriş yap
2. Fişler → Excel'e Aktar
3. İndirilen dosyayı aç
4. Tüm kolonları kontrol et → ✅ Hepsi var

---

## 🎁 BONUS ÖZELLİKLER

- ✅ **Cihaz Listesi:** Hangi PC'lerde aktif görebilirsin
- ✅ **Son Görülme:** Her PC'nin son online zamanı
- ✅ **Otomatik Senkronizasyon:** İnternet gelince queue boşalır
- ✅ **Activity Log:** Her işlem kaydedilir
- ✅ **Güvenli:** JWT + Bcrypt + HTTPS

---

## 📊 ÖZET

| Özellik | Önceki | Yeni |
|---------|--------|------|
| **Offline Süre** | 7 gün | **30 gün** ✅ |
| **Cihaz Sayısı** | Sabit 1 | **Ayarlanabilir (1-999)** ✅ |
| **Excel Detay** | Basit | **16 kolon detay** ✅ |

**Artık sistem tam profesyonel! 🚀**
