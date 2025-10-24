// ===================================
// FİŞ YÖNETİM PANELİ - JAVASCRIPT
// Modern, Profesyonel, Animasyonlu
// ===================================

const API_URL = 'https://fis-panel-api.onrender.com';
let currentToken = null;
let currentUser = null;

// ===================================
// SAYFA YÜKLENDİĞİNDE
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // Token kontrolü
    currentToken = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (currentToken && userStr) {
        currentUser = JSON.parse(userStr);
        showPanel();
        loadDashboard();
    } else {
        showLogin();
    }
    
    // Event listeners
    initEventListeners();
});

// ===================================
// EVENT LISTENERS
// ===================================

function initEventListeners() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateToPage(page);
        });
    });
    
    // Create license button
    const createLicenseBtn = document.getElementById('create-license-btn');
    if (createLicenseBtn) {
        createLicenseBtn.addEventListener('click', () => {
            showModal('create-license-modal');
        });
    }
    
    // Create license confirm
    const createLicenseConfirm = document.getElementById('create-license-confirm');
    if (createLicenseConfirm) {
        createLicenseConfirm.addEventListener('click', handleCreateLicense);
    }
    
    // Modal close buttons
    const modalCloses = document.querySelectorAll('.modal-close');
    modalCloses.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            hideModal(modal.id);
        });
    });
    
    // Export excel button
    const exportExcelBtn = document.getElementById('export-excel-btn');
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', handleExportExcel);
    }
    
    // Delete license button
    const deleteLicenseBtn = document.getElementById('delete-license-btn');
    if (deleteLicenseBtn) {
        deleteLicenseBtn.addEventListener('click', handleDeleteLicense);
    }
    
    // Add days button
    const addDaysBtn = document.getElementById('add-days-btn');
    if (addDaysBtn) {
        addDaysBtn.addEventListener('click', handleAddDays);
    }
    
    // Suspend license button
    const suspendLicenseBtn = document.getElementById('suspend-license-btn');
    if (suspendLicenseBtn) {
        suspendLicenseBtn.addEventListener('click', handleSuspendLicense);
    }
}

// ===================================
// LOGIN / LOGOUT
// ===================================

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    
    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentToken = data.token;
            currentUser = data.user;
            
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showPanel();
            loadDashboard();
        } else {
            errorDiv.textContent = data.error || 'Giriş başarısız';
            errorDiv.classList.add('show');
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = 'Bağlantı hatası. API çalışıyor mu kontrol edin.';
        errorDiv.classList.add('show');
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentToken = null;
    currentUser = null;
    showLogin();
}

function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('main-panel').style.display = 'none';
}

function showPanel() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-panel').style.display = 'grid';
    
    // User info
    const userInfo = document.getElementById('user-info');
    if (userInfo && currentUser) {
        userInfo.textContent = `👤 ${currentUser.username}`;
    }
}

// ===================================
// NAVIGATION
// ===================================

function navigateToPage(pageName) {
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    // Show selected page
    const selectedPage = document.getElementById(`page-${pageName}`);
    if (selectedPage) {
        selectedPage.classList.add('active');
    }
    
    // Update nav active state
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Load page data
    switch(pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'licenses':
            loadLicenses();
            break;
        case 'users':
            loadUsers();
            break;
        case 'receipts':
            loadReceipts();
            break;
        case 'stats':
            loadStats();
            break;
    }
}

// ===================================
// DASHBOARD
// ===================================

async function loadDashboard() {
    try {
        console.log('Loading dashboard...');
        
        // Load stats
        const [licenses, users, receipts] = await Promise.all([
            fetchAPI('/api/admin/licenses'),
            fetchAPI('/api/admin/users'),
            fetchAPI('/api/admin/stats/daily?start_date=2024-01-01&end_date=2099-12-31')
        ]);
        
        console.log('Data loaded:', { licenses: licenses.data.length, users: users.data.length });
        
        // Update stat cards
        updateStatCard('total-licenses', licenses.data.length);
        updateStatCard('active-licenses', licenses.data.filter(l => l.status === 'active').length);
        updateStatCard('total-users', users.data.length);
        updateStatCard('online-users', users.data.filter(u => u.is_online).length);
        
        // Calculate today's stats
        const today = new Date().toISOString().split('T')[0];
        const todayStats = receipts.data.find(r => r.stat_date === today) || { receipts: 0, amount: 0 };
        updateStatCard('today-receipts', todayStats.receipts || 0);
        updateStatCard('today-amount', formatCurrency(todayStats.amount || 0));
        
        // Calculate month stats
        const thisMonth = new Date().toISOString().slice(0, 7);
        const monthStats = receipts.data
            .filter(r => r.stat_date && r.stat_date.startsWith(thisMonth))
            .reduce((acc, r) => ({
                receipts: acc.receipts + (parseInt(r.receipts) || 0),
                amount: acc.amount + (parseFloat(r.amount) || 0)
            }), { receipts: 0, amount: 0 });
        
        updateStatCard('month-receipts', monthStats.receipts);
        updateStatCard('month-amount', formatCurrency(monthStats.amount));
        
        // Load charts
        loadCharts(receipts.data);
        
    } catch (error) {
        console.error('Dashboard load error:', error);
    }
}

function updateStatCard(id, value) {
    const element = document.getElementById(id);
    if (element) {
        // Remove loading spinner
        element.innerHTML = value;
        // Add animation
        element.style.opacity = '0';
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transition = 'opacity 0.5s ease';
        }, 50);
    }
}

// ===================================
// LICENSES
// ===================================

async function loadLicenses() {
    try {
        const response = await fetchAPI('/api/admin/licenses');
        const licenses = response.data;
        
        const tbody = document.querySelector('#licenses-table tbody');
        tbody.innerHTML = '';
        
        licenses.forEach(license => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><code style="background: rgba(59,130,246,0.1); padding: 4px 8px; border-radius: 6px; font-size: 0.875rem;">${license.license_key}</code></td>
                <td>${license.company_name || '-'}</td>
                <td><span class="badge badge-${license.status}">${getStatusText(license.status)}</span></td>
                <td>${license.days_remaining || 0} gün</td>
                <td>${license.active_devices || 0} / ${license.max_devices}</td>
                <td>${formatDate(license.created_at)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="window.viewLicenseDetail(${license.id})"><i class="fas fa-eye"></i> Detay</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        console.error('Licenses load error:', error);
    }
}

async function handleCreateLicense() {
    const companyName = document.getElementById('new-company-name').value;
    const contactEmail = document.getElementById('new-contact-email').value;
    const contactPhone = document.getElementById('new-contact-phone').value;
    const days = document.getElementById('new-days').value;
    const maxDevices = document.getElementById('new-max-devices').value;
    const notes = document.getElementById('new-notes').value;
    
    try {
        const response = await fetchAPI('/api/admin/licenses/create', {
            method: 'POST',
            body: JSON.stringify({
                company_name: companyName,
                contact_email: contactEmail,
                contact_phone: contactPhone,
                days: parseInt(days),
                max_devices: parseInt(maxDevices),
                notes
            })
        });
        
        if (response.success) {
            alert(`Lisans oluşturuldu!\n\nLisans Anahtarı: ${response.license_key}\n\nBu anahtarı müşteriye gönderin.`);
            hideModal('create-license-modal');
            loadLicenses();
        }
    } catch (error) {
        console.error('Create license error:', error);
        alert('Lisans oluşturma hatası: ' + error.message);
    }
}

// ===================================
// USERS
// ===================================

async function loadUsers() {
    try {
        const response = await fetchAPI('/api/admin/users');
        const users = response.data;
        
        const tbody = document.querySelector('#users-table tbody');
        tbody.innerHTML = '';
        
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.pc_name || '-'}</td>
                <td><code style="font-size: 0.75rem;">${user.license_key || '-'}</code></td>
                <td><span class="badge ${user.is_online ? 'badge-success' : 'badge-secondary'}">${user.is_online ? '🟢 Online' : '⚫ Offline'}</span></td>
                <td>${user.total_receipts || 0}</td>
                <td>${formatCurrency(user.total_amount || 0)}</td>
                <td>${formatDateTime(user.last_seen)}</td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        console.error('Users load error:', error);
    }
}

// ===================================
// RECEIPTS
// ===================================

async function loadReceipts() {
    const startDate = document.getElementById('filter-start-date')?.value || '2024-01-01';
    const endDate = document.getElementById('filter-end-date')?.value || '2099-12-31';
    
    try {
        const response = await fetchAPI(`/api/admin/receipts/export?start_date=${startDate}&end_date=${endDate}`);
        const receipts = response.data;
        
        const tbody = document.querySelector('#receipts-table tbody');
        tbody.innerHTML = '';
        
        receipts.slice(0, 100).forEach(receipt => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${receipt['Yazdırma Zamanı']}</td>
                <td>${receipt['Fiş No']}</td>
                <td>${receipt['Firma Adı']}</td>
                <td>${receipt['Tutar (TL)']} ₺</td>
                <td>${receipt['KDV Tutarı (TL)']} ₺</td>
                <td>${receipt['Açıklama']}</td>
                <td>${receipt['Kasiyer']}</td>
                <td>${receipt['PC Adı']}</td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        console.error('Receipts load error:', error);
    }
}

async function handleExportExcel() {
    const startDate = document.getElementById('filter-start-date')?.value || '2024-01-01';
    const endDate = document.getElementById('filter-end-date')?.value || '2099-12-31';
    
    try {
        const response = await fetchAPI(`/api/admin/receipts/export?start_date=${startDate}&end_date=${endDate}`);
        const receipts = response.data;
        
        // Convert to CSV
        const csv = convertToCSV(receipts);
        
        // Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `fisler_${startDate}_${endDate}.csv`;
        link.click();
        
        alert(`${receipts.length} fiş Excel'e aktarıldı!`);
        
    } catch (error) {
        console.error('Export error:', error);
        alert('Export hatası: ' + error.message);
    }
}

// ===================================
// CHARTS
// ===================================

function loadCharts(statsData) {
    // Son 7 gün
    const last7Days = statsData.slice(-7);
    
    // Fiş sayısı grafiği
    const receiptsChart = document.getElementById('chart-receipts');
    if (receiptsChart) {
        new Chart(receiptsChart, {
            type: 'line',
            data: {
                labels: last7Days.map(d => formatDate(d.stat_date)),
                datasets: [{
                    label: 'Fiş Sayısı',
                    data: last7Days.map(d => d.receipts || 0),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
    
    // Ciro grafiği
    const amountChart = document.getElementById('chart-amount');
    if (amountChart) {
        new Chart(amountChart, {
            type: 'bar',
            data: {
                labels: last7Days.map(d => formatDate(d.stat_date)),
                datasets: [{
                    label: 'Ciro (TL)',
                    data: last7Days.map(d => d.amount || 0),
                    backgroundColor: 'rgba(118, 75, 162, 0.8)',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
}

// ===================================
// HELPER FUNCTIONS
// ===================================

async function fetchAPI(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`
        }
    };
    
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    });
    
    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }
    
    return await response.json();
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount) + ' ₺';
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR');
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('tr-TR');
}

function getStatusText(status) {
    const statusMap = {
        'active': '✅ Aktif',
        'expired': '❌ Süresi Dolmuş',
        'suspended': '⏸️ Askıda'
    };
    return statusMap[status] || status;
}

function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
        headers.map(header => {
            const value = row[header];
            return typeof value === 'string' && value.includes(',') 
                ? `"${value}"` 
                : value;
        }).join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
}

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.querySelector('.toggle-password i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleBtn.className = 'fas fa-eye';
    }
}

// Make togglePassword global
window.togglePassword = togglePassword;

// View license detail
async function viewLicenseDetail(licenseId) {
    currentLicenseId = licenseId; // Set global ID
    
    try {
        const response = await fetchAPI(`/api/admin/licenses/${licenseId}`);
        const license = response.data;
        
        const modal = document.getElementById('license-detail-modal');
        const content = document.getElementById('license-detail-content');
        
        content.innerHTML = `
            <div style="display: grid; gap: 1rem;">
                <div><strong>Lisans Anahtarı:</strong> <code>${license.license_key}</code></div>
                <div><strong>Şirket:</strong> ${license.company_name || '-'}</div>
                <div><strong>E-posta:</strong> ${license.contact_email || '-'}</div>
                <div><strong>Telefon:</strong> ${license.contact_phone || '-'}</div>
                <div><strong>Durum:</strong> <span class="badge badge-${license.status}">${getStatusText(license.status)}</span></div>
                <div><strong>Kalan Gün:</strong> ${license.days_remaining || 0} gün</div>
                <div><strong>Maksimum Cihaz:</strong> ${license.max_devices}</div>
                <div><strong>Aktif Cihaz:</strong> ${license.active_devices || 0}</div>
                <div><strong>Oluşturulma:</strong> ${formatDateTime(license.created_at)}</div>
                <div><strong>Son Kontrol:</strong> ${formatDateTime(license.last_check)}</div>
                <div><strong>Notlar:</strong> ${license.notes || '-'}</div>
            </div>
        `;
        
        showModal('license-detail-modal');
        
    } catch (error) {
        console.error('License detail error:', error);
        alert('Lisans detayı yüklenemedi');
    }
}

window.viewLicenseDetail = viewLicenseDetail;

// Global license ID for modal actions
let currentLicenseId = null;

// View license detail (updated)
async function viewLicenseDetailUpdated(licenseId) {
    currentLicenseId = licenseId;
    await viewLicenseDetail(licenseId);
}

// Delete license
async function handleDeleteLicense() {
    if (!currentLicenseId) {
        alert('Lisans seçilmedi');
        return;
    }
    
    if (!confirm('Bu lisansı silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) {
        return;
    }
    
    try {
        const response = await fetchAPI(`/api/admin/licenses/${currentLicenseId}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            alert('Lisans silindi!');
            hideModal('license-detail-modal');
            loadLicenses();
            loadDashboard();
        } else {
            alert('Silme hatası: ' + response.error);
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('Lisans silinemedi');
    }
}

// Add days to license
async function handleAddDays() {
    if (!currentLicenseId) {
        alert('Lisans seçilmedi');
        return;
    }
    
    const days = prompt('Kaç gün eklemek istiyorsunuz?', '30');
    if (!days || isNaN(days)) return;
    
    try {
        const response = await fetchAPI(`/api/admin/licenses/${currentLicenseId}`, {
            method: 'PUT',
            body: JSON.stringify({
                action: 'add_days',
                days: parseInt(days)
            })
        });
        
        if (response.success) {
            alert(`${days} gün eklendi!`);
            viewLicenseDetail(currentLicenseId);
            loadLicenses();
            loadDashboard();
        } else {
            alert('Güncelleme hatası: ' + response.error);
        }
    } catch (error) {
        console.error('Add days error:', error);
        alert('Gün eklenemedi');
    }
}

// Suspend license
async function handleSuspendLicense() {
    if (!currentLicenseId) {
        alert('Lisans seçilmedi');
        return;
    }
    
    if (!confirm('Bu lisansı askıya almak istediğinize emin misiniz?')) {
        return;
    }
    
    try {
        const response = await fetchAPI(`/api/admin/licenses/${currentLicenseId}`, {
            method: 'PUT',
            body: JSON.stringify({
                action: 'set_status',
                status: 'suspended'
            })
        });
        
        if (response.success) {
            alert('Lisans askıya alındı!');
            viewLicenseDetail(currentLicenseId);
            loadLicenses();
            loadDashboard();
        } else {
            alert('Güncelleme hatası: ' + response.error);
        }
    } catch (error) {
        console.error('Suspend error:', error);
        alert('Lisans askıya alınamadı');
    }
}
