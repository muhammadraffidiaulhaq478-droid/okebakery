const STORAGE_KEYS = {
    MENUS: 'oke_bakery_menus_v3',
    TRANSACTIONS: 'oke_bakery_transactions_v3',
    STORE: 'oke_bakery_store_v3',
    EMPLOYEES: 'oke_bakery_employees_v3',
    SESSION: 'oke_bakery_session_v3'
};

function createBakeryIllustration(emoji, bgHex = '#F5EBE0') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220">
        <rect width="320" height="220" fill="${bgHex}"/>
        <circle cx="160" cy="110" r="68" fill="#FFF8EE" stroke="#D5A06D" stroke-width="3"/>
        <text x="160" y="132" font-size="68" text-anchor="middle">${emoji}</text>
    </svg>`;
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

const DEFAULT_STORE_PROFILE = {
    name: 'Oke Bakery',
    address: 'Desa.Karangharjo Kec.Glenmore Kab.Banyuwangi, Jawa Timur',
    phone: '0877-5580-6346',
    logoDataUrl: ''
};

const DEFAULT_EMPLOYEES = [
    { id: 'emp_1', name: 'Admin Utama', role: 'Admin', pass: 'admin123' },
    { id: 'emp_2', name: 'Siti (Kasir)', role: 'Kasir', pass: '1234' },
    { id: 'emp_3', name: 'Budi (Kasir)', role: 'Kasir', pass: '1234' }
];

const DEFAULT_MENUS = [
    { id: 'm1', name: 'Roti Sobek Cokelat Lumer', price: 22000, category: 'Roti Manis', photo: createBakeryIllustration('🍞', '#F7E7D4') },
    { id: 'm2', name: 'Croissant Butter Prancis', price: 18000, category: 'Pastry & Croissant', photo: createBakeryIllustration('🥐', '#FCEAD2') },
    { id: 'm3', name: 'Roti Tawar Gandum Utuh', price: 20000, category: 'Roti Tawar', photo: createBakeryIllustration('🍞', '#EFE2D1') },
    { id: 'm4', name: 'Cinnamon Roll Glaze', price: 16000, category: 'Pastry & Croissant', photo: createBakeryIllustration('🥨', '#F6E3CE') },
    { id: 'm5', name: 'Donat Kentang Gula Halus', price: 8500, category: 'Donat & Kue', photo: createBakeryIllustration('🍩', '#FBE6DC') },
    { id: 'm6', name: 'Roti Abon Sapi Pedas', price: 15000, category: 'Roti Gurih', photo: createBakeryIllustration('🥪', '#F4E5D2') }
];

let storeProfile = { ...DEFAULT_STORE_PROFILE };
let employees = [];
let menus = [];
let cart = [];
let transactions = [];
let activeCashier = null;
let selectedCategory = 'Semua';
let selectedPOStatusFilter = 'Semua';
let orderType = 'direct'; // 'direct' atau 'po'
let currentReceiptData = null;
let pendingPhotoDataUrl = '';
let pendingStoreLogoDataUrl = '';

document.addEventListener('DOMContentLoaded', () => {
    loadDataFromStorage();
    applyStoreProfileToUI();
    checkActiveSessionOrShowLogin();
    setDefaultPODateTime();
    renderCategoryFilters();
    renderMenuGrid();
    renderCart();
    updateActivePOBadge();
    lucide.createIcons();
});

function loadDataFromStorage() {
    try {
        const savedStore = localStorage.getItem(STORAGE_KEYS.STORE);
        if (savedStore) storeProfile = { ...DEFAULT_STORE_PROFILE, ...JSON.parse(savedStore) };

        const savedEmp = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
        employees = savedEmp ? JSON.parse(savedEmp) : [...DEFAULT_EMPLOYEES];
        if (!savedEmp) localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));

        const savedMenus = localStorage.getItem(STORAGE_KEYS.MENUS);
        menus = savedMenus ? JSON.parse(savedMenus) : [...DEFAULT_MENUS];
        if (!savedMenus) localStorage.setItem(STORAGE_KEYS.MENUS, JSON.stringify(menus));

        const savedTrx = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
        transactions = savedTrx ? JSON.parse(savedTrx) : [];
    } catch (err) {
        console.error('Storage error:', err);
    }
}

function saveEmployeesToStorage() {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
}

function saveMenusToStorage() {
    localStorage.setItem(STORAGE_KEYS.MENUS, JSON.stringify(menus));
}

function saveTransactionsToStorage() {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    updateActivePOBadge();
}

// --- SESSION & LOGIN SYSTEM ---
function checkActiveSessionOrShowLogin() {
    renderLoginEmployeeDropdown();
    const session = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (session) {
        try {
            const parsed = JSON.parse(session);
            const emp = employees.find(e => e.id === parsed.id);
            if (emp) {
                activeCashier = emp;
                document.getElementById('header-active-cashier-badge').textContent = `Kasir: ${emp.name}`;
                document.getElementById('login-modal').classList.add('hidden');
                document.getElementById('login-modal').classList.remove('flex');
                return;
            }
        } catch(e) {}
    }
    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('login-modal').classList.add('flex');
}

function renderLoginEmployeeDropdown() {
    const select = document.getElementById('login-employee-select');
    select.innerHTML = employees.map(e => `<option value="${e.id}">${e.name} (${e.role})</option>`).join('');
    handleLoginEmployeeChange();
}

function handleLoginEmployeeChange() {
    const id = document.getElementById('login-employee-select').value;
    const emp = employees.find(e => e.id === id);
    if (emp) {
        document.getElementById('login-password-input').value = '';
    }
}

function handleLoginSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('login-employee-select').value;
    const pass = document.getElementById('login-password-input').value.trim();
    const emp = employees.find(e => e.id === id);

    if (!emp || emp.pass !== pass) {
        showToast('Kata sandi / PIN salah!', 'error');
        return;
    }

    activeCashier = emp;
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({ id: emp.id, name: emp.name }));
    document.getElementById('header-active-cashier-badge').textContent = `Kasir: ${emp.name}`;
    
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('login-modal').classList.remove('flex');
    showToast(`Selamat bekerja, ${emp.name}!`);
}

function lockSession() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    activeCashier = null;
    document.getElementById('login-password-input').value = '';
    renderLoginEmployeeDropdown();
    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('login-modal').classList.add('flex');
}

function formatRupiah(angka) {
    return 'Rp ' + (Number(angka) || 0).toLocaleString('id-ID');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-600' : (type === 'info' ? 'bg-bakery-cocoa' : 'bg-emerald-600');
    toast.className = `${bgColor} text-white px-4 py-3 rounded-xl shadow-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all duration-300`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function compressImageFile(file, maxWidth = 400, quality = 0.78) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function getDefaultLogoSVG(sizeClass = 'w-8 h-8') {
    return `<svg viewBox="0 0 64 64" class="${sizeClass}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="29" fill="#FFF8EE" stroke="#A96E38" stroke-width="3"/>
        <path d="M16 38C16 26 24 20 32 20C40 20 48 26 48 38C48 41 45 43 42 43H22C19 43 16 41 16 38Z" fill="#E59838" stroke="#4A2C18" stroke-width="2.5"/>
        <path d="M24 22C25 26 25 30 23 34M32 20C33 25 33 30 32 35M40 22C39 26 39 30 41 34" stroke="#4A2C18" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M22 47H42" stroke="#A96E38" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`;
}

function applyStoreProfileToUI() {
    document.getElementById('header-store-name').textContent = storeProfile.name;
    document.getElementById('header-store-meta').innerHTML = `
        <i data-lucide="map-pin" class="w-3 h-3 text-bakery-gold"></i>
        <span>${storeProfile.address} • WA: ${storeProfile.phone}</span>
    `;
    const logoBox = document.getElementById('header-logo-container');
    if (storeProfile.logoDataUrl) {
        logoBox.innerHTML = `<img src="${storeProfile.logoDataUrl}" alt="Logo" class="w-full h-full object-cover">`;
    } else {
        logoBox.innerHTML = getDefaultLogoSVG('w-8 h-8');
    }
}

// --- PENGATURAN MODAL (TOKO & KARYAWAN) ---
function openSettingsModal() {
    document.getElementById('store-name-input').value = storeProfile.name;
    document.getElementById('store-address-input').value = storeProfile.address;
    document.getElementById('store-phone-input').value = storeProfile.phone;
    pendingStoreLogoDataUrl = storeProfile.logoDataUrl || '';
    updateStoreLogoPreview();
    renderEmployeeManagementList();

    const modal = document.getElementById('settings-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lucide.createIcons();
}

function closeSettingsModal() {
    document.getElementById('settings-modal').classList.add('hidden');
    document.getElementById('settings-modal').classList.remove('flex');
}

function updateStoreLogoPreview() {
    const box = document.getElementById('store-logo-preview-box');
    if (pendingStoreLogoDataUrl) {
        box.innerHTML = `<img src="${pendingStoreLogoDataUrl}" alt="Logo Preview" class="w-full h-full object-cover">`;
    } else {
        box.innerHTML = getDefaultLogoSVG('w-12 h-12');
    }
}

async function handleStoreLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
        pendingStoreLogoDataUrl = await compressImageFile(file, 240, 0.85);
        updateStoreLogoPreview();
    } catch (err) {
        showToast('Gagal memproses logo.', 'error');
    }
}

function resetStoreLogo() {
    pendingStoreLogoDataUrl = '';
    document.getElementById('store-logo-file').value = '';
    updateStoreLogoPreview();
}

function saveStoreProfile(e) {
    e.preventDefault();
    storeProfile = {
        name: document.getElementById('store-name-input').value.trim() || 'Oke Bakery',
        address: document.getElementById('store-address-input').value.trim(),
        phone: document.getElementById('store-phone-input').value.trim(),
        logoDataUrl: pendingStoreLogoDataUrl
    };
    localStorage.setItem(STORAGE_KEYS.STORE, JSON.stringify(storeProfile));
    applyStoreProfileToUI();
    showToast('Profil toko & logo berhasil diperbarui!');
}

function renderEmployeeManagementList() {
    const list = document.getElementById('employee-list-container');
    list.innerHTML = employees.map(emp => `
        <div class="p-3 flex items-center justify-between gap-3">
            <div>
                <div class="flex items-center gap-2">
                    <span class="font-bold text-sm text-bakery-espresso">${emp.name}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${emp.role === 'Admin' ? 'bg-bakery-cocoa text-white' : 'bg-bakery-latte text-bakery-cocoa'}">${emp.role}</span>
                </div>
                <p class="text-[11px] text-bakery-cocoa/70 font-mono mt-0.5">PIN / Sandi: ••••••</p>
            </div>
            <div class="flex items-center gap-1.5">
                <button type="button" onclick="editEmployee('${emp.id}')" class="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 transition" title="Edit Karyawan">
                    <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                </button>
                ${employees.length > 1 ? `
                    <button type="button" onclick="deleteEmployee('${emp.id}')" class="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition" title="Hapus">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

function openAddEmployeeForm() {
    document.getElementById('employee-form').classList.remove('hidden');
    document.getElementById('edit-employee-id').value = '';
    document.getElementById('emp-name').value = '';
    document.getElementById('emp-pass').value = '';
    document.getElementById('emp-role').value = 'Kasir';
}

function cancelEmployeeForm() {
    document.getElementById('employee-form').classList.add('hidden');
}

function editEmployee(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    document.getElementById('employee-form').classList.remove('hidden');
    document.getElementById('edit-employee-id').value = emp.id;
    document.getElementById('emp-name').value = emp.name;
    document.getElementById('emp-role').value = emp.role;
    document.getElementById('emp-pass').value = emp.pass;
}

function saveEmployee(e) {
    e.preventDefault();
    const editId = document.getElementById('edit-employee-id').value;
    const name = document.getElementById('emp-name').value.trim();
    const role = document.getElementById('emp-role').value;
    const pass = document.getElementById('emp-pass').value.trim();

    if (!name || !pass) {
        showToast('Nama dan kata sandi wajib diisi!', 'error');
        return;
    }

    if (editId) {
        const idx = employees.findIndex(e => e.id === editId);
        if (idx !== -1) {
            employees[idx] = { ...employees[idx], name, role, pass };
            showToast(`Karyawan ${name} diperbarui!`);
        }
    } else {
        const newEmp = {
            id: 'emp_' + Date.now(),
            name,
            role,
            pass
        };
        employees.push(newEmp);
        showToast(`Karyawan ${name} ditambahkan!`);
    }

    saveEmployeesToStorage();
    cancelEmployeeForm();
    renderEmployeeManagementList();
    renderLoginEmployeeDropdown();
}

function deleteEmployee(id) {
    if (employees.length <= 1) {
        showToast('Minimal harus ada 1 akun karyawan/admin di sistem.', 'error');
        return;
    }
    employees = employees.filter(e => e.id !== id);
    saveEmployeesToStorage();
    renderEmployeeManagementList();
    renderLoginEmployeeDropdown();
    showToast('Karyawan dihapus', 'info');
}

// --- NAVIGASI UTAMA ---
function switchMainView(viewName) {
    const views = {
        pos: document.getElementById('view-pos'),
        po: document.getElementById('view-po'),
        history: document.getElementById('view-history')
    };
    const tabs = {
        pos: document.getElementById('nav-tab-pos'),
        po: document.getElementById('nav-tab-po'),
        history: document.getElementById('nav-tab-history')
    };

    Object.keys(views).forEach(key => {
        if (key === viewName) {
            views[key].classList.remove('hidden');
            if (key === 'pos') views[key].classList.add('grid');
            tabs[key].className = 'flex-1 lg:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all bg-bakery-gold text-bakery-espresso shadow-xs';
        } else {
            views[key].classList.add('hidden');
            if (key === 'pos') views[key].classList.remove('grid');
            tabs[key].className = 'flex-1 lg:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-bakery-cream hover:bg-white/10';
        }
    });

    // Sembunyikan floating bar keranjang di HP jika berpindah dari tab kasir
    const mobileCartBar = document.getElementById('mobile-cart-bar');
    if (mobileCartBar) {
        if (viewName === 'pos') {
            mobileCartBar.classList.remove('hidden');
        } else {
            mobileCartBar.classList.add('hidden');
        }
    }

    if (viewName === 'po') {
        renderPOStatusFilters();
        renderPOListView();
    } else if (viewName === 'history') {
        renderSalesHistoryView();
    }
    lucide.createIcons();
}

function setDefaultPODateTime() {
    const now = new Date();
    now.setHours(now.getHours() + 3);
    const tzOffset = now.getTimezoneOffset() * 60000;
    document.getElementById('po-datetime').value = new Date(now - tzOffset).toISOString().slice(0, 16);
}

// --- KATALOG & KASIR ---
function renderCategoryFilters() {
    const categories = ['Semua', ...new Set(menus.map(m => m.category))];
    const container = document.getElementById('category-filters');
    container.innerHTML = categories.map(cat => `
        <button type="button" onclick="selectCategory('${cat}')" 
            class="px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${cat === selectedCategory ? 'bg-bakery-cocoa text-white shadow-xs' : 'bg-bakery-cream text-bakery-cocoa hover:bg-bakery-latte'}">
            ${cat}
        </button>
    `).join('');
}

function selectCategory(cat) {
    selectedCategory = cat;
    renderCategoryFilters();
    renderMenuGrid();
}

function renderMenuGrid() {
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    const grid = document.getElementById('menu-grid');
    const filtered = menus.filter(item => {
        const matchCat = selectedCategory === 'Semua' || item.category === selectedCategory;
        const matchSearch = item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query);
        return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-full bg-white rounded-2xl p-8 text-center border border-bakery-latte"><p class="text-bakery-cocoa font-bold text-sm">Menu tidak ditemukan.</p></div>`;
        return;
    }

    const fallbackPhoto = createBakeryIllustration('🍞');
    grid.innerHTML = filtered.map(item => {
        const inCart = cart.find(c => c.id === item.id);
        const qtyBadge = inCart ? `<span class="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-bakery-cocoa text-white text-xs font-extrabold flex items-center justify-center shadow-md">${inCart.qty}</span>` : '';
        return `
            <button type="button" onclick="addToCart('${item.id}')" 
                class="relative group bg-white hover:bg-bakery-cream/80 rounded-2xl border border-bakery-latte hover:border-bakery-caramel shadow-xs transition-all text-left flex flex-col justify-between overflow-hidden active:scale-[0.98]">
                ${qtyBadge}
                <div class="w-full">
                    <div class="w-full h-28 bg-bakery-latte/50 overflow-hidden relative">
                        <img src="${item.photo || fallbackPhoto}" alt="${item.name}" onerror="this.src='${fallbackPhoto}'" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                        <span class="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-white/90 text-[10px] font-bold text-bakery-crust">${item.category}</span>
                    </div>
                    <div class="p-3 pb-1.5"><h3 class="font-bold text-xs sm:text-sm text-bakery-espresso line-clamp-2">${item.name}</h3></div>
                </div>
                <div class="px-3 pb-3 pt-1.5 flex items-center justify-between w-full">
                    <span class="font-extrabold text-xs sm:text-sm text-bakery-cocoa">${formatRupiah(item.price)}</span>
                    <span class="w-7 h-7 rounded-lg bg-bakery-latte group-hover:bg-bakery-cocoa group-hover:text-white text-bakery-cocoa flex items-center justify-center transition">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                    </span>
                </div>
            </button>
        `;
    }).join('');
    lucide.createIcons();
}

function addToCart(menuId) {
    const menu = menus.find(m => m.id === menuId);
    if (!menu) return;
    const existing = cart.find(c => c.id === menuId);
    if (existing) existing.qty += 1;
    else cart.push({ ...menu, qty: 1 });
    renderCart();
    renderMenuGrid();
}

function updateCartQty(menuId, delta) {
    const idx = cart.findIndex(c => c.id === menuId);
    if (idx === -1) return;
    cart[idx].qty += delta;
    if (cart[idx].qty <= 0) cart.splice(idx, 1);
    renderCart();
    renderMenuGrid();
}

function clearCart() {
    if (cart.length === 0) return;
    cart = [];
    document.getElementById('discount-input').value = 0;
    document.getElementById('cash-input').value = '';
    renderCart();
    renderMenuGrid();
    showToast('Keranjang dikosongkan', 'info');
}

function setOrderType(type) {
    orderType = type;
    const btnDirect = document.getElementById('btn-type-direct');
    const btnPO = document.getElementById('btn-type-po');
    const poSection = document.getElementById('po-form-section');
    const shippingRow = document.getElementById('summary-shipping-row');

    if (type === 'po') {
        btnPO.className = 'py-2 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all bg-bakery-crust text-white shadow-sm';
        btnDirect.className = 'py-2 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all text-bakery-cocoa hover:bg-white/60';
        poSection.classList.remove('hidden');
        shippingRow.classList.remove('hidden');
    } else {
        btnDirect.className = 'py-2 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all bg-bakery-cocoa text-white shadow-sm';
        btnPO.className = 'py-2 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all text-bakery-cocoa hover:bg-white/60';
        poSection.classList.add('hidden');
        shippingRow.classList.add('hidden');
    }
    recalculateTotals();
}

function handleShippingZoneChange() {
    const zoneVal = document.getElementById('po-shipping-zone').value;
    const customWrapper = document.getElementById('custom-shipping-wrapper');
    if (zoneVal === 'custom') customWrapper.classList.remove('hidden');
    else customWrapper.classList.add('hidden');
    recalculateTotals();
}

function getShippingCost() {
    if (orderType !== 'po') return 0;
    const zoneVal = document.getElementById('po-shipping-zone').value;
    if (zoneVal === 'custom') return Math.max(0, Number(document.getElementById('po-shipping-custom').value) || 0);
    return Number(zoneVal) || 0;
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    if (cart.length === 0) {
        container.innerHTML = `<div class="py-8 text-center text-bakery-cocoa/60"><i data-lucide="shopping-basket" class="w-10 h-10 mx-auto mb-2 opacity-40"></i><p class="text-xs font-semibold">Belum ada roti dipilih</p></div>`;
        lucide.createIcons();
        recalculateTotals();
        return;
    }

    const fallbackPhoto = createBakeryIllustration('🍞');
    container.innerHTML = cart.map(item => `
        <div class="py-2.5 flex items-center justify-between gap-2.5">
            <img src="${item.photo || fallbackPhoto}" alt="${item.name}" class="w-10 h-10 rounded-lg object-cover border border-bakery-latte shrink-0">
            <div class="flex-1 min-w-0">
                <p class="font-bold text-xs sm:text-sm text-bakery-espresso truncate">${item.name}</p>
                <p class="text-xs text-bakery-crust font-semibold">${formatRupiah(item.price)} <span class="text-bakery-cocoa/60 font-normal">x ${item.qty}</span></p>
            </div>
            <div class="flex items-center gap-1.5">
                <button type="button" onclick="updateCartQty('${item.id}', -1)" class="w-7 h-7 rounded-lg bg-bakery-latte hover:bg-bakery-caramel hover:text-white font-bold flex items-center justify-center">-</button>
                <span class="w-6 text-center text-xs font-extrabold">${item.qty}</span>
                <button type="button" onclick="updateCartQty('${item.id}', 1)" class="w-7 h-7 rounded-lg bg-bakery-latte hover:bg-bakery-caramel hover:text-white font-bold flex items-center justify-center">+</button>
            </div>
            <div class="w-20 text-right font-bold text-xs text-bakery-cocoa">${formatRupiah(item.price * item.qty)}</div>
        </div>
    `).join('');
    recalculateTotals();
}

function recalculateTotals() {
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const shipping = getShippingCost();
    const discount = Math.max(0, Number(document.getElementById('discount-input').value) || 0);
    const grandTotal = Math.max(0, subtotal + shipping - discount);
    const cashPaid = Math.max(0, Number(document.getElementById('cash-input').value) || 0);
    const change = cashPaid - grandTotal;

    document.getElementById('total-qty-label').textContent = totalQty;
    document.getElementById('summary-subtotal').textContent = formatRupiah(subtotal);
    document.getElementById('summary-shipping').textContent = formatRupiah(shipping);
    document.getElementById('summary-grand-total').textContent = formatRupiah(grandTotal);

    const changeEl = document.getElementById('summary-change');
    if (cashPaid === 0 && grandTotal > 0) {
        changeEl.textContent = 'Rp 0';
        changeEl.className = 'font-extrabold text-base text-bakery-cocoa/50';
    } else if (change < 0) {
        changeEl.textContent = `Kurang ${formatRupiah(Math.abs(change))}`;
        changeEl.className = 'font-extrabold text-sm text-red-600';
    } else {
        changeEl.textContent = formatRupiah(change);
        changeEl.className = 'font-extrabold text-base text-emerald-700';
    }
    return { totalQty, subtotal, shipping, discount, grandTotal, cashPaid, change };
}

function setExactCash() {
    const { grandTotal } = recalculateTotals();
    document.getElementById('cash-input').value = grandTotal;
    recalculateTotals();
}

// --- CHECKOUT & STRUK KONDISIONAL ---
function processCheckout() {
    if (cart.length === 0) {
        showToast('Pilih minimal 1 roti!', 'error');
        return;
    }

    const totals = recalculateTotals();
    const paymentMethod = document.getElementById('payment-method-input').value;
    let customerInfo = null;

    if (orderType === 'po') {
        const name = document.getElementById('po-name').value.trim();
        const phone = document.getElementById('po-phone').value.trim();
        const address = document.getElementById('po-address').value.trim();
        const datetime = document.getElementById('po-datetime').value;
        const notes = document.getElementById('po-notes').value.trim();

        if (!name || !phone || !address || !datetime) {
            showToast('Untuk Pre-Order, Nama, No. Telepon, Alamat, dan Jadwal Kirim wajib diisi!', 'error');
            return;
        }

        customerInfo = {
            name,
            phone,
            address,
            datetime: new Date(datetime).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }),
            notes
        };
    }

    const now = new Date();
    const trx = {
        id: 'TRX-' + now.getFullYear().toString().slice(-2) + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '-' + Math.floor(1000 + Math.random() * 9000),
        timestamp: now.toISOString(),
        dateFormatted: now.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
        cashierName: activeCashier ? activeCashier.name : 'Admin',
        orderType, // 'direct' atau 'po'
        poStatus: orderType === 'po' ? 'Menunggu Konfirmasi' : 'Selesai',
        customer: customerInfo,
        items: [...cart],
        ...totals,
        paymentMethod
    };

    transactions.unshift(trx);
    saveTransactionsToStorage();
    currentReceiptData = trx;

    renderReceiptModal(trx);
    showToast(`Transaksi ${trx.id} berhasil disimpan!`);

    // Reset cart
    cart = [];
    document.getElementById('discount-input').value = 0;
    document.getElementById('cash-input').value = '';
    if (orderType === 'po') {
        document.getElementById('po-name').value = '';
        document.getElementById('po-phone').value = '';
        document.getElementById('po-address').value = '';
        document.getElementById('po-notes').value = '';
    }
    renderCart();
    renderMenuGrid();
}

function renderReceiptModal(trx) {
    const area = document.getElementById('printable-receipt-area');
    const isPO = trx.orderType === 'po';

    let html = `
        <div class="text-center space-y-0.5 pb-2 border-b border-dashed border-stone-300">
            ${storeProfile.logoDataUrl ? `<img src="${storeProfile.logoDataUrl}" alt="Logo" class="w-10 h-10 mx-auto object-cover rounded-md mb-1">` : ''}
            <h3 class="font-bold text-sm tracking-wide text-stone-900">${storeProfile.name}</h3>
            <p class="text-[10px] text-stone-600">${storeProfile.address}</p>
            <p class="text-[10px] text-stone-600">WA: ${storeProfile.phone}</p>
        </div>
        
        <div class="py-2 border-b border-dashed border-stone-300 text-[11px] space-y-0.5">
            <div class="flex justify-between"><span>No. Struk</span><span class="font-bold">${trx.id}</span></div>
            <div class="flex justify-between"><span>Waktu</span><span>${trx.dateFormatted}</span></div>
            <div class="flex justify-between"><span>Kasir</span><span>${trx.cashierName}</span></div>
            <div class="flex justify-between"><span>Tipe</span><span class="font-bold">${isPO ? 'PRE-ORDER (PO)' : 'PEMBELIAN BIASA'}</span></div>
        </div>
    `;

    // KONDISIONAL: Tampilkan Nama, Alamat, HP, dan Jadwal HANYA untuk Pre-Order
    if (isPO && trx.customer) {
        html += `
            <div class="py-2 border-b border-dashed border-stone-300 text-[11px] space-y-0.5 bg-amber-50/50 p-1.5 rounded">
                <p class="font-bold text-stone-900 mb-1">DATA PEMESAN PRE-ORDER:</p>
                <div class="flex justify-between"><span>Nama</span><span class="font-bold">${trx.customer.name}</span></div>
                <div class="flex justify-between"><span>No. HP/WA</span><span>${trx.customer.phone}</span></div>
                <div><span>Alamat Kirim:</span><p class="font-semibold text-stone-900">${trx.customer.address}</p></div>
                <div class="pt-1"><span>Jadwal Kirim/Ambil:</span><p class="font-bold text-amber-900">${trx.customer.datetime}</p></div>
                ${trx.customer.notes ? `<div><span>Catatan:</span> <span class="italic">${trx.customer.notes}</span></div>` : ''}
            </div>
        `;
    }

    html += `
        <div class="py-2 border-b border-dashed border-stone-300 space-y-1">
            <p class="text-[10px] font-bold text-stone-500 uppercase">Rincian Item:</p>
    `;

    trx.items.forEach(item => {
        html += `
            <div class="flex justify-between items-start text-[11px]">
                <div class="flex-1 pr-2">
                    <p class="font-bold text-stone-900">${item.name}</p>
                    <p class="text-[10px] text-stone-600">${item.qty} x ${formatRupiah(item.price)}</p>
                </div>
                <span class="font-bold text-stone-900">${formatRupiah(item.price * item.qty)}</span>
            </div>
        `;
    });

    html += `
        </div>
        
        <div class="py-2 border-b border-dashed border-stone-300 text-[11px] space-y-0.5">
            <div class="flex justify-between"><span>Subtotal</span><span>${formatRupiah(trx.subtotal)}</span></div>
            ${trx.shipping > 0 ? `<div class="flex justify-between text-amber-900 font-semibold"><span>Ongkos Kirim</span><span>${formatRupiah(trx.shipping)}</span></div>` : ''}
            ${trx.discount > 0 ? `<div class="flex justify-between text-red-700"><span>Diskon</span><span>- ${formatRupiah(trx.discount)}</span></div>` : ''}
            <div class="flex justify-between font-bold text-sm pt-1 text-stone-900">
                <span>TOTAL</span>
                <span>${formatRupiah(trx.grandTotal)}</span>
            </div>
        </div>

        <div class="py-2 border-b border-dashed border-stone-300 text-[11px] space-y-0.5">
            <div class="flex justify-between"><span>Metode Bayar</span><span class="font-bold">${trx.paymentMethod}</span></div>
            <div class="flex justify-between"><span>Tunai / Bayar</span><span>${formatRupiah(trx.cashPaid)}</span></div>
            <div class="flex justify-between font-bold"><span>Kembalian</span><span>${formatRupiah(trx.change >= 0 ? trx.change : 0)}</span></div>
        </div>

        <div class="pt-3 text-center text-[10px] text-stone-600 space-y-1">
            <p class="font-bold text-stone-800">Terima Kasih Telah Berbelanja di ${storeProfile.name}!</p>
            <p class="italic">Roti Fresh Setiap Hari • Lembut & Nikmat</p>
        </div>
    `;

    area.innerHTML = html;
    const modal = document.getElementById('receipt-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lucide.createIcons();
}

function closeReceiptModal() {
    document.getElementById('receipt-modal').classList.add('hidden');
    document.getElementById('receipt-modal').classList.remove('flex');
}

function copyReceiptForWhatsApp() {
    if (!currentReceiptData) return;
    const t = currentReceiptData;
    const isPO = t.orderType === 'po';

    let text = `*STRUK TRANSAKSI - ${storeProfile.name}*\n`;
    text += `--------------------------------\n`;
    text += `No. Struk: ${t.id}\n`;
    text += `Waktu: ${t.dateFormatted}\n`;
    text += `Kasir: ${t.cashierName}\n`;
    text += `Tipe: ${isPO ? 'PRE-ORDER (PO)' : 'PEMBELIAN BIASA'}\n`;
    
    if (isPO && t.customer) {
        text += `\n*DATA PEMESAN PO:*\n`;
        text += `• Nama: ${t.customer.name}\n`;
        text += `• No. WA: ${t.customer.phone}\n`;
        text += `• Alamat: ${t.customer.address}\n`;
        text += `• Jadwal: ${t.customer.datetime}\n`;
        if (t.customer.notes) text += `• Catatan: ${t.customer.notes}\n`;
    }

    text += `\n*RINCIAN ITEM:*\n`;
    t.items.forEach(i => {
        text += `• ${i.name} (${i.qty}x @${formatRupiah(i.price)}) = *${formatRupiah(i.price * i.qty)}*\n`;
    });

    text += `--------------------------------\n`;
    text += `Subtotal: ${formatRupiah(t.subtotal)}\n`;
    if (t.shipping > 0) text += `Ongkir: ${formatRupiah(t.shipping)}\n`;
    if (t.discount > 0) text += `Diskon: -${formatRupiah(t.discount)}\n`;
    text += `*TOTAL: ${formatRupiah(t.grandTotal)}*\n`;
    text += `Metode Bayar: ${t.paymentMethod}\n`;
    text += `Bayar: ${formatRupiah(t.cashPaid)}\n`;
    text += `Kembalian: ${formatRupiah(t.change >= 0 ? t.change : 0)}\n`;
    text += `--------------------------------\n`;
    text += `Terima kasih telah berbelanja di ${storeProfile.name}! 🙏`;

    navigator.clipboard.writeText(text).then(() => {
        showToast('Struk berhasil disalin ke teks WhatsApp!');
    }).catch(() => {
        showToast('Gagal menyalin struk.', 'error');
    });
}

async function downloadReceiptPNG() {
    const area = document.getElementById('printable-receipt-area');
    if (!window.html2canvas) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = () => executeHtml2Canvas(area);
        document.head.appendChild(script);
    } else {
        executeHtml2Canvas(area);
    }
}

function executeHtml2Canvas(element) {
    html2canvas(element, { scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Struk-${currentReceiptData ? currentReceiptData.id : 'OkeBakery'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('Struk berhasil diunduh sebagai gambar!');
    }).catch(() => {
        showToast('Gagal mengunduh gambar struk.', 'error');
    });
}

// --- VIEW 2: KELOLA PRE-ORDER (PO) ---
function renderPOStatusFilters() {
    const statuses = ['Semua', 'Menunggu Konfirmasi', 'Sedang Diproses', 'Siap Dikirim', 'Selesai', 'Dibatalkan'];
    const container = document.getElementById('po-status-filters');
    container.innerHTML = statuses.map(st => `
        <button type="button" onclick="selectPOStatusFilter('${st}')" 
            class="px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${st === selectedPOStatusFilter ? 'bg-bakery-cocoa text-white shadow-xs' : 'bg-bakery-cream text-bakery-cocoa hover:bg-bakery-latte'}">
            ${st}
        </button>
    `).join('');
}

function selectPOStatusFilter(st) {
    selectedPOStatusFilter = st;
    renderPOStatusFilters();
    renderPOListView();
}

function renderPOListView() {
    const query = document.getElementById('po-search-input').value.toLowerCase().trim();
    const container = document.getElementById('po-cards-container');
    
    const poList = transactions.filter(t => {
        if (t.orderType !== 'po') return false;
        const matchStatus = selectedPOStatusFilter === 'Semua' || t.poStatus === selectedPOStatusFilter;
        const matchSearch = t.id.toLowerCase().includes(query) || (t.customer && (t.customer.name.toLowerCase().includes(query) || t.customer.phone.includes(query)));
        return matchStatus && matchSearch;
    });

    if (poList.length === 0) {
        container.innerHTML = `<div class="col-span-full bg-white rounded-2xl p-8 text-center border border-bakery-latte"><p class="text-bakery-cocoa font-bold text-sm">Tidak ada data Pre-Order.</p></div>`;
        return;
    }

    container.innerHTML = poList.map(po => {
        const statusColor = po.poStatus === 'Selesai' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                            (po.poStatus === 'Dibatalkan' ? 'bg-red-100 text-red-800 border-red-300' :
                            (po.poStatus === 'Siap Dikirim' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-amber-100 text-amber-900 border-amber-300'));

        return `
            <div class="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-bakery-latte flex flex-col justify-between space-y-4">
                <div class="flex items-start justify-between gap-2">
                    <div>
                        <span class="text-xs font-mono font-bold text-bakery-crust">${po.id}</span>
                        <h3 class="font-extrabold text-base text-bakery-espresso mt-0.5">${po.customer ? po.customer.name : '-'}</h3>
                        <p class="text-xs text-bakery-cocoa/70">WA: <a href="https://wa.me/${po.customer ? po.customer.phone.replace(/^0/, '62') : ''}" target="_blank" class="text-emerald-700 font-bold underline">${po.customer ? po.customer.phone : '-'}</a></p>
                    </div>
                    <span class="px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${statusColor}">${po.poStatus}</span>
                </div>

                <div class="bg-bakery-cream p-3 rounded-xl text-xs space-y-1 text-bakery-cocoa">
                    <p><strong class="text-bakery-espresso">Alamat:</strong> ${po.customer ? po.customer.address : '-'}</p>
                    <p><strong class="text-bakery-espresso">Jadwal Kirim:</strong> <span class="font-bold text-amber-900">${po.customer ? po.customer.datetime : '-'}</span></p>
                    ${po.customer && po.customer.notes ? `<p><strong class="text-bakery-espresso">Catatan:</strong> ${po.customer.notes}</p>` : ''}
                </div>

                <div class="space-y-1.5 border-t border-bakery-latte pt-3 text-xs">
                    <p class="font-bold text-bakery-cocoa">Rincian Roti:</p>
                    <div class="max-h-24 overflow-y-auto space-y-1 divide-y divide-bakery-latte/50">
                        ${po.items.map(i => `
                            <div class="flex justify-between pt-1">
                                <span>${i.name} (x${i.qty})</span>
                                <span class="font-bold">${formatRupiah(i.price * i.qty)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="border-t border-bakery-latte pt-3 flex items-center justify-between">
                    <div>
                        <p class="text-[11px] text-bakery-cocoa/70">Total + Ongkir</p>
                        <p class="font-extrabold text-base text-bakery-crust">${formatRupiah(po.grandTotal)}</p>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <select onchange="updatePOStatus('${po.id}', this.value)" class="px-2.5 py-1.5 rounded-xl bg-bakery-cream border border-bakery-latte text-xs font-bold text-bakery-espresso outline-none">
                            <option value="Menunggu Konfirmasi" ${po.poStatus === 'Menunggu Konfirmasi' ? 'selected' : ''}>Menunggu Konfirmasi</option>
                            <option value="Sedang Diproses" ${po.poStatus === 'Sedang Diproses' ? 'selected' : ''}>Sedang Diproses</option>
                            <option value="Siap Dikirim" ${po.poStatus === 'Siap Dikirim' ? 'selected' : ''}>Siap Dikirim</option>
                            <option value="Selesai" ${po.poStatus === 'Selesai' ? 'selected' : ''}>Selesai</option>
                            <option value="Dibatalkan" ${po.poStatus === 'Dibatalkan' ? 'selected' : ''}>Dibatalkan</option>
                        </select>
                        <button type="button" onclick="reprintPO('${po.id}')" class="p-2 rounded-xl bg-bakery-latte hover:bg-bakery-caramel hover:text-white transition" title="Cetak Ulang Struk">
                            <i data-lucide="printer" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    lucide.createIcons();
}

function updatePOStatus(trxId, newStatus) {
    const trx = transactions.find(t => t.id === trxId);
    if (!trx) return;
    trx.poStatus = newStatus;
    saveTransactionsToStorage();
    renderPOListView();
    updateActivePOBadge();
    showToast(`Status PO ${trxId} diubah ke ${newStatus}`);
}

function updateActivePOBadge() {
    const activeCount = transactions.filter(t => t.orderType === 'po' && t.poStatus !== 'Selesai' && t.poStatus !== 'Dibatalkan').length;
    const badge = document.getElementById('active-po-badge');
    if (badge) badge.textContent = activeCount;
}

function reprintPO(trxId) {
    const trx = transactions.find(t => t.id === trxId);
    if (!trx) return;
    currentReceiptData = trx;
    renderReceiptModal(trx);
}

// --- VIEW 3: RIWAYAT PENJUALAN ---
function renderSalesHistoryView() {
    const query = document.getElementById('history-search-input').value.toLowerCase().trim();
    const typeFilter = document.getElementById('history-type-filter').value;
    const datePreset = document.getElementById('history-date-preset').value;
    const customDateVal = document.getElementById('history-date-custom').value;

    let filtered = transactions.filter(t => {
        if (t.poStatus === 'Dibatalkan') return false;
        const matchType = typeFilter === 'all' || (typeFilter === 'direct' && t.orderType === 'direct') || (typeFilter === 'po' && t.orderType === 'po');
        const matchSearch = t.id.toLowerCase().includes(query) || t.cashierName.toLowerCase().includes(query) || (t.customer && t.customer.name.toLowerCase().includes(query));
        
        let matchDate = true;
        const trxDateStr = t.timestamp.slice(0, 10);
        const todayStr = new Date().toISOString().slice(0, 10);

        if (datePreset === 'today') {
            matchDate = trxDateStr === todayStr;
        } else if (datePreset === 'custom' && customDateVal) {
            matchDate = trxDateStr === customDateVal;
        }

        return matchType && matchSearch && matchDate;
    });

    const totalRevenue = filtered.reduce((sum, t) => sum + t.grandTotal, 0);
    const totalTrx = filtered.length;
    const directTrxCount = filtered.filter(t => t.orderType === 'direct').length;
    const poTrxCount = filtered.filter(t => t.orderType === 'po').length;
    const poRevenue = filtered.filter(t => t.orderType === 'po').reduce((sum, t) => sum + t.grandTotal, 0);
    const directRevenue = filtered.filter(t => t.orderType === 'direct').reduce((sum, t) => sum + t.grandTotal, 0);
    const itemsSold = filtered.reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.qty, 0), 0);

    document.getElementById('kpi-total-revenue').textContent = formatRupiah(totalRevenue);
    document.getElementById('kpi-total-trx').textContent = `${totalTrx} Nota`;
    document.getElementById('kpi-trx-breakdown').textContent = `${directTrxCount} Biasa • ${poTrxCount} PO`;
    document.getElementById('kpi-po-revenue').textContent = formatRupiah(poRevenue);
    document.getElementById('kpi-direct-revenue').textContent = `Biasa: ${formatRupiah(directRevenue)}`;
    document.getElementById('kpi-items-sold').textContent = `${itemsSold} Pcs`;

    const tbody = document.getElementById('sales-history-tbody');
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-bakery-cocoa/60 font-medium">Tidak ada riwayat transaksi yang cocok.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(t => {
        const isPO = t.orderType === 'po';
        const itemsSummary = t.items.map(i => `${i.name} (x${i.qty})`).join(', ');

        return `
            <tr class="hover:bg-bakery-cream/50 transition">
                <td class="py-3 px-4 font-mono">
                    <span class="font-bold text-bakery-espresso">${t.id}</span>
                    <p class="text-[10px] text-bakery-cocoa/60">${t.dateFormatted}</p>
                </td>
                <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isPO ? 'bg-amber-100 text-amber-900' : 'bg-bakery-latte text-bakery-cocoa'}">${isPO ? 'Pre-Order' : 'Biasa'}</span>
                    <p class="text-[11px] text-bakery-cocoa/70 mt-0.5">${t.cashierName}</p>
                </td>
                <td class="py-3 px-4 font-medium">
                    ${isPO && t.customer ? `<span class="font-bold text-bakery-espresso">${t.customer.name}</span><p class="text-[10px] text-bakery-cocoa/60">${t.customer.phone}</p>` : '<span class="text-bakery-cocoa/40">-</span>'}
                </td>
                <td class="py-3 px-4 max-w-xs truncate text-bakery-cocoa/80" title="${itemsSummary}">${itemsSummary}</td>
                <td class="py-3 px-4 text-right font-medium">${formatRupiah(t.shipping)}</td>
                <td class="py-3 px-4 text-right font-extrabold text-bakery-crust">${formatRupiah(t.grandTotal)}</td>
                <td class="py-3 px-4 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                        <button type="button" onclick="reprintPO('${t.id}')" class="p-1.5 rounded-lg bg-bakery-latte hover:bg-bakery-caramel hover:text-white transition" title="Cetak Struk">
                            <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                        </button>
                        ${activeCashier && activeCashier.role === 'Admin' ? `
                            <button type="button" onclick="confirmDeleteTransaction('${t.id}')" class="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition" title="Hapus Transaksi">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    lucide.createIcons();
}

function handleHistoryDatePreset() {
    const preset = document.getElementById('history-date-preset').value;
    const customInput = document.getElementById('history-date-custom');
    if (preset === 'custom') {
        customInput.classList.remove('hidden');
    } else {
        customInput.classList.add('hidden');
        customInput.value = '';
    }
    renderSalesHistoryView();
}

let pendingDeleteTrxId = null;
function confirmDeleteTransaction(trxId) {
    pendingDeleteTrxId = trxId;
    document.getElementById('confirm-modal-message').textContent = `Apakah Anda yakin ingin menghapus transaksi ${trxId}? Pendapatan akan dikurangkan.`;
    const modal = document.getElementById('confirm-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('confirm-modal-yes-btn').onclick = executeDeleteTransaction;
}

function closeConfirmModal() {
    document.getElementById('confirm-modal').classList.add('hidden');
    document.getElementById('confirm-modal').classList.remove('flex');
    pendingDeleteTrxId = null;
}

function executeDeleteTransaction() {
    if (!pendingDeleteTrxId) return;
    transactions = transactions.filter(t => t.id !== pendingDeleteTrxId);
    saveTransactionsToStorage();
    closeConfirmModal();
    renderSalesHistoryView();
    showToast('Transaksi berhasil dihapus', 'info');
}

function exportSalesCSV() {
    if (transactions.length === 0) {
        showToast('Tidak ada data transaksi untuk diexport.', 'error');
        return;
    }

    let csv = 'ID Struk,Waktu,Kasir,Tipe,Nama Pelanggan,No HP,Total Bayar,Metode Bayar,Status PO\n';
    transactions.forEach(t => {
        const name = t.customer ? t.customer.name.replace(/,/g, '') : '-';
        const phone = t.customer ? t.customer.phone : '-';
        csv += `"${t.id}","${t.dateFormatted}","${t.cashierName}","${t.orderType}","${name}","${phone}",${t.grandTotal},"${t.paymentMethod}","${t.poStatus}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan-Penjualan-OkeBakery-${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
    showToast('Laporan CSV berhasil diunduh!');
}

// --- MODAL 2: KELOLA MENU ROTI ---
function openMenuModal() {
    resetMenuForm();
    renderManageMenuList();
    const modal = document.getElementById('menu-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lucide.createIcons();
}

function closeMenuModal() {
    document.getElementById('menu-modal').classList.add('hidden');
    document.getElementById('menu-modal').classList.remove('flex');
    renderMenuGrid();
    renderCategoryFilters();
}

function resetMenuForm() {
    document.getElementById('menu-form').reset();
    document.getElementById('edit-menu-id').value = '';
    document.getElementById('menu-form-title').textContent = 'Tambah Menu Roti Baru';
    document.getElementById('menu-submit-text').textContent = 'Simpan ke Daftar Menu';
    document.getElementById('cancel-edit-btn').classList.add('hidden');
    pendingPhotoDataUrl = '';
    document.getElementById('menu-photo-preview').src = createBakeryIllustration('🍞');
}

function updateMenuPhotoPreviewFromUrl() {
    const url = document.getElementById('menu-photo-url').value.trim();
    const preview = document.getElementById('menu-photo-preview');
    if (url) {
        pendingPhotoDataUrl = url;
        preview.src = url;
    }
}

async function handleMenuPhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
        pendingPhotoDataUrl = await compressImageFile(file, 320, 0.8);
        document.getElementById('menu-photo-preview').src = pendingPhotoDataUrl;
        document.getElementById('menu-photo-url').value = '';
    } catch (err) {
        showToast('Gagal memproses foto produk.', 'error');
    }
}

function saveMenuItem(e) {
    e.preventDefault();
    const editId = document.getElementById('edit-menu-id').value;
    const name = document.getElementById('menu-name').value.trim();
    const price = Number(document.getElementById('menu-price').value) || 0;
    const category = document.getElementById('menu-category').value;
    const photo = pendingPhotoDataUrl || (editId ? menus.find(m => m.id === editId).photo : createBakeryIllustration('🍞'));

    if (!name || price <= 0) {
        showToast('Nama menu dan harga wajib diisi dengan benar!', 'error');
        return;
    }

    if (editId) {
        const idx = menus.findIndex(m => m.id === editId);
        if (idx !== -1) {
            menus[idx] = { ...menus[idx], name, price, category, photo };
            showToast(`Menu ${name} berhasil diperbarui!`);
        }
    } else {
        const newItem = {
            id: 'm_' + Date.now(),
            name,
            price,
            category,
            photo
        };
        menus.push(newItem);
        showToast(`Menu ${name} berhasil ditambahkan!`);
    }

    saveMenusToStorage();
    resetMenuForm();
    renderManageMenuList();
    renderMenuGrid();
    renderCategoryFilters();
}

function renderManageMenuList() {
    const list = document.getElementById('manage-menu-list');
    document.getElementById('manage-menu-count').textContent = menus.length;
    const fallbackPhoto = createBakeryIllustration('🍞');

    list.innerHTML = menus.map(item => `
        <div class="p-3 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
                <img src="${item.photo || fallbackPhoto}" alt="${item.name}" class="w-12 h-12 rounded-xl object-cover border border-bakery-latte shrink-0">
                <div class="min-w-0">
                    <p class="font-bold text-xs sm:text-sm text-bakery-espresso truncate">${item.name}</p>
                    <p class="text-xs text-bakery-crust font-semibold">${formatRupiah(item.price)} • <span class="text-bakery-cocoa/70 font-normal">${item.category}</span></p>
                </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
                <button type="button" onclick="editMenuItem('${item.id}')" class="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 transition" title="Edit Menu">
                    <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                </button>
                <button type="button" onclick="deleteMenuItem('${item.id}')" class="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition" title="Hapus Menu">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

function editMenuItem(id) {
    const item = menus.find(m => m.id === id);
    if (!item) return;
    document.getElementById('edit-menu-id').value = item.id;
    document.getElementById('menu-name').value = item.name;
    document.getElementById('menu-price').value = item.price;
    document.getElementById('menu-category').value = item.category;
    document.getElementById('menu-form-title').textContent = 'Edit Menu Roti';
    document.getElementById('menu-submit-text').textContent = 'Perbarui Menu';
    document.getElementById('cancel-edit-btn').classList.remove('hidden');
    pendingPhotoDataUrl = item.photo;
    document.getElementById('menu-photo-preview').src = item.photo || createBakeryIllustration('🍞');
    document.getElementById('menu-form').scrollIntoView({ behavior: 'smooth' });
}

function deleteMenuItem(id) {
    if (menus.length <= 1) {
        showToast('Minimal harus ada 1 menu di dalam sistem.', 'error');
        return;
    }
    menus = menus.filter(m => m.id !== id);
    saveMenusToStorage();
    renderManageMenuList();
    renderMenuGrid();
    renderCategoryFilters();
    showToast('Menu berhasil dihapus', 'info');
}

function resetDefaultMenus() {
    menus = [...DEFAULT_MENUS];
    saveMenusToStorage();
    renderManageMenuList();
    renderMenuGrid();
    renderCategoryFilters();
    showToast('Menu dikembalikan ke bawaan pabrik!');
}
