// ===================================
// BACKEND API SERVER - POSTGRESQL VERSİYONU (RENDER İÇİN)
// ===================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_key';

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL Bağlantı Havuzu (Render otomatik DATABASE_URL sağlar)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test bağlantısı
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ PostgreSQL bağlantı hatası:', err);
    } else {
        console.log('✅ PostgreSQL bağlantısı başarılı:', res.rows[0].now);
    }
});

// ===================================
// YARDIMCI FONKSİYONLAR
// ===================================

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

function generateLicenseKey() {
    const part1 = crypto.randomBytes(4).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(4).toString('hex').toUpperCase();
    const part3 = crypto.randomBytes(4).toString('hex').toUpperCase();
    const part4 = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${part1}-${part2}-${part3}-${part4}`;
}

// ===================================
// TEMEL ENDPOINT
// ===================================

app.get('/', (req, res) => {
    res.json({ 
        message: '🖨️ Fiş Yönetim Paneli API',
        version: '1.0.0',
        status: 'online'
    });
});

// Health check
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'healthy', database: 'connected' });
    } catch (error) {
        res.status(500).json({ status: 'unhealthy', database: 'disconnected' });
    }
});

// ===================================
// LİSANS API
// ===================================

app.post('/api/license/check', async (req, res) => {
    try {
        const { license_key, hardware_id, pc_name, os_info, app_version } = req.body;

        if (!license_key || !hardware_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'Lisans anahtarı ve donanım ID gerekli' 
            });
        }

        const licenseResult = await pool.query(
            'SELECT * FROM licenses WHERE license_key = $1',
            [license_key]
        );

        if (licenseResult.rows.length === 0) {
            return res.json({ 
                success: false, 
                error: 'Geçersiz lisans anahtarı',
                status: 'invalid'
            });
        }

        const license = licenseResult.rows[0];

        if (license.status === 'suspended') {
            return res.json({ 
                success: false, 
                error: 'Lisans askıya alınmış',
                status: 'suspended'
            });
        }

        const now = new Date();
        const expiresAt = new Date(license.expires_at);
        const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

        if (daysRemaining <= 0) {
            await pool.query(
                'UPDATE licenses SET status = $1 WHERE id = $2',
                ['expired', license.id]
            );
            return res.json({ 
                success: false, 
                error: 'Lisans süresi dolmuş',
                status: 'expired',
                days_remaining: 0
            });
        }

        const userResult = await pool.query(
            'SELECT * FROM users WHERE hardware_id = $1',
            [hardware_id]
        );

        let userId;
        if (userResult.rows.length === 0) {
            const deviceCountResult = await pool.query(
                'SELECT COUNT(*) as count FROM users WHERE license_id = $1',
                [license.id]
            );

            if (parseInt(deviceCountResult.rows[0].count) >= license.max_devices) {
                return res.json({
                    success: false,
                    error: `Maksimum cihaz limitine ulaşıldı (${license.max_devices} cihaz)`,
                    status: 'device_limit_reached',
                    max_devices: license.max_devices,
                    current_devices: deviceCountResult.rows[0].count
                });
            }

            const insertResult = await pool.query(
                `INSERT INTO users (license_id, hardware_id, pc_name, os_info, app_version, last_seen, is_online) 
                 VALUES ($1, $2, $3, $4, $5, NOW(), TRUE) RETURNING id`,
                [license.id, hardware_id, pc_name, os_info, app_version]
            );
            userId = insertResult.rows[0].id;
        } else {
            userId = userResult.rows[0].id;
            await pool.query(
                `UPDATE users SET last_seen = NOW(), is_online = TRUE, pc_name = $1, os_info = $2, app_version = $3 
                 WHERE id = $4`,
                [pc_name, os_info, app_version, userId]
            );
        }

        await pool.query(
            'UPDATE licenses SET last_check = NOW(), days_remaining = $1 WHERE id = $2',
            [daysRemaining, license.id]
        );

        await pool.query(
            'INSERT INTO activity_logs (license_id, user_id, action, details) VALUES ($1, $2, $3, $4)',
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
            offline_mode: true
        });
    }
});

// Fiş kayıt
app.post('/api/receipt/log', async (req, res) => {
    try {
        const { 
            license_key, hardware_id, company_name, receipt_no, 
            amount, vat_rate, vat_amount, description, cashier, template 
        } = req.body;

        const licenseResult = await pool.query(
            'SELECT id FROM licenses WHERE license_key = $1 AND status = $2',
            [license_key, 'active']
        );

        if (licenseResult.rows.length === 0) {
            return res.status(403).json({ success: false, error: 'Geçersiz lisans' });
        }

        const userResult = await pool.query(
            'SELECT id FROM users WHERE hardware_id = $1',
            [hardware_id]
        );

        if (userResult.rows.length === 0) {
            return res.status(403).json({ success: false, error: 'Kullanıcı bulunamadı' });
        }

        const licenseId = licenseResult.rows[0].id;
        const userId = userResult.rows[0].id;

        await pool.query(
            `INSERT INTO receipts 
             (user_id, license_id, company_name, receipt_no, amount, vat_rate, vat_amount, description, cashier, template, date_printed) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_DATE)`,
            [userId, licenseId, company_name, receipt_no, amount, vat_rate, vat_amount, description, cashier, template]
        );

        await pool.query(
            'UPDATE users SET total_receipts = total_receipts + 1, total_amount = total_amount + $1 WHERE id = $2',
            [amount, userId]
        );

        await pool.query(
            `INSERT INTO daily_stats (user_id, license_id, stat_date, total_receipts, total_amount, total_vat)
             VALUES ($1, $2, CURRENT_DATE, 1, $3, $4)
             ON CONFLICT (user_id, stat_date) DO UPDATE SET 
             total_receipts = daily_stats.total_receipts + 1,
             total_amount = daily_stats.total_amount + $3,
             total_vat = daily_stats.total_vat + $4`,
            [userId, licenseId, amount, vat_amount]
        );

        res.json({ success: true, message: 'Fiş kaydedildi' });

    } catch (error) {
        console.error('Fiş kayıt hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

// Panel girişi
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const result = await pool.query(
            'SELECT * FROM admin_users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Kullanıcı bulunamadı' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ success: false, error: 'Hatalı şifre' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        await pool.query(
            'UPDATE admin_users SET last_login = NOW() WHERE id = $1',
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

// Lisansları listele
app.get('/api/admin/licenses', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT l.*, COUNT(u.id) as active_devices
            FROM licenses l
            LEFT JOIN users u ON l.id = u.license_id AND u.is_online = TRUE
            GROUP BY l.id
            ORDER BY l.created_at DESC
        `);

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Lisans listesi hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

// Tek lisans detayı
app.get('/api/admin/licenses/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(`
            SELECT l.*, COUNT(u.id) as active_devices
            FROM licenses l
            LEFT JOIN users u ON l.id = u.license_id AND u.is_online = TRUE
            WHERE l.id = $1
            GROUP BY l.id
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Lisans bulunamadı' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Lisans detay hatası:', error);
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

        const result = await pool.query(
            `INSERT INTO licenses (license_key, company_name, contact_email, contact_phone, expires_at, days_remaining, max_devices, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [licenseKey, company_name, contact_email, contact_phone, expiresAt, days, max_devices, notes]
        );

        res.json({
            success: true,
            license_key: licenseKey,
            id: result.rows[0].id
        });

    } catch (error) {
        console.error('Lisans oluşturma hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

// Lisans güncelle
app.put('/api/admin/licenses/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { action, days, status, notes, max_devices } = req.body;

        if (action === 'add_days') {
            await pool.query(
                `UPDATE licenses 
                 SET expires_at = expires_at + INTERVAL '1 day' * $1,
                     days_remaining = days_remaining + $1
                 WHERE id = $2`,
                [days, id]
            );
        } else if (action === 'set_status') {
            await pool.query(
                'UPDATE licenses SET status = $1 WHERE id = $2',
                [status, id]
            );
        } else if (action === 'update_notes') {
            await pool.query(
                'UPDATE licenses SET notes = $1 WHERE id = $2',
                [notes, id]
            );
        } else if (action === 'set_max_devices') {
            await pool.query(
                'UPDATE licenses SET max_devices = $1 WHERE id = $2',
                [max_devices, id]
            );
        }

        res.json({ success: true, message: 'Lisans güncellendi' });

    } catch (error) {
        console.error('Lisans güncelleme hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

// Lisans sil
app.delete('/api/admin/licenses/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Önce ilişkili kayıtları kontrol et
        const users = await pool.query(
            'SELECT COUNT(*) as count FROM users WHERE license_id = $1',
            [id]
        );

        if (parseInt(users.rows[0].count) > 0) {
            return res.json({
                success: false,
                error: `Bu lisansa bağlı ${users.rows[0].count} kullanıcı var. Önce kullanıcıları silin.`
            });
        }

        // Lisansı sil (CASCADE ile ilişkili kayıtlar da silinir)
        await pool.query('DELETE FROM licenses WHERE id = $1', [id]);

        res.json({ success: true, message: 'Lisans silindi' });

    } catch (error) {
        console.error('Lisans silme hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası: ' + error.message });
    }
});

// Kullanıcıları listele
app.get('/api/admin/users', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.*, l.license_key, l.company_name as license_company
            FROM users u
            LEFT JOIN licenses l ON u.license_id = l.id
            ORDER BY u.last_seen DESC
        `);

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Kullanıcı listesi hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

// Günlük istatistikler
app.get('/api/admin/stats/daily', authenticateToken, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        const result = await pool.query(`
            SELECT 
                stat_date,
                SUM(total_receipts) as receipts,
                SUM(total_amount) as amount,
                SUM(total_vat) as vat
            FROM daily_stats
            WHERE stat_date BETWEEN $1 AND $2
            GROUP BY stat_date
            ORDER BY stat_date DESC
        `, [start_date || '2024-01-01', end_date || '2099-12-31']);

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('İstatistik hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

// Fişleri export et
app.get('/api/admin/receipts/export', authenticateToken, async (req, res) => {
    try {
        const { start_date, end_date, license_id } = req.query;

        let query = `
            SELECT 
                r.id as "Fiş ID",
                r.created_at as "Yazdırma Zamanı",
                r.date_printed as "Tarih",
                r.receipt_no as "Fiş No",
                r.company_name as "Firma Adı",
                r.amount as "Tutar (TL)",
                r.vat_rate as "KDV Oranı (%)",
                r.vat_amount as "KDV Tutarı (TL)",
                r.description as "Açıklama",
                r.cashier as "Kasiyer",
                r.template as "Şablon",
                l.license_key as "Lisans Anahtarı",
                l.company_name as "Lisans Sahibi",
                u.pc_name as "PC Adı",
                u.hardware_id as "Donanım ID",
                u.os_info as "İşletim Sistemi"
            FROM receipts r
            LEFT JOIN licenses l ON r.license_id = l.id
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.date_printed BETWEEN $1 AND $2
        `;

        const params = [start_date || '2024-01-01', end_date || '2099-12-31'];

        if (license_id) {
            query += ' AND r.license_id = $3';
            params.push(license_id);
        }

        query += ' ORDER BY r.created_at DESC';

        const result = await pool.query(query, params);

        // Excel formatına uygun hale getir
        const excelData = result.rows.map(r => ({
            'Fiş ID': r['Fiş ID'],
            'Yazdırma Zamanı': new Date(r['Yazdırma Zamanı']).toLocaleString('tr-TR'),
            'Tarih': r['Tarih'],
            'Fiş No': r['Fiş No'],
            'Firma Adı': r['Firma Adı'],
            'Tutar (TL)': parseFloat(r['Tutar (TL)'] || 0).toFixed(2),
            'KDV Oranı (%)': r['KDV Oranı (%)'],
            'KDV Tutarı (TL)': parseFloat(r['KDV Tutarı (TL)'] || 0).toFixed(2),
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
});
