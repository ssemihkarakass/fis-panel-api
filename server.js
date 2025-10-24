// ===================================
// BACKEND API SERVER - MAIN FILE
// ===================================

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'YOUR_SECRET_KEY_CHANGE_THIS'; // ÖNEMLİ: Bunu değiştir!

// Middleware
app.use(cors());
app.use(express.json());

// MySQL Bağlantı Havuzu
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'your_password',
    database: 'fis_panel',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ===================================
// YARDIMCI FONKSİYONLAR
// ===================================

// JWT Token Doğrulama Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token gerekli' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Geçersiz token' });
        req.user = user;
        next();
    });
}

// Lisans anahtarı oluştur
function generateLicenseKey() {
    const part1 = crypto.randomBytes(4).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(4).toString('hex').toUpperCase();
    const part3 = crypto.randomBytes(4).toString('hex').toUpperCase();
    const part4 = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${part1}-${part2}-${part3}-${part4}`;
}

// ===================================
// LİSANS API ENDPOINTS
// ===================================

// Lisans Kontrolü (Electron'dan çağrılır)
app.post('/api/license/check', async (req, res) => {
    try {
        const { license_key, hardware_id, pc_name, os_info, app_version } = req.body;

        if (!license_key || !hardware_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'Lisans anahtarı ve donanım ID gerekli' 
            });
        }

        const [licenses] = await pool.query(
            'SELECT * FROM licenses WHERE license_key = ?',
            [license_key]
        );

        if (licenses.length === 0) {
            return res.json({ 
                success: false, 
                error: 'Geçersiz lisans anahtarı',
                status: 'invalid'
            });
        }

        const license = licenses[0];

        // Lisans durumu kontrolü
        if (license.status === 'suspended') {
            return res.json({ 
                success: false, 
                error: 'Lisans askıya alınmış',
                status: 'suspended'
            });
        }

        // Süre kontrolü
        const now = new Date();
        const expiresAt = new Date(license.expires_at);
        const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

        if (daysRemaining <= 0) {
            await pool.query(
                'UPDATE licenses SET status = ? WHERE id = ?',
                ['expired', license.id]
            );
            return res.json({ 
                success: false, 
                error: 'Lisans süresi dolmuş',
                status: 'expired',
                days_remaining: 0
            });
        }

        // Kullanıcı kaydı güncelle veya oluştur
        const [users] = await pool.query(
            'SELECT * FROM users WHERE hardware_id = ?',
            [hardware_id]
        );

        let userId;
        if (users.length === 0) {
            // Yeni kullanıcı - önce cihaz limitini kontrol et
            const [deviceCount] = await pool.query(
                'SELECT COUNT(*) as count FROM users WHERE license_id = ?',
                [license.id]
            );

            if (deviceCount[0].count >= license.max_devices) {
                return res.json({
                    success: false,
                    error: `Maksimum cihaz limitine ulaşıldı (${license.max_devices} cihaz)`,
                    status: 'device_limit_reached',
                    max_devices: license.max_devices,
                    current_devices: deviceCount[0].count
                });
            }

            // Yeni kullanıcı ekle
            const [result] = await pool.query(
                `INSERT INTO users (license_id, hardware_id, pc_name, os_info, app_version, last_seen, is_online) 
                 VALUES (?, ?, ?, ?, ?, NOW(), TRUE)`,
                [license.id, hardware_id, pc_name, os_info, app_version]
            );
            userId = result.insertId;
        } else {
            // Mevcut kullanıcı güncelle
            userId = users[0].id;
            await pool.query(
                `UPDATE users SET last_seen = NOW(), is_online = TRUE, pc_name = ?, os_info = ?, app_version = ? 
                 WHERE id = ?`,
                [pc_name, os_info, app_version, userId]
            );
        }

        // Lisans son kontrol zamanını güncelle
        await pool.query(
            'UPDATE licenses SET last_check = NOW(), days_remaining = ? WHERE id = ?',
            [daysRemaining, license.id]
        );

        // Aktivite logu
        await pool.query(
            'INSERT INTO activity_logs (license_id, user_id, action, details) VALUES (?, ?, ?, ?)',
            [license.id, userId, 'license_check', `PC: ${pc_name}, OS: ${os_info}`]
        );

        res.json({
            success: true,
            status: 'active',
            days_remaining: daysRemaining,
            expires_at: license.expires_at,
            company_name: license.company_name,
            user_id: userId
        });

    } catch (error) {
        console.error('Lisans kontrol hatası:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Sunucu hatası',
            offline_mode: true // Offline modda çalışabilir
        });
    }
});

// ===================================
// FİŞ KAYIT API
// ===================================

// Fiş Kaydı (Electron'dan çağrılır)
app.post('/api/receipt/log', async (req, res) => {
    try {
        const { 
            license_key, 
            hardware_id, 
            company_name, 
            receipt_no, 
            amount, 
            vat_rate, 
            vat_amount, 
            description, 
            cashier, 
            template 
        } = req.body;

        // Lisans ve kullanıcı kontrolü
        const [licenses] = await pool.query(
            'SELECT id FROM licenses WHERE license_key = ? AND status = "active"',
            [license_key]
        );

        if (licenses.length === 0) {
            return res.status(403).json({ success: false, error: 'Geçersiz lisans' });
        }

        const [users] = await pool.query(
            'SELECT id FROM users WHERE hardware_id = ?',
            [hardware_id]
        );

        if (users.length === 0) {
            return res.status(403).json({ success: false, error: 'Kullanıcı bulunamadı' });
        }

        const licenseId = licenses[0].id;
        const userId = users[0].id;

        // Fiş kaydı
        await pool.query(
            `INSERT INTO receipts 
             (user_id, license_id, company_name, receipt_no, amount, vat_rate, vat_amount, description, cashier, template, date_printed) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())`,
            [userId, licenseId, company_name, receipt_no, amount, vat_rate, vat_amount, description, cashier, template]
        );

        // Kullanıcı istatistiklerini güncelle
        await pool.query(
            'UPDATE users SET total_receipts = total_receipts + 1, total_amount = total_amount + ? WHERE id = ?',
            [amount, userId]
        );

        // Günlük istatistikleri güncelle
        await pool.query(
            `INSERT INTO daily_stats (user_id, license_id, stat_date, total_receipts, total_amount, total_vat)
             VALUES (?, ?, CURDATE(), 1, ?, ?)
             ON DUPLICATE KEY UPDATE 
             total_receipts = total_receipts + 1,
             total_amount = total_amount + ?,
             total_vat = total_vat + ?`,
            [userId, licenseId, amount, vat_amount, amount, vat_amount]
        );

        res.json({ success: true, message: 'Fiş kaydedildi' });

    } catch (error) {
        console.error('Fiş kayıt hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

// ===================================
// PANEL AUTH API
// ===================================

// Panel Girişi
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const [users] = await pool.query(
            'SELECT * FROM admin_users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({ success: false, error: 'Kullanıcı bulunamadı' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ success: false, error: 'Hatalı şifre' });
        }

        // JWT token oluştur
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Son giriş zamanını güncelle
        await pool.query(
            'UPDATE admin_users SET last_login = NOW() WHERE id = ?',
            [user.id]
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Giriş hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

// ===================================
// PANEL DATA API (Korumalı)
// ===================================

// Tüm lisansları listele
app.get('/api/admin/licenses', authenticateToken, async (req, res) => {
    try {
        const [licenses] = await pool.query(`
            SELECT l.*, COUNT(u.id) as active_devices
            FROM licenses l
            LEFT JOIN users u ON l.id = u.license_id AND u.is_online = TRUE
            GROUP BY l.id
            ORDER BY l.created_at DESC
        `);

        res.json({ success: true, data: licenses });
    } catch (error) {
        console.error('Lisans listesi hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

// Yeni lisans oluştur
app.post('/api/admin/licenses/create', authenticateToken, async (req, res) => {
    try {
        const { company_name, contact_email, contact_phone, days, max_devices, notes } = req.body;

        const licenseKey = generateLicenseKey();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(days));

        const [result] = await pool.query(
            `INSERT INTO licenses (license_key, company_name, contact_email, contact_phone, expires_at, days_remaining, max_devices, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [licenseKey, company_name, contact_email, contact_phone, expiresAt, days, max_devices, notes]
        );

        res.json({
            success: true,
            license_key: licenseKey,
            id: result.insertId
        });

    } catch (error) {
        console.error('Lisans oluşturma hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

// Lisans güncelle (gün ekle/çıkar, askıya al, cihaz sayısı, vb.)
app.put('/api/admin/licenses/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { action, days, status, notes, max_devices } = req.body;

        if (action === 'add_days') {
            await pool.query(
                `UPDATE licenses 
                 SET expires_at = DATE_ADD(expires_at, INTERVAL ? DAY),
                     days_remaining = days_remaining + ?
                 WHERE id = ?`,
                [days, days, id]
            );
        } else if (action === 'set_status') {
            await pool.query(
                'UPDATE licenses SET status = ? WHERE id = ?',
                [status, id]
            );
        } else if (action === 'update_notes') {
            await pool.query(
                'UPDATE licenses SET notes = ? WHERE id = ?',
                [notes, id]
            );
        } else if (action === 'set_max_devices') {
            await pool.query(
                'UPDATE licenses SET max_devices = ? WHERE id = ?',
                [max_devices, id]
            );
        }

        res.json({ success: true, message: 'Lisans güncellendi' });

    } catch (error) {
        console.error('Lisans güncelleme hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

// Günlük istatistikler
app.get('/api/admin/stats/daily', authenticateToken, async (req, res) => {
    try {
        const { start_date, end_date, license_id } = req.query;

        let query = `
            SELECT 
                stat_date,
                SUM(total_receipts) as receipts,
                SUM(total_amount) as amount,
                SUM(total_vat) as vat
            FROM daily_stats
            WHERE stat_date BETWEEN ? AND ?
        `;
        
        const params = [start_date || '2024-01-01', end_date || '2099-12-31'];

        if (license_id) {
            query += ' AND license_id = ?';
            params.push(license_id);
        }

        query += ' GROUP BY stat_date ORDER BY stat_date DESC';

        const [stats] = await pool.query(query, params);

        res.json({ success: true, data: stats });

    } catch (error) {
        console.error('İstatistik hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

// Kullanıcı listesi
app.get('/api/admin/users', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT u.*, l.license_key, l.company_name, l.status as license_status
            FROM users u
            LEFT JOIN licenses l ON u.license_id = l.id
            ORDER BY u.last_seen DESC
        `);

        res.json({ success: true, data: users });

    } catch (error) {
        console.error('Kullanıcı listesi hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

// Excel export için fişleri getir (DETAYLI)
app.get('/api/admin/receipts/export', authenticateToken, async (req, res) => {
    try {
        const { start_date, end_date, license_id } = req.query;

        let query = `
            SELECT 
                r.id as 'Fiş ID',
                r.created_at as 'Yazdırma Zamanı',
                r.date_printed as 'Tarih',
                r.receipt_no as 'Fiş No',
                r.company_name as 'Firma Adı',
                r.amount as 'Tutar (TL)',
                r.vat_rate as 'KDV Oranı (%)',
                r.vat_amount as 'KDV Tutarı (TL)',
                r.description as 'Açıklama',
                r.cashier as 'Kasiyer',
                r.template as 'Şablon',
                l.license_key as 'Lisans Anahtarı',
                l.company_name as 'Lisans Sahibi',
                u.pc_name as 'PC Adı',
                u.hardware_id as 'Donanım ID',
                u.os_info as 'İşletim Sistemi'
            FROM receipts r
            LEFT JOIN licenses l ON r.license_id = l.id
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.date_printed BETWEEN ? AND ?
        `;

        const params = [start_date || '2024-01-01', end_date || '2099-12-31'];

        if (license_id) {
            query += ' AND r.license_id = ?';
            params.push(license_id);
        }

        query += ' ORDER BY r.created_at DESC';

        const [receipts] = await pool.query(query, params);

        // Excel formatına uygun hale getir
        const excelData = receipts.map(r => ({
            'Fiş ID': r['Fiş ID'],
            'Yazdırma Zamanı': new Date(r['Yazdırma Zamanı']).toLocaleString('tr-TR'),
            'Tarih': r['Tarih'],
            'Fiş No': r['Fiş No'],
            'Firma Adı': r['Firma Adı'],
            'Tutar (TL)': parseFloat(r['Tutar (TL)']).toFixed(2),
            'KDV Oranı (%)': r['KDV Oranı (%)'],
            'KDV Tutarı (TL)': parseFloat(r['KDV Tutarı (TL)']).toFixed(2),
            'Açıklama': r['Açıklama'] || '-',
            'Kasiyer': r['Kasiyer'] || '-',
            'Şablon': r['Şablon'] || 'Standart',
            'Lisans Anahtarı': r['Lisans Anahtarı'],
            'Lisans Sahibi': r['Lisans Sahibi'],
            'PC Adı': r['PC Adı'],
            'Donanım ID': r['Donanım ID'],
            'İşletim Sistemi': r['İşletim Sistemi']
        }));

        res.json({ success: true, data: excelData });

    } catch (error) {
        console.error('Export hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

// ===================================
// SERVER BAŞLAT
// ===================================

app.listen(PORT, () => {
    console.log(`🚀 API Server çalışıyor: http://localhost:${PORT}`);
    console.log(`📊 Panel: http://localhost:${PORT}/panel`);
});
