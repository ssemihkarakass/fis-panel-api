-- Admin kullanıcısını sil ve yeniden oluştur
DELETE FROM admin_users WHERE username = 'admin';

-- Yeni admin oluştur
-- Şifre: admin123
INSERT INTO admin_users (username, password_hash, email, role) 
VALUES (
    'admin', 
    '$2b$10$rZ5qX8vK9YxH3nF2wL4zOe.K7L/MtJ.V2xnqh5.vVWIa.6U9V9V9V9', 
    'admin@example.com', 
    'admin'
);

-- Kontrol et
SELECT * FROM admin_users WHERE username = 'admin';
