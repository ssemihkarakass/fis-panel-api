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
        case 'activities':
            loadActivities();
            break;
        case 'sessions':
            loadSessions();
            break;
    }
}
// DASHBOARD
// ===================================

async function loadDashboard() {
    try {
        console.log('Loading dashboard...');
        
        // Load stats - YENİ: Bugünkü fişler endpoint'i ekledik
        const [licenses, users, receipts, todayData] = await Promise.all([
            fetchAPI('/api/admin/licenses'),
            fetchAPI('/api/admin/users'),
            fetchAPI('/api/admin/stats/daily?start_date=2024-01-01&end_date=2099-12-31'),
            fetchAPI('/api/admin/dashboard/today').catch(() => ({ today: { total_receipts: 0, total_amount: 0 }, active_sessions: 0 }))
        ]);
        
        console.log('Data loaded:', { licenses: licenses.data.length, users: users.data.length });
        console.log('Bugünkü data:', todayData);
        
        // Update stat cards
        updateStatCard('total-licenses', licenses.data.length);
        updateStatCard('active-licenses', licenses.data.filter(l => l.status === 'active').length);
        updateStatCard('total-users', users.data.length);
        updateStatCard('online-users', users.data.filter(u => u.is_online).length);
        
        // Bugünkü fişler - YENİ endpoint'ten al
        if (todayData.today) {
            updateStatCard('today-receipts', todayData.today.total_receipts || 0);
            updateStatCardWithScale('today-amount', todayData.today.total_amount || 0);
        } else {
            // Fallback: Eski yöntem
            const today = new Date().toISOString().split('T')[0];
            const todayStats = receipts.data.find(r => r.stat_date === today) || { receipts: 0, amount: 0 };
            updateStatCard('today-receipts', todayStats.receipts || 0);
            updateStatCardWithScale('today-amount', todayStats.amount || 0);
        }
        
        // Calculate month stats
        const thisMonth = new Date().toISOString().slice(0, 7);
        const monthStats = receipts.data
            .filter(r => r.stat_date && r.stat_date.startsWith(thisMonth))
            .reduce((acc, r) => ({
                receipts: acc.receipts + (parseInt(r.receipts) || 0),
                amount: acc.amount + (parseFloat(r.amount) || 0)
            }), { receipts: 0, amount: 0 });
        
        updateStatCard('month-receipts', monthStats.receipts);
        updateStatCardWithScale('month-amount', monthStats.amount);
        
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

// Tutar kartları için - sayı büyüdükçe kart yana büyür
function updateStatCardWithScale(id, amount) {
    const element = document.getElementById(id);
    if (element) {
        // Tutarı formatla
        const formattedAmount = formatCurrency(amount);
        element.innerHTML = formattedAmount;
        
        // Kartın parent'ını bul (stat-card)
        const card = element.closest('.stat-card');
        if (card) {
            // Tutar büyüklüğüne göre genişlik hesapla
            let scaleX = 1;
            if (amount >= 10000000) {        // 10M+
                scaleX = 1.3;
            } else if (amount >= 1000000) {  // 1M+
                scaleX = 1.2;
            } else if (amount >= 100000) {   // 100K+
                scaleX = 1.1;
            }
            
            // Sadece X ekseninde scale (yana büyüme)
            card.style.transform = `scaleX(${scaleX})`;
            card.style.transition = 'transform 0.5s ease';
            card.style.zIndex = scaleX > 1 ? '10' : '1';
        }
        
        // Animasyon
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
                <td>
                    <button class="btn btn-sm btn-primary" onclick="window.viewUserDetail(${user.id})" style="margin-right: 5px;">
                        <span class="material-icons" style="font-size: 1rem;">visibility</span> Detay
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="window.deleteUser(${user.id}, '${user.pc_name}')">
                        <span class="material-icons" style="font-size: 1rem;">delete</span> Sil
                    </button>
                </td>
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

// Büyük tutarlar için kısaltma (Dashboard için)
function formatCurrencyShort(amount) {
    if (amount >= 1000000) {
        return (amount / 1000000).toFixed(1) + 'M ₺';
    } else if (amount >= 1000) {
        return (amount / 1000).toFixed(1) + 'K ₺';
    } else {
        return amount.toFixed(2) + ' ₺';
    }
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

// View license detail (ULTRA DETAYLI)
async function viewLicenseDetail(licenseId) {
    currentLicenseId = licenseId; // Set global ID
    
    try {
        const response = await fetchAPI(`/api/admin/licenses/${licenseId}/details`);
        const { license, users, companies, activities, daily_stats } = response.data;
        
        const modal = document.getElementById('license-detail-modal');
        const content = document.getElementById('license-detail-content');
        
        content.innerHTML = `
            <div class="detail-section">
                <h3><span class="material-icons">vpn_key</span> Lisans Bilgileri</h3>
                <div class="detail-grid">
                    <div><strong>Lisans Anahtarı:</strong> <code>${license.license_key}</code></div>
                    <div><strong>Şirket:</strong> ${license.company_name || '-'}</div>
                    <div><strong>E-posta:</strong> ${license.contact_email || '-'}</div>
                    <div><strong>Telefon:</strong> ${license.contact_phone || '-'}</div>
                    <div><strong>Durum:</strong> <span class="badge ${license.status === 'active' ? 'badge-success' : 'badge-danger'}">${license.status}</span></div>
                    <div><strong>Kalan Gün:</strong> ${license.days_remaining} gün</div>
                    <div><strong>Bitiş Tarihi:</strong> ${formatDate(license.expires_at)}</div>
                    <div><strong>Maks. Cihaz:</strong> ${license.max_devices}</div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3><span class="material-icons">devices</span> Kullanıcılar (${users.length})</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>PC Adı</th>
                            <th>Durum</th>
                            <th>Toplam Fiş</th>
                            <th>Toplam Ciro</th>
                            <th>Son Görülme</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(u => `
                            <tr>
                                <td>${u.pc_name}</td>
                                <td><span class="badge ${u.is_online ? 'badge-success' : 'badge-secondary'}">${u.is_online ? 'Online' : 'Offline'}</span></td>
                                <td>${u.total_receipts || 0}</td>
                                <td>${formatCurrency(u.total_amount || 0)}</td>
                                <td>${formatDateTime(u.last_seen)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="detail-section">
                <h3><span class="material-icons">business</span> Firma Bazlı İstatistikler (${companies.length})</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Firma Adı</th>
                            <th>Toplam Fiş</th>
                            <th>Toplam Tutar</th>
                            <th>İlk Fiş</th>
                            <th>Son Fiş</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${companies.map(c => `
                            <tr>
                                <td><strong>${c.company_name}</strong></td>
                                <td>${c.total_receipts}</td>
                                <td>${formatCurrency(c.total_amount)}</td>
                                <td>${formatDateTime(c.first_receipt_date)}</td>
                                <td>${formatDateTime(c.last_receipt_date)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="detail-section">
                <h3><span class="material-icons">show_chart</span> Son 30 Gün Grafiği</h3>
                <canvas id="license-chart" style="max-height: 300px;"></canvas>
            </div>
            
            <div class="detail-section">
                <h3><span class="material-icons">list</span> Son Aktiviteler (Son 20)</h3>
                <div class="activity-list">
                    ${activities.slice(0, 20).map(a => `
                        <div class="activity-item">
                            <span class="activity-icon ${a.action_type === 'receipt_print' ? 'icon-receipt' : a.action_type === 'login' ? 'icon-login' : 'icon-other'}">
                                <span class="material-icons">${a.action_type === 'receipt_print' ? 'receipt' : a.action_type === 'login' ? 'login' : 'logout'}</span>
                            </span>
                            <div class="activity-details">
                                <strong>${a.action_details}</strong>
                                ${a.pc_name ? `<br><small>PC: ${a.pc_name}</small>` : ''}
                                ${a.company_name ? `<br><small>Firma: ${a.company_name}</small>` : ''}
                                ${a.amount ? `<br><small>Tutar: ${formatCurrency(a.amount)}</small>` : ''}
                                <br><small>${formatDateTime(a.created_at)}</small>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Grafik çiz
        setTimeout(() => {
            const ctx = document.getElementById('license-chart');
            if (ctx && daily_stats.length > 0) {
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: daily_stats.reverse().map(s => formatDate(s.stat_date)),
                        datasets: [{
                            label: 'Günlük Ciro',
                            data: daily_stats.map(s => parseFloat(s.amount || 0)),
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return formatCurrency(value);
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }, 100);
        
        showModal('license-detail-modal');
        
    } catch (error) {
        console.error('License detail error:', error);
        alert('Lisans detayı yüklenemedi');
    }
}

window.viewLicenseDetail = viewLicenseDetail;

// Delete user
async function deleteUser(userId, pcName) {
    if (!confirm(`"${pcName}" kullanıcısını silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!`)) {
        return;
    }
    
    try {
        const response = await fetchAPI(`/api/admin/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            alert('✅ Kullanıcı silindi!');
            loadUsers();
            loadDashboard();
        } else {
            alert('❌ Silme hatası: ' + response.error);
        }
    } catch (error) {
        console.error('Delete user error:', error);
        alert('❌ Kullanıcı silinemedi');
    }
}

window.deleteUser = deleteUser;

// Kullanıcı detayını göster
async function viewUserDetail(userId) {
    try {
        const response = await fetchAPI(`/api/admin/users/${userId}/details`);
        const { user, sessions, activities, companies } = response.data;
        
        const modal = document.getElementById('user-detail-modal');
        const content = document.getElementById('user-detail-content');
        
        content.innerHTML = `
            <div class="detail-section">
                <h3><span class="material-icons">person</span> Kullanıcı Bilgileri</h3>
                <div class="detail-grid">
                    <div><strong>PC Adı:</strong> ${user.pc_name}</div>
                    <div><strong>Lisans:</strong> <code>${user.license_key}</code></div>
                    <div><strong>Durum:</strong> <span class="badge ${user.is_online ? 'badge-success' : 'badge-secondary'}">${user.is_online ? 'Online' : 'Offline'}</span></div>
                    <div><strong>Toplam Fiş:</strong> ${user.total_receipts || 0}</div>
                    <div><strong>Toplam Ciro:</strong> ${formatCurrency(user.total_amount || 0)}</div>
                    <div><strong>Son Görülme:</strong> ${formatDateTime(user.last_seen)}</div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3><span class="material-icons">history</span> Oturum Geçmişi (Son 10)</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Başlangıç</th>
                            <th>Bitiş</th>
                            <th>Fiş Sayısı</th>
                            <th>Tutar</th>
                            <th>Durum</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sessions.slice(0, 10).map(s => `
                            <tr>
                                <td>${formatDateTime(s.session_start)}</td>
                                <td>${s.session_end ? formatDateTime(s.session_end) : '<span class="badge badge-success">Aktif</span>'}</td>
                                <td>${s.total_receipts || 0}</td>
                                <td>${formatCurrency(s.total_amount || 0)}</td>
                                <td><span class="badge ${s.status === 'active' ? 'badge-success' : 'badge-secondary'}">${s.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="detail-section">
                <h3><span class="material-icons">business</span> Firma Bazlı İstatistikler</h3>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Firma Adı</th>
                            <th>Fiş Sayısı</th>
                            <th>Toplam Tutar</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${companies.map(c => `
                            <tr>
                                <td><strong>${c.company_name}</strong></td>
                                <td>${c.receipt_count}</td>
                                <td>${formatCurrency(c.total_amount)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="detail-section">
                <h3><span class="material-icons">list</span> Son Aktiviteler (Son 20)</h3>
                <div class="activity-list">
                    ${activities.slice(0, 20).map(a => `
                        <div class="activity-item">
                            <span class="activity-icon ${a.action_type === 'receipt_print' ? 'icon-receipt' : a.action_type === 'login' ? 'icon-login' : 'icon-other'}">
                                <span class="material-icons">${a.action_type === 'receipt_print' ? 'receipt' : a.action_type === 'login' ? 'login' : 'logout'}</span>
                            </span>
                            <div class="activity-details">
                                <strong>${a.action_details}</strong>
                                ${a.company_name ? `<br><small>Firma: ${a.company_name}</small>` : ''}
                                ${a.amount ? `<br><small>Tutar: ${formatCurrency(a.amount)}</small>` : ''}
                                <br><small>${formatDateTime(a.created_at)}</small>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        showModal('user-detail-modal');
        
    } catch (error) {
        console.error('User detail error:', error);
        alert('Kullanıcı detayı yüklenemedi');
    }
}

window.viewUserDetail = viewUserDetail;

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

// ===================================
// ACTIVITIES
// ===================================

async function loadActivities() {
    try {
        const response = await fetchAPI('/api/admin/activities?limit=100');
        const activities = response.data;
        
        const tbody = document.querySelector('#activities-table tbody');
        tbody.innerHTML = '';
        
        if (activities && activities.length > 0) {
            activities.forEach(activity => {
                const tr = document.createElement('tr');
                const actionClass = getActionClass(activity.action_type);
                const actionText = getActionText(activity.action_type);
                
                tr.innerHTML = `
                    <td>${formatDateTime(activity.created_at)}</td>
                    <td><span class="badge badge-${actionClass}">${actionText}</span></td>
                    <td>${activity.action_details || '-'}</td>
                    <td>${activity.company_name || '-'}</td>
                    <td>${activity.receipt_no || '-'}</td>
                    <td>${activity.amount ? formatCurrency(activity.amount) : '-'}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #999;">Henüz aktivite yok</td></tr>';
        }
        
    } catch (error) {
        console.error('Activities load error:', error);
        const tbody = document.querySelector('#activities-table tbody');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #f56565;">Yükleme hatası!</td></tr>';
    }
}

function getActionClass(actionType) {
    const classes = {
        'login': 'success',
        'logout': 'danger',
        'receipt_print': 'primary',
        'company_add': 'info',
        'company_edit': 'warning',
        'company_delete': 'danger',
        'excel_export': 'info'
    };
    return classes[actionType] || 'secondary';
}

function getActionText(actionType) {
    const texts = {
        'login': '🟢 Giriş',
        'logout': '🔴 Çıkış',
        'receipt_print': '🧾 Fiş',
        'company_add': '➕ Firma Ekle',
        'company_edit': '✏️ Firma Düzenle',
        'company_delete': '🗑️ Firma Sil',
        'excel_export': '📊 Excel'
    };
    return texts[actionType] || actionType;
}

// ===================================
// SESSIONS
// ===================================

let allSessions = [];
let currentSessionId = null;

async function loadSessions() {
    try {
        // Lisansları yükle ve sırala
        const licensesRes = await fetchAPI('/api/admin/licenses');
        const filterLicense = document.getElementById('filter-license');
        if (filterLicense) {
            filterLicense.innerHTML = '<option value="">Tüm Lisanslar</option>';
            // Alfabetik sırala
            const sortedLicenses = licensesRes.data.sort((a, b) => 
                (a.company_name || '').localeCompare(b.company_name || '')
            );
            sortedLicenses.forEach(license => {
                filterLicense.innerHTML += `<option value="${license.id}">${license.company_name} (${license.license_key.substring(0, 15)}...)</option>`;
            });
        }

        // Kullanıcıları yükle
        const usersRes = await fetchAPI('/api/admin/users');
        const filterUser = document.getElementById('filter-user');
        if (filterUser) {
            filterUser.innerHTML = '<option value="">Tüm Kullanıcılar</option>';
            usersRes.data.forEach(user => {
                filterUser.innerHTML += `<option value="${user.id}">${user.pc_name}</option>`;
            });
        }

        // Oturumları yükle
        const response = await fetchAPI('/api/admin/sessions');
        allSessions = response.data;
        
        displaySessions(allSessions);
        
    } catch (error) {
        console.error('Sessions load error:', error);
        const container = document.getElementById('sessions-list');
        if (container) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #f56565;">Yükleme hatası!</div>';
        }
    }
}

function displaySessions(sessions) {
    const container = document.getElementById('sessions-list');
    if (!container) return;
    
    if (sessions && sessions.length > 0) {
        container.innerHTML = sessions.map(session => `
            <div onclick="selectSession(${session.id})" style="
                padding: 15px;
                margin-bottom: 10px;
                border: 2px solid ${currentSessionId === session.id ? '#667eea' : '#2d3748'};
                border-radius: 8px;
                cursor: pointer;
                background: ${currentSessionId === session.id ? '#1a202c' : '#2d3748'};
                transition: all 0.3s;
            " onmouseover="this.style.borderColor='#667eea'; this.style.background='#1a202c'" onmouseout="if(${currentSessionId} !== ${session.id}) { this.style.borderColor='#2d3748'; this.style.background='#2d3748' }">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong style="color: #e2e8f0;">${session.pc_name || 'Bilinmeyen'}</strong>
                    <span class="badge badge-${session.status === 'active' ? 'success' : 'secondary'}" style="font-size: 11px;">
                        ${session.status === 'active' ? '🟢 Aktif' : '⚫ Bitti'}
                    </span>
                </div>
                <div style="font-size: 13px; color: #a0aec0; margin-bottom: 5px;">
                    📅 ${formatDateTime(session.session_start)}
                </div>
                <div style="display: flex; gap: 15px; font-size: 13px; color: #cbd5e0;">
                    <span>🧾 ${session.total_receipts || 0} fiş</span>
                    <span>💰 ${formatCurrency(session.total_amount || 0)}</span>
                </div>
            </div>
        `).join('');
    } else {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">Oturum bulunamadı</div>';
    }
}

function filterSessions() {
    const licenseId = document.getElementById('filter-license').value;
    const userId = document.getElementById('filter-user').value;
    
    let filtered = allSessions;
    
    if (licenseId) {
        filtered = filtered.filter(s => s.license_id == licenseId);
    }
    
    if (userId) {
        filtered = filtered.filter(s => s.user_id == userId);
    }
    
    displaySessions(filtered);
}

function selectSession(sessionId) {
    currentSessionId = sessionId;
    displaySessions(allSessions.filter(s => {
        const licenseId = document.getElementById('filter-license').value;
        const userId = document.getElementById('filter-user').value;
        return (!licenseId || s.license_id == licenseId) && (!userId || s.user_id == userId);
    }));
    loadSessionDetail(sessionId);
}

async function loadSessionDetail(sessionId) {
    const panel = document.getElementById('session-detail-panel');
    if (!panel) return;
    
    panel.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">Yükleniyor...</div>';
    
    try {
        const response = await fetchAPI(`/api/admin/sessions/${sessionId}/details`);
        
        if (response.success) {
            const session = response.session;
            const companies = response.companies;
            const activities = response.activities;
            
            let html = `
                <div style="padding: 15px;">
                    <!-- Oturum Bilgileri -->
                    <div style="background: #1a202c; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #2d3748;">
                        <h4 style="color: #e2e8f0; margin-bottom: 10px;">📊 Oturum #${sessionId}</h4>
                        <div style="font-size: 13px; color: #cbd5e0; line-height: 1.8;">
                            <div><strong style="color: #a0aec0;">PC:</strong> ${session.pc_name}</div>
                            <div><strong style="color: #a0aec0;">Başlangıç:</strong> ${formatDateTime(session.session_start)}</div>
                            <div><strong style="color: #a0aec0;">Bitiş:</strong> ${session.session_end ? formatDateTime(session.session_end) : '🟢 Devam ediyor'}</div>
                            <div><strong style="color: #a0aec0;">Toplam Fiş:</strong> ${session.total_receipts || 0}</div>
                            <div><strong style="color: #a0aec0;">Toplam Tutar:</strong> <span style="color: #48bb78; font-weight: 600;">${formatCurrency(session.total_amount || 0)}</span></div>
                        </div>
                    </div>
                    
                    <!-- Firmalar ve Fişler -->
                    <h4 style="color: #e2e8f0; margin-bottom: 10px;">🏢 Firmalar</h4>
            `;
            
            if (companies && companies.length > 0) {
                companies.forEach(company => {
                    html += `
                        <div style="background: #1a202c; border: 1px solid #2d3748; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <strong style="color: #667eea;">${company.company_name}</strong>
                                <span style="font-size: 12px; color: #a0aec0;">${company.receipt_count} fiş</span>
                            </div>
                            <div style="font-size: 13px; color: #48bb78; font-weight: 600;">
                                💰 ${formatCurrency(company.total_amount)}
                            </div>
                            <div style="font-size: 12px; color: #a0aec0; margin-top: 5px;">
                                Fiş No: ${company.first_receipt} - ${company.last_receipt}
                            </div>
                            
                            <!-- Fişler Detayı -->
                            <details style="margin-top: 10px;">
                                <summary style="cursor: pointer; color: #667eea; font-size: 12px;">Fişleri Göster</summary>
                                <div style="margin-top: 10px; max-height: 200px; overflow-y: auto;">
                    `;
                    
                    if (company.receipts && company.receipts.length > 0) {
                        company.receipts.forEach(receipt => {
                            const matrah = receipt.amount - receipt.vat_amount;
                            html += `
                                <div style="padding: 8px; background: #2d3748; border-radius: 4px; margin-bottom: 5px; font-size: 12px; color: #e2e8f0;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                                        <span>🧾 ${receipt.receipt_no}</span>
                                        <span style="font-weight: 600; color: #48bb78;">${formatCurrency(receipt.amount)}</span>
                                    </div>
                                    <div style="color: #a0aec0; font-size: 11px; display: flex; justify-content: space-between;">
                                        <span>Matrah: ${formatCurrency(matrah)}</span>
                                        <span>KDV %${receipt.vat_rate}: ${formatCurrency(receipt.vat_amount)}</span>
                                    </div>
                                </div>
                            `;
                        });
                    }
                    
                    html += `
                                </div>
                            </details>
                        </div>
                    `;
                });
            } else {
                html += '<div style="text-align: center; padding: 20px; color: #999;">Bu oturumda fiş kesilmemiş</div>';
            }
            
            // Aktiviteler
            html += `
                <h4 style="color: #e2e8f0; margin: 20px 0 10px 0;">📋 Aktiviteler</h4>
                <div style="max-height: 300px; overflow-y: auto;">
            `;
            
            if (activities && activities.length > 0) {
                activities.forEach(activity => {
                    const actionClass = getActionClass(activity.action_type);
                    const actionText = getActionText(activity.action_type);
                    
                    html += `
                        <div style="padding: 10px; background: #1a202c; border-left: 3px solid ${actionClass === 'success' ? '#48bb78' : actionClass === 'danger' ? '#f56565' : '#4299e1'}; border-radius: 4px; margin-bottom: 8px; font-size: 12px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span class="badge badge-${actionClass}" style="font-size: 11px;">${actionText}</span>
                                <span style="color: #a0aec0;">${new Date(activity.created_at).toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}</span>
                            </div>
                            <div style="color: #cbd5e0;">${activity.action_details || '-'}</div>
                        </div>
                    `;
                });
            } else {
                html += '<div style="text-align: center; padding: 20px; color: #718096;">Aktivite yok</div>';
            }
            
            html += `
                </div>
                
                <!-- Excel Export -->
                <button class="btn btn-success" onclick="exportSessionExcel(${sessionId})" style="width: 100%; margin-top: 20px;">
                    📊 Excel'e Aktar
                </button>
            </div>
            `;
            
            panel.innerHTML = html;
        }
        
    } catch (error) {
        console.error('Session detail error:', error);
        panel.innerHTML = '<div style="text-align: center; padding: 40px; color: #f56565;">Yükleme hatası!</div>';
    }
}

async function viewSessionDetail(sessionId) {
    try {
        const response = await fetchAPI(`/api/admin/sessions/${sessionId}/details`);
        
        if (response.success) {
            const session = response.session;
            const companies = response.companies;
            
            let detailHTML = `
                <div style="padding: 20px;">
                    <h2>Oturum Detayı #${sessionId}</h2>
                    <div style="margin: 20px 0; padding: 15px; background: #f7fafc; border-radius: 8px;">
                        <p><strong>PC Adı:</strong> ${session.pc_name}</p>
                        <p><strong>Başlangıç:</strong> ${formatDateTime(session.session_start)}</p>
                        <p><strong>Bitiş:</strong> ${session.session_end ? formatDateTime(session.session_end) : 'Devam ediyor'}</p>
                        <p><strong>Toplam Fiş:</strong> ${session.total_receipts || 0}</p>
                        <p><strong>Toplam Tutar:</strong> ${formatCurrency(session.total_amount || 0)}</p>
                    </div>
                    
                    <h3 style="margin-top: 30px;">Firmalar ve Fişler</h3>
            `;
            
            if (companies && companies.length > 0) {
                companies.forEach(company => {
                    detailHTML += `
                        <div style="margin: 15px 0; padding: 15px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <h4 style="color: #667eea;">${company.company_name}</h4>
                            <p><strong>Fiş Sayısı:</strong> ${company.receipt_count}</p>
                            <p><strong>Toplam Tutar:</strong> ${formatCurrency(company.total_amount)}</p>
                            <p><strong>İlk Fiş:</strong> ${company.first_receipt} - <strong>Son Fiş:</strong> ${company.last_receipt}</p>
                        </div>
                    `;
                });
            } else {
                detailHTML += '<p style="color: #999;">Bu oturumda fiş kesilmemiş</p>';
            }
            
            detailHTML += `
                    <div style="margin-top: 20px;">
                        <button class="btn btn-success" onclick="exportSessionExcel(${sessionId})">📊 Excel'e Aktar</button>
                        <button class="btn btn-secondary" onclick="hideModal('session-detail-modal')" style="margin-left: 10px;">Kapat</button>
                    </div>
                </div>
            `;
            
            // Modal göster
            showCustomModal('Oturum Detayı', detailHTML);
        }
        
    } catch (error) {
        console.error('Session detail error:', error);
        alert('Oturum detayı yüklenemedi!');
    }
}

async function exportSessionExcel(sessionId) {
    try {
        const response = await fetchAPI(`/api/admin/sessions/${sessionId}/export`);
        
        if (response.success && response.data) {
            // Excel formatında indir
            const allReceipts = [
                ...response.data['KDV %10'],
                ...response.data['KDV %20']
            ];
            
            const csv = convertToCSV(allReceipts);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `oturum_${sessionId}_fisler.csv`;
            link.click();
            
            alert('Excel dosyası indirildi!');
        }
    } catch (error) {
        console.error('Export error:', error);
        alert('Excel export hatası!');
    }
}

function showCustomModal(title, content) {
    // Basit modal göster
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;';
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 15px; max-width: 800px; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            ${content}
        </div>
    `;
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    document.body.appendChild(modal);
}
