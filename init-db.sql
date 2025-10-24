-- ===================================
-- POSTGRESQL VERİTABANI TABLOALRI
-- Render.com için
-- ===================================

-- 1. LİSANSLAR TABLOSU
CREATE TABLE IF NOT EXISTS licenses (
    id SERIAL PRIMARY KEY,
    license_key VARCHAR(255) UNIQUE NOT NULL,
    hardware_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    days_remaining INTEGER,
    max_devices INTEGER DEFAULT 1,
    company_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    notes TEXT,
    last_check TIMESTAMP
);

CREATE INDEX idx_license_key ON licenses(license_key);
CREATE INDEX idx_hardware_id ON licenses(hardware_id);
CREATE INDEX idx_status ON licenses(status);

-- 2. KULLANICILAR (PC'LER) TABLOSU
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    license_id INTEGER REFERENCES licenses(id) ON DELETE CASCADE,
    hardware_id VARCHAR(255) UNIQUE NOT NULL,
    pc_name VARCHAR(255),
    os_info VARCHAR(255),
    app_version VARCHAR(50),
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP,
    is_online BOOLEAN DEFAULT FALSE,
    total_receipts INTEGER DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0
);

CREATE INDEX idx_user_hardware_id ON users(hardware_id);
CREATE INDEX idx_user_license_id ON users(license_id);

-- 3. FİŞLER TABLOSU
CREATE TABLE IF NOT EXISTS receipts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    license_id INTEGER REFERENCES licenses(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    receipt_no VARCHAR(100),
    amount DECIMAL(10,2),
    vat_rate DECIMAL(5,2),
    vat_amount DECIMAL(10,2),
    description TEXT,
    cashier VARCHAR(100),
    template VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_printed DATE
);

CREATE INDEX idx_receipt_user_id ON receipts(user_id);
CREATE INDEX idx_receipt_license_id ON receipts(license_id);
CREATE INDEX idx_receipt_date_printed ON receipts(date_printed);
CREATE INDEX idx_receipt_created_at ON receipts(created_at);

-- 4. GÜNLÜK İSTATİSTİKLER TABLOSU
CREATE TABLE IF NOT EXISTS daily_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    license_id INTEGER REFERENCES licenses(id) ON DELETE CASCADE,
    stat_date DATE,
    total_receipts INTEGER DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    total_vat DECIMAL(10,2) DEFAULT 0,
    UNIQUE(user_id, stat_date)
);

CREATE INDEX idx_daily_stats_date ON daily_stats(stat_date);
CREATE INDEX idx_daily_stats_user_id ON daily_stats(user_id);

-- 5. PANEL KULLANICILARI (ADMİN) TABLOSU
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE INDEX idx_admin_username ON admin_users(username);

-- 6. AKTİVİTE LOGLARI
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    license_id INTEGER REFERENCES licenses(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_created_at ON activity_logs(created_at);
CREATE INDEX idx_activity_license_id ON activity_logs(license_id);

-- İLK ADMİN KULLANICISI OLUŞTUR
-- Kullanıcı adı: admin
-- Şifre: admin123
INSERT INTO admin_users (username, password_hash, email, role) 
VALUES ('admin', '$2b$10$rZ5qX8vK9YxH3nF2wL4zOeJ8vK9YxH3nF2wL4zOeJ8vK9YxH3nF2w', 'admin@example.com', 'admin')
ON CONFLICT (username) DO NOTHING;

-- TEST LİSANSI OLUŞTUR (opsiyonel)
INSERT INTO licenses (license_key, company_name, expires_at, days_remaining, max_devices, notes)
VALUES ('TEST-1234-5678-ABCD', 'Test Şirketi', CURRENT_TIMESTAMP + INTERVAL '365 days', 365, 3, 'Test lisansı')
ON CONFLICT (license_key) DO NOTHING;
