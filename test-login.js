// Test login script
const bcrypt = require('bcrypt');

const password = 'admin123';
const hash = '$2b$10$rZ5qX8vK9YxH3nF2wL4zOe.K7L/MtJ.V2xnqh5.vVWIa.6U9V9V9V9';

bcrypt.compare(password, hash, (err, result) => {
    if (err) {
        console.error('❌ Hata:', err);
    } else {
        console.log('✅ Şifre eşleşmesi:', result);
        if (result) {
            console.log('🎉 GİRİŞ BAŞARILI!');
        } else {
            console.log('❌ GİRİŞ BAŞARISIZ!');
        }
    }
});

// Yeni hash oluştur
bcrypt.hash('admin123', 10, (err, newHash) => {
    if (err) {
        console.error('❌ Hash oluşturma hatası:', err);
    } else {
        console.log('\n📝 Yeni hash (SQL\'e kopyala):');
        console.log(newHash);
        console.log('\nSQL komutu:');
        console.log(`UPDATE admin_users SET password_hash = '${newHash}' WHERE username = 'admin';`);
    }
});
