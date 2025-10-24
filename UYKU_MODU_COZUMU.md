# 🔔 RENDER UYKU MODU ÇÖZÜMÜ (ÜCRETSIZ)

## ⚠️ SORUN

Render Free Plan'da servis 15 dakika kullanılmazsa uyur.
İlk istek geldiğinde uyanması 30 saniye sürer.

## ✅ ÇÖZÜM: Cron-job.org (Ücretsiz Ping Servisi)

### ADIM 1: Cron-job.org Hesabı Oluştur

1. **https://cron-job.org/en/** adresine git
2. **"Sign up"** tıkla
3. Email ile ücretsiz hesap oluştur
4. Email'ini onayla

---

### ADIM 2: Yeni Cron Job Oluştur

1. Dashboard'da **"Create cronjob"** tıkla

#### Ayarlar:

```
┌─────────────────────────────────────────┐
│  Create new cronjob                      │
├─────────────────────────────────────────┤
│                                          │
│  Title:                                  │
│  [Render Keep Alive - Fis Panel]        │
│                                          │
│  Address (URL):                          │
│  [https://fis-panel-api.onrender.com/health] │
│                                          │
│  Schedule:                               │
│    ● Every 10 minutes                    │
│                                          │
│  Or custom:                              │
│    Minute: */10                          │
│    Hour: *                               │
│    Day: *                                │
│    Month: *                              │
│    Weekday: *                            │
│                                          │
│  Request method:                         │
│    ● GET                                 │
│                                          │
│  [Create cronjob]                        │
│                                          │
└─────────────────────────────────────────┘
```

2. **"Create cronjob"** tıkla

---

### ADIM 3: Test Et

1. Cron job oluşturulduktan sonra **"Run now"** tıkla
2. **"Execution history"** sekmesinde sonucu gör
3. ✅ Status: 200 OK görmelisin

---

## 🎯 SONUÇ

✅ Her 10 dakikada bir `/health` endpoint'ine ping atar
✅ Render servisi hiç uyumaz
✅ Her zaman hızlı yanıt verir
✅ Tamamen ücretsiz

---

## 📊 AYARLAR ÖZETİ

| Ayar | Değer |
|------|-------|
| **URL** | https://fis-panel-api.onrender.com/health |
| **Sıklık** | Her 10 dakika |
| **Method** | GET |
| **Timeout** | 30 saniye |

---

## ⚡ ALTERNATİF ÇÖZÜMLER

### 1. UptimeRobot (Ücretsiz)
- https://uptimerobot.com
- Her 5 dakikada ping
- Email bildirimleri

### 2. BetterUptime (Ücretsiz)
- https://betteruptime.com
- Monitoring + Ping
- Slack entegrasyonu

### 3. Kendi Cron'un (Bilgisayarında)
```bash
# Windows Task Scheduler
# Her 10 dakikada:
curl https://fis-panel-api.onrender.com/health
```

---

## ✅ BAŞARILI!

Artık Render servisi **hiç uyumayacak!** 🎉
