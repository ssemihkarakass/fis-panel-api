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
        const { license_key, hardware_id, pc_name, os_info, app_version, is_closing } = req.body;

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
            // Eğer uygulama kapanıyorsa offline yap
            const onlineStatus = is_closing ? false : true;
            await pool.query(
                `UPDATE users SET last_seen = NOW(), is_online = $1, pc_name = $2, os_info = $3, app_version = $4 
                 WHERE id = $5`,
                [onlineStatus, pc_name, os_info, app_version, userId]
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

// Fiş kayıt (Detaylı log ile)
app.post('/api/receipt/log', async (req, res) => {
    try {
        const { 
            license_key, hardware_id, company_name, receipt_no, 
            amount, vat_rate, vat_amount, description, cashier, template,
            session_id
        } = req.body;

        console.log('🧾 Fiş kaydı:', { receipt_no, company_name, amount, session_id });

        const licenseResult = await pool.query(
            'SELECT id FROM licenses WHERE license_key = $1 AND status = $2',
            [license_key, 'active']
        );

        if (licenseResult.rows.length === 0) {
            console.log('❌ Geçersiz lisans:', license_key);
            return res.status(403).json({ success: false, error: 'Geçersiz lisans' });
        }

        const userResult = await pool.query(
            'SELECT id FROM users WHERE hardware_id = $1',
            [hardware_id]
        );

        if (userResult.rows.length === 0) {
            console.log('❌ Kullanıcı bulunamadı:', hardware_id);
            return res.status(403).json({ success: false, error: 'Kullanıcı bulunamadı' });
        }

        const licenseId = licenseResult.rows[0].id;
        const userId = userResult.rows[0].id;
        
        console.log('✅ Lisans ve kullanıcı bulundu:', { licenseId, userId });

        // Fiş kaydet
        await pool.query(
            `INSERT INTO receipts 
             (user_id, license_id, company_name, receipt_no, amount, vat_rate, vat_amount, description, cashier, template, date_printed) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_DATE)`,
            [userId, licenseId, company_name, receipt_no, amount, vat_rate, vat_amount, description, cashier, template]
        );

        // Kullanıcı istatistiklerini güncelle
        await pool.query(
            'UPDATE users SET total_receipts = total_receipts + 1, total_amount = total_amount + $1 WHERE id = $2',
            [amount, userId]
        );

        // Günlük istatistikleri güncelle
        await pool.query(
            `INSERT INTO daily_stats (user_id, license_id, stat_date, total_receipts, total_amount, total_vat)
             VALUES ($1, $2, CURRENT_DATE, 1, $3, $4)
             ON CONFLICT (user_id, stat_date) DO UPDATE SET 
             total_receipts = daily_stats.total_receipts + 1,
             total_amount = daily_stats.total_amount + $3,
             total_vat = daily_stats.total_vat + $4`,
            [userId, licenseId, amount, vat_amount]
        );

        // Detaylı aktivite logu ekle (session_id opsiyonel)
        if (session_id) {
            // Session ID var mı kontrol et
            const sessionCheck = await pool.query(
                'SELECT id FROM session_logs WHERE id = $1',
                [session_id]
            );
            
            if (sessionCheck.rows.length > 0) {
                // Session var - log ekle
                await pool.query(
                    `INSERT INTO detailed_activity_logs (session_id, user_id, license_id, action_type, action_details, company_name, receipt_no, amount)
                     VALUES ($1, $2, $3, 'receipt_print', $4, $5, $6, $7)`,
                    [session_id, userId, licenseId, `Fiş kesildi: ${receipt_no}`, company_name, receipt_no, amount]
                );
                
                // Oturum istatistiklerini güncelle
                await pool.query(
                    `UPDATE session_logs SET total_receipts = total_receipts + 1, total_amount = total_amount + $1 WHERE id = $2`,
                    [amount, session_id]
                );
                console.log('✅ Session log güncellendi');
            } else {
                // Session yok - session_id olmadan log ekle
                console.log('⚠️ Session ID bulunamadı, session_id olmadan log ekleniyor');
                await pool.query(
                    `INSERT INTO detailed_activity_logs (user_id, license_id, action_type, action_details, company_name, receipt_no, amount)
                     VALUES ($1, $2, 'receipt_print', $3, $4, $5, $6)`,
                    [userId, licenseId, `Fiş kesildi: ${receipt_no}`, company_name, receipt_no, amount]
                );
            }
        } else {
            // Session ID yoksa sadece log ekle
            await pool.query(
                `INSERT INTO detailed_activity_logs (user_id, license_id, action_type, action_details, company_name, receipt_no, amount)
                 VALUES ($1, $2, 'receipt_print', $3, $4, $5, $6)`,
                [userId, licenseId, `Fiş kesildi: ${receipt_no}`, company_name, receipt_no, amount]
            );
        }

        // Firma bazlı istatistikleri güncelle
        await pool.query(
            `INSERT INTO company_stats (license_id, company_name, total_receipts, total_amount, last_receipt_date, first_receipt_date)
             VALUES ($1, $2, 1, $3, NOW(), NOW())
             ON CONFLICT (license_id, company_name) DO UPDATE SET 
             total_receipts = company_stats.total_receipts + 1,
             total_amount = company_stats.total_amount + $3,
             last_receipt_date = NOW(),
             updated_at = NOW()`,
            [licenseId, company_name, amount]
        );

        console.log('✅ Fiş başarıyla kaydedildi!');
        res.json({ success: true, message: 'Fiş kaydedildi' });

    } catch (error) {
        console.error('❌ Fiş kayıt hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası: ' + error.message });
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
            ORDER BY l.company_name ASC NULLS LAST, l.created_at DESC
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

// Kullanıcı sil
app.delete('/api/admin/users/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Kullanıcıyı sil (CASCADE ile ilişkili kayıtlar da silinir)
        await pool.query('DELETE FROM users WHERE id = $1', [id]);

        res.json({ success: true, message: 'Kullanıcı silindi' });

    } catch (error) {
        console.error('Kullanıcı silme hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası: ' + error.message });
    }
});

// Kullanıcı detayları (Oturumlar, aktiviteler, istatistikler)
app.get('/api/admin/users/:id/details', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Kullanıcı bilgileri
        const userResult = await pool.query(`
            SELECT u.*, l.license_key, l.company_name as license_company, l.expires_at
            FROM users u
            LEFT JOIN licenses l ON u.license_id = l.id
            WHERE u.id = $1
        `, [id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
        }

        // Oturum logları
        const sessionsResult = await pool.query(`
            SELECT * FROM session_logs
            WHERE user_id = $1
            ORDER BY session_start DESC
            LIMIT 50
        `, [id]);

        // Son aktiviteler
        const activitiesResult = await pool.query(`
            SELECT * FROM detailed_activity_logs
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 100
        `, [id]);

        // Firma bazlı istatistikler
        const companiesResult = await pool.query(`
            SELECT 
                company_name,
                COUNT(*) as receipt_count,
                SUM(amount) as total_amount
            FROM receipts
            WHERE user_id = $1
            GROUP BY company_name
            ORDER BY total_amount DESC
        `, [id]);

        res.json({
            success: true,
            data: {
                user: userResult.rows[0],
                sessions: sessionsResult.rows,
                activities: activitiesResult.rows,
                companies: companiesResult.rows
            }
        });

    } catch (error) {
        console.error('Kullanıcı detay hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

// Oturum başlat
app.post('/api/session/start', async (req, res) => {
    try {
        const { license_key, hardware_id, pc_name, user_id } = req.body;

        console.log('🔐 Oturum başlatma:', { license_key, hardware_id, pc_name, user_id });

        const licenseResult = await pool.query(
            'SELECT id FROM licenses WHERE license_key = $1',
            [license_key]
        );

        if (licenseResult.rows.length === 0) {
            console.log('❌ Geçersiz lisans:', license_key);
            return res.json({ success: false, error: 'Geçersiz lisans' });
        }

        const licenseId = licenseResult.rows[0].id;

        // User var mı kontrol et
        let actualUserId = user_id;
        if (user_id) {
            const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [user_id]);
            if (userCheck.rows.length === 0) {
                console.log('⚠️ User ID bulunamadı, hardware_id ile aranıyor:', hardware_id);
                actualUserId = null;
            }
        }

        // Hardware ID ile user bul veya oluştur
        if (!actualUserId && hardware_id) {
            const userResult = await pool.query(
                'SELECT id FROM users WHERE hardware_id = $1',
                [hardware_id]
            );

            if (userResult.rows.length > 0) {
                actualUserId = userResult.rows[0].id;
                console.log('✅ User bulundu:', actualUserId);
            } else {
                // User yoksa oluştur
                const newUserResult = await pool.query(
                    `INSERT INTO users (license_id, hardware_id, pc_name, is_online)
                     VALUES ($1, $2, $3, true) RETURNING id`,
                    [licenseId, hardware_id, pc_name]
                );
                actualUserId = newUserResult.rows[0].id;
                console.log('✅ Yeni user oluşturuldu:', actualUserId);
            }
        }

        if (!actualUserId) {
            console.log('❌ User ID bulunamadı ve oluşturulamadı');
            return res.json({ success: false, error: 'Kullanıcı bulunamadı' });
        }

        // Oturum oluştur
        const sessionResult = await pool.query(
            `INSERT INTO session_logs (user_id, license_id, pc_name, status)
             VALUES ($1, $2, $3, 'active') RETURNING id`,
            [actualUserId, licenseId, pc_name]
        );

        console.log('✅ Oturum oluşturuldu:', sessionResult.rows[0].id);

        // Aktivite logu ekle
        await pool.query(
            `INSERT INTO detailed_activity_logs (user_id, license_id, action_type, action_details)
             VALUES ($1, $2, 'login', $3)`,
            [actualUserId, licenseId, `Oturum açıldı: ${pc_name}`]
        );

        res.json({ success: true, session_id: sessionResult.rows[0].id });

    } catch (error) {
        console.error('❌ Session start error:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası: ' + error.message });
    }
});

// Oturum bitir
app.post('/api/session/end', async (req, res) => {
    try {
        const { session_id } = req.body;

        // Oturumu güncelle
        await pool.query(
            `UPDATE session_logs SET session_end = NOW(), status = 'ended' WHERE id = $1`,
            [session_id]
        );

        // Aktivite logu ekle
        const sessionResult = await pool.query(
            'SELECT user_id, license_id FROM session_logs WHERE id = $1',
            [session_id]
        );

        if (sessionResult.rows.length > 0) {
            const { user_id, license_id } = sessionResult.rows[0];
            await pool.query(
                `INSERT INTO detailed_activity_logs (session_id, user_id, license_id, action_type, action_details)
                 VALUES ($1, $2, $3, 'logout', 'Oturum kapatıldı')`,
                [session_id, user_id, license_id]
            );
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Session end error:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

// Dashboard - Bugünkü fişler
app.get('/api/admin/dashboard/today', authenticateToken, async (req, res) => {
    try {
        // Bugünkü toplam fişler
        const todayStatsResult = await pool.query(
            `SELECT 
                COUNT(*) as total_receipts,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(SUM(vat_amount), 0) as total_vat
            FROM receipts
            WHERE DATE(date_printed) = CURRENT_DATE`
        );

        // Bugünkü aktif oturumlar
        const activeSessionsResult = await pool.query(
            `SELECT COUNT(*) as active_sessions
            FROM session_logs
            WHERE status = 'active' AND DATE(session_start) = CURRENT_DATE`
        );

        // Bugünkü en çok fiş kesen kullanıcılar
        const topUsersResult = await pool.query(
            `SELECT 
                u.pc_name,
                COUNT(r.id) as receipt_count,
                SUM(r.amount) as total_amount
            FROM receipts r
            JOIN users u ON r.user_id = u.id
            WHERE DATE(r.date_printed) = CURRENT_DATE
            GROUP BY u.id, u.pc_name
            ORDER BY receipt_count DESC
            LIMIT 5`
        );

        res.json({
            success: true,
            today: todayStatsResult.rows[0],
            active_sessions: activeSessionsResult.rows[0].active_sessions,
            top_users: topUsersResult.rows
        });

    } catch (error) {
        console.error('Dashboard bugünkü fişler hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

// Aktiviteler listesi
app.get('/api/admin/activities', authenticateToken, async (req, res) => {
    try {
        const limit = req.query.limit || 100;

        const activitiesResult = await pool.query(
            `SELECT 
                dal.*,
                u.pc_name
            FROM detailed_activity_logs dal
            LEFT JOIN users u ON dal.user_id = u.id
            ORDER BY dal.created_at DESC
            LIMIT $1`,
            [limit]
        );

        res.json({
            success: true,
            data: activitiesResult.rows
        });

    } catch (error) {
        console.error('Aktiviteler yükleme hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

// Oturumlar listesi
app.get('/api/admin/sessions', authenticateToken, async (req, res) => {
    try {
        const sessionsResult = await pool.query(
            `SELECT 
                sl.*,
                u.pc_name,
                l.license_key,
                l.company_name as license_company,
                COALESCE((
                    SELECT COUNT(*) 
                    FROM receipts r 
                    WHERE r.user_id = sl.user_id 
                    AND r.created_at >= sl.session_start
                    AND r.created_at <= COALESCE(sl.session_end, NOW())
                ), 0) as actual_receipts,
                COALESCE((
                    SELECT SUM(amount) 
                    FROM receipts r 
                    WHERE r.user_id = sl.user_id 
                    AND r.created_at >= sl.session_start
                    AND r.created_at <= COALESCE(sl.session_end, NOW())
                ), 0) as actual_amount
            FROM session_logs sl
            LEFT JOIN users u ON sl.user_id = u.id
            LEFT JOIN licenses l ON sl.license_id = l.id
            ORDER BY sl.session_start DESC
            LIMIT 100`
        );

        // Gerçek değerleri kullan
        const sessions = sessionsResult.rows.map(session => ({
            ...session,
            total_receipts: session.actual_receipts,
            total_amount: session.actual_amount
        }));

        res.json({
            success: true,
            data: sessions
        });

    } catch (error) {
        console.error('Oturumlar yükleme hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

// Oturum detayları - Hangi firmalar, ne kadar kesildi
app.get('/api/admin/sessions/:id/details', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Oturum bilgisi + Gerçek fiş sayısı ve tutarı
        const sessionResult = await pool.query(
            `SELECT 
                sl.*,
                u.pc_name,
                l.license_key,
                l.company_name as license_company,
                COALESCE((
                    SELECT COUNT(*) 
                    FROM receipts r 
                    WHERE r.user_id = sl.user_id 
                    AND r.created_at >= sl.session_start
                    AND r.created_at <= COALESCE(sl.session_end, NOW())
                ), 0) as actual_receipts,
                COALESCE((
                    SELECT SUM(amount) 
                    FROM receipts r 
                    WHERE r.user_id = sl.user_id 
                    AND r.created_at >= sl.session_start
                    AND r.created_at <= COALESCE(sl.session_end, NOW())
                ), 0) as actual_amount
            FROM session_logs sl
            JOIN users u ON sl.user_id = u.id
            JOIN licenses l ON sl.license_id = l.id
            WHERE sl.id = $1`,
            [id]
        );

        if (sessionResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Oturum bulunamadı' });
        }
        
        // Gerçek değerleri kullan
        const session = sessionResult.rows[0];
        session.total_receipts = session.actual_receipts;
        session.total_amount = session.actual_amount;

        // Oturumdaki fişler - Firma bazlı (sadece bu oturumda kesilmiş fişler)
        const receiptsResult = await pool.query(
            `SELECT 
                r.company_name,
                COUNT(*) as receipt_count,
                SUM(r.amount) as total_amount,
                SUM(r.vat_amount) as total_vat,
                MIN(r.receipt_no) as first_receipt,
                MAX(r.receipt_no) as last_receipt,
                ARRAY_AGG(
                    json_build_object(
                        'receipt_no', r.receipt_no,
                        'amount', r.amount,
                        'vat_rate', r.vat_rate,
                        'vat_amount', r.vat_amount,
                        'description', r.description,
                        'date_printed', r.created_at
                    ) ORDER BY r.receipt_no
                ) as receipts
            FROM receipts r
            WHERE r.user_id = (SELECT user_id FROM session_logs WHERE id = $1)
            AND r.created_at >= (SELECT session_start FROM session_logs WHERE id = $1)
            AND r.created_at <= COALESCE((SELECT session_end FROM session_logs WHERE id = $1), NOW())
            GROUP BY r.company_name
            ORDER BY total_amount DESC`,
            [id]
        );

        // Oturumdaki tüm aktiviteler
        const activitiesResult = await pool.query(
            `SELECT 
                action_type,
                action_details,
                company_name,
                receipt_no,
                amount,
                created_at
            FROM detailed_activity_logs
            WHERE session_id = $1
            ORDER BY created_at DESC`,
            [id]
        );

        res.json({
            success: true,
            session: sessionResult.rows[0],
            companies: receiptsResult.rows,
            activities: activitiesResult.rows
        });

    } catch (error) {
        console.error('Oturum detay hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

// Excel export için oturum fişleri
app.get('/api/admin/sessions/:id/export', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Oturumdaki tüm fişler - Excel formatında
        const receiptsResult = await pool.query(
            `SELECT 
                TO_CHAR(r.date_printed, 'DD.MM.YYYY') as tarih,
                r.receipt_no as fis_no,
                r.company_name as unvan,
                r.amount - r.vat_amount as matrah,
                r.vat_amount as kdv,
                r.amount as tutar,
                r.vat_rate as kdv_orani
            FROM receipts r
            WHERE r.user_id = (SELECT user_id FROM session_logs WHERE id = $1)
            AND r.date_printed >= (SELECT DATE(session_start) FROM session_logs WHERE id = $1)
            AND r.date_printed <= COALESCE((SELECT DATE(session_end) FROM session_logs WHERE id = $1), CURRENT_DATE)
            ORDER BY r.vat_rate, r.receipt_no`,
            [id]
        );

        // KDV oranına göre ayır
        const kdv10 = receiptsResult.rows.filter(r => r.kdv_orani === 10);
        const kdv20 = receiptsResult.rows.filter(r => r.kdv_orani === 20);

        res.json({
            success: true,
            data: {
                'KDV %10': kdv10,
                'KDV %20': kdv20
            }
        });

    } catch (error) {
        console.error('Excel export hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

// Lisans detayları (Kullanıcılar, firmalar, istatistikler)
app.get('/api/admin/licenses/:id/details', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('📊 Lisans detay istendi:', id);

        // Lisans bilgileri
        const licenseResult = await pool.query('SELECT * FROM licenses WHERE id = $1', [id]);

        if (licenseResult.rows.length === 0) {
            console.log('❌ Lisans bulunamadı:', id);
            return res.status(404).json({ success: false, error: 'Lisans bulunamadı' });
        }

        console.log('✅ Lisans bulundu:', licenseResult.rows[0].license_key);

        // Kullanıcılar
        const usersResult = await pool.query(`
            SELECT * FROM users WHERE license_id = $1 ORDER BY last_seen DESC
        `, [id]);
        console.log('👥 Kullanıcı sayısı:', usersResult.rows.length);

        // Firma bazlı istatistikler
        const companiesResult = await pool.query(`
            SELECT * FROM company_stats WHERE license_id = $1 ORDER BY total_amount DESC
        `, [id]);
        console.log('🏢 Firma sayısı:', companiesResult.rows.length);

        // Son aktiviteler
        const activitiesResult = await pool.query(`
            SELECT dal.*, u.pc_name
            FROM detailed_activity_logs dal
            LEFT JOIN users u ON dal.user_id = u.id
            WHERE dal.license_id = $1
            ORDER BY dal.created_at DESC
            LIMIT 100
        `, [id]);
        console.log('📝 Aktivite sayısı:', activitiesResult.rows.length);

        // Günlük istatistikler (Son 30 gün)
        const dailyStatsResult = await pool.query(`
            SELECT 
                stat_date,
                SUM(total_receipts) as receipts,
                SUM(total_amount) as amount
            FROM daily_stats
            WHERE license_id = $1 AND stat_date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY stat_date
            ORDER BY stat_date DESC
        `, [id]);
        console.log('📈 Günlük stat sayısı:', dailyStatsResult.rows.length);

        res.json({
            success: true,
            data: {
                license: licenseResult.rows[0],
                users: usersResult.rows,
                companies: companiesResult.rows,
                activities: activitiesResult.rows,
                daily_stats: dailyStatsResult.rows
            }
        });

    } catch (error) {
        console.error('Lisans detay hatası:', error);
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
