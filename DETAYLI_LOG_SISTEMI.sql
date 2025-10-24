-- ===================================
-- DETAYLI LOG SİSTEMİ - YENİ TABLOLAR
-- ===================================

-- 1. Oturum Logları (Session Logs)
CREATE TABLE IF NOT EXISTS session_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    license_id INTEGER REFERENCES licenses(id) ON DELETE CASCADE,
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP,
    total_receipts INTEGER DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    companies_added INTEGER DEFAULT 0,
    companies_edited INTEGER DEFAULT 0,
    companies_deleted INTEGER DEFAULT 0,
    pc_name VARCHAR(255),
    ip_address VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' -- active, ended
);

-- 2. Detaylı Aktivite Logları
CREATE TABLE IF NOT EXISTS detailed_activity_logs (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES session_logs(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    license_id INTEGER REFERENCES licenses(id) ON DELETE CASCADE,
    action_type VARCHAR(50), -- login, logout, receipt_print, company_add, company_edit, company_delete, excel_export
    action_details TEXT,
    company_name VARCHAR(255),
    receipt_no VARCHAR(50),
    amount DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Firma Bazlı İstatistikler
CREATE TABLE IF NOT EXISTS company_stats (
    id SERIAL PRIMARY KEY,
    license_id INTEGER REFERENCES licenses(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    total_receipts INTEGER DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    last_receipt_date TIMESTAMP,
    first_receipt_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(license_id, company_name)
);

-- 4. Excel Export Logları
CREATE TABLE IF NOT EXISTS export_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    license_id INTEGER REFERENCES licenses(id) ON DELETE CASCADE,
    export_type VARCHAR(50), -- receipts, companies, stats
    file_name VARCHAR(255),
    record_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- İndeksler (Performans için)
CREATE INDEX idx_session_logs_user ON session_logs(user_id);
CREATE INDEX idx_session_logs_license ON session_logs(license_id);
CREATE INDEX idx_session_logs_start ON session_logs(session_start);
CREATE INDEX idx_detailed_logs_session ON detailed_activity_logs(session_id);
CREATE INDEX idx_detailed_logs_user ON detailed_activity_logs(user_id);
CREATE INDEX idx_detailed_logs_action ON detailed_activity_logs(action_type);
CREATE INDEX idx_company_stats_license ON company_stats(license_id);
CREATE INDEX idx_company_stats_company ON company_stats(company_name);
CREATE INDEX idx_export_logs_user ON export_logs(user_id);

-- View: Kullanıcı Özet İstatistikleri
CREATE OR REPLACE VIEW user_summary_stats AS
SELECT 
    u.id as user_id,
    u.pc_name,
    u.license_id,
    l.license_key,
    l.company_name as license_company,
    COUNT(DISTINCT sl.id) as total_sessions,
    SUM(sl.total_receipts) as total_receipts,
    SUM(sl.total_amount) as total_amount,
    MAX(sl.session_start) as last_session,
    u.is_online
FROM users u
LEFT JOIN licenses l ON u.license_id = l.id
LEFT JOIN session_logs sl ON u.id = sl.user_id
GROUP BY u.id, u.pc_name, u.license_id, l.license_key, l.company_name, u.is_online;

-- View: Lisans Özet İstatistikleri
CREATE OR REPLACE VIEW license_summary_stats AS
SELECT 
    l.id as license_id,
    l.license_key,
    l.company_name,
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT sl.id) as total_sessions,
    SUM(sl.total_receipts) as total_receipts,
    SUM(sl.total_amount) as total_amount,
    COUNT(DISTINCT cs.company_name) as unique_companies,
    l.status,
    l.expires_at
FROM licenses l
LEFT JOIN users u ON l.id = u.license_id
LEFT JOIN session_logs sl ON l.id = sl.license_id
LEFT JOIN company_stats cs ON l.id = cs.license_id
GROUP BY l.id, l.license_key, l.company_name, l.status, l.expires_at;
