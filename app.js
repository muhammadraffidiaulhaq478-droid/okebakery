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
                    tabs[key].className = 'flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all bg-bakery-gold text-bakery-espresso shadow-xs';
                } else {
                    views[key].classList.add('hidden');
                    if (key === 'pos') views[key].classList.remove('grid');
                    tabs[key].className = 'flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-bakery-cream hover:bg-white/10';
                }
            });

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
                    datetime: new Date(datetime).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
                    notes
                };
            }

            let finalCash = totals.cashPaid;
            if (finalCash === 0 && orderType === 'direct') finalCash = totals.grandTotal;

            const finalChange = Math.max(0, finalCash - totals.grandTotal);
            const paymentStatus = finalCash >= totals.grandTotal ? 'LUNAS' : 'DP / BELUM LUNAS';

            const now = new Date();
            const tzOffset = now.getTimezoneOffset() * 60000;
            const dateISO = new Date(now - tzOffset).toISOString().slice(0, 10);
            const invoiceNo = 'OKE-' + now.getFullYear().toString().slice(-2) + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '-' + Math.floor(1000 + Math.random() * 9000);

            const receiptObj = {
                invoiceNo,
                dateISO,
                timestamp: now.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
                orderType,
                poStatus: orderType === 'po' ? 'Menunggu / Diproses' : 'Selesai',
                paymentMethod,
                cashierName: activeCashier ? activeCashier.name : 'Admin',
                customerInfo,
                items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price, total: i.price * i.qty })),
                subtotal: totals.subtotal,
                shipping: totals.shipping,
                discount: totals.discount,
                grandTotal: totals.grandTotal,
                cashPaid: finalCash,
                change: finalChange,
                paymentStatus
            };

            transactions.unshift(receiptObj);
            saveTransactionsToStorage();

            currentReceiptData = receiptObj;
            renderReceiptHTML(receiptObj);
            openReceiptModal();

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

        // Struk HTML Kondisional: Alamat & Nomor hanya muncul jika PO
        function renderReceiptHTML(data) {
            const container = document.getElementById('printable-receipt-area');
            const logoReceiptHTML = storeProfile.logoDataUrl
                ? `<img src="${storeProfile.logoDataUrl}" alt="Logo" class="w-14 h-14 mx-auto mb-1.5 rounded-full object-cover border border-stone-300">`
                : `<div class="w-14 h-14 mx-auto mb-1.5 flex items-center justify-center">${getDefaultLogoSVG('w-14 h-14')}</div>`;

            // Field Nama Pemesan, Alamat & Telepon HANYA MUNCUL JIKA PRE-ORDER
            const poDetailsHTML = data.orderType === 'po' && data.customerInfo ? `
                <div class="border-t border-b border-dashed border-stone-400 py-2 my-2 space-y-0.5 text-[11px]">
                    <div class="font-bold uppercase text-center">** NOTA PRE-ORDER **</div>
                    <div>Status PO: <span class="font-bold">${data.poStatus || 'Menunggu / Diproses'}</span></div>
                    <div>Nama     : <span class="font-bold">${data.customerInfo.name}</span></div>
                    <div>No. Telp : ${data.customerInfo.phone}</div>
                    <div>Jadwal   : ${data.customerInfo.datetime}</div>
                    <div>Alamat   : ${data.customerInfo.address}</div>
                    ${data.customerInfo.notes ? `<div>Catatan  : ${data.customerInfo.notes}</div>` : ''}
                </div>
            ` : `
                <div class="border-t border-b border-dashed border-stone-400 py-1.5 my-2 text-center font-bold text-[11px]">
                    PEMBELIAN BIASA (LANGSUNG)
                </div>
            `;

            const itemsHTML = data.items.map(item => `
                <div class="mb-1.5">
                    <div class="font-bold">${item.name}</div>
                    <div class="flex justify-between text-stone-600">
                        <span>${item.qty} x ${formatRupiah(item.price)}</span>
                        <span class="text-stone-900 font-semibold">${formatRupiah(item.total)}</span>
                    </div>
                </div>
            `).join('');

            container.innerHTML = `
                <div class="text-center mb-2">
                    ${logoReceiptHTML}
                    <div class="text-base font-extrabold tracking-wider uppercase">${storeProfile.name}</div>
                    <div class="text-[10px] text-stone-600">${storeProfile.address}</div>
                    <div class="text-[10px] text-stone-600">Telp / WA: ${storeProfile.phone}</div>
                </div>

                <div class="border-t border-dashed border-stone-400 pt-2 text-[11px] space-y-0.5">
                    <div class="flex justify-between"><span>No. Nota:</span><span class="font-bold">${data.invoiceNo}</span></div>
                    <div class="flex justify-between"><span>Tanggal :</span><span>${data.timestamp}</span></div>
                    <div class="flex justify-between"><span>Kasir   :</span><span class="font-bold">${data.cashierName}</span></div>
                    <div class="flex justify-between"><span>Metode  :</span><span>${data.paymentMethod}</span></div>
                </div>

                ${poDetailsHTML}

                <div class="py-1.5 border-b border-dashed border-stone-400">
                    ${itemsHTML}
                </div>

                <div class="py-2 space-y-1 text-[11px]">
                    <div class="flex justify-between"><span>Subtotal</span><span>${formatRupiah(data.subtotal)}</span></div>
                    ${data.orderType === 'po' ? `<div class="flex justify-between"><span>Ongkos Kirim</span><span>${formatRupiah(data.shipping)}</span></div>` : ''}
                    ${data.discount > 0 ? `<div class="flex justify-between"><span>Diskon</span><span>-${formatRupiah(data.discount)}</span></div>` : ''}
                    <div class="flex justify-between font-extrabold text-sm pt-1 border-t border-stone-300"><span>TOTAL</span><span>${formatRupiah(data.grandTotal)}</span></div>
                    <div class="flex justify-between pt-1"><span>Dibayar</span><span>${formatRupiah(data.cashPaid)}</span></div>
                    <div class="flex justify-between font-bold"><span>Kembalian</span><span>${formatRupiah(data.change)}</span></div>
                </div>

                <div class="border-t border-dashed border-stone-400 pt-2.5 mt-1 text-center text-[10px] text-stone-600 space-y-0.5">
                    <div class="font-bold text-stone-800">Terima Kasih Telah Berbelanja!</div>
                    <div>Roti Hangat & Fresh Setiap Hari</div>
                </div>
            `;
        }

        async function downloadReceiptPNG() {
            if (!currentReceiptData) return;
            const d = currentReceiptData;
            const canvas = document.createElement('canvas');
            const width = 440;
            const extraPOHeight = d.orderType === 'po' ? 150 : 40;
            const itemsHeight = d.items.length * 46;
            const height = 430 + extraPOHeight + itemsHeight;

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);

            let y = 28;
            const logoSrc = storeProfile.logoDataUrl || ('data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(getDefaultLogoSVG('w-16 h-16')));
            await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => { ctx.drawImage(img, (width - 64) / 2, y, 64, 64); resolve(); };
                img.onerror = () => resolve();
                img.src = logoSrc;
            });

            y += 84;
            ctx.fillStyle = '#1C1917';
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(storeProfile.name.toUpperCase(), width / 2, y);

            y += 20;
            ctx.fillStyle = '#57534E';
            ctx.font = '12px monospace';
            ctx.fillText(storeProfile.address, width / 2, y);
            y += 16;
            ctx.fillText(`Telp / WA: ${storeProfile.phone}`, width / 2, y);

            const drawDashedLine = (yPos) => {
                ctx.save();
                ctx.strokeStyle = '#A8A29E';
                ctx.setLineDash([5, 4]);
                ctx.beginPath();
                ctx.moveTo(24, yPos);
                ctx.lineTo(width - 24, yPos);
                ctx.stroke();
                ctx.restore();
            };

            y += 18;
            drawDashedLine(y);
            y += 22;

            ctx.textAlign = 'left';
            ctx.fillStyle = '#1C1917';
            ctx.font = '13px monospace';
            ctx.fillText(`No. Nota: ${d.invoiceNo}`, 24, y);
            y += 18;
            ctx.fillText(`Tanggal : ${d.timestamp}`, 24, y);
            y += 18;
            ctx.fillText(`Kasir   : ${d.cashierName}`, 24, y);

            if (d.orderType === 'po' && d.customerInfo) {
                y += 14;
                drawDashedLine(y);
                y += 20;
                ctx.font = 'bold 13px monospace';
                ctx.fillText('** NOTA PRE-ORDER **', 24, y);
                ctx.font = '12px monospace';
                y += 18;
                ctx.fillText(`Pemesan: ${d.customerInfo.name}`, 24, y);
                y += 17;
                ctx.fillText(`No. HP : ${d.customerInfo.phone}`, 24, y);
                y += 17;
                ctx.fillText(`Jadwal : ${d.customerInfo.datetime}`, 24, y);
                y += 17;
                ctx.fillText(`Alamat : ${d.customerInfo.address.slice(0, 42)}`, 24, y);
            }

            y += 16;
            drawDashedLine(y);
            y += 22;

            d.items.forEach(item => {
                ctx.font = 'bold 13px monospace';
                ctx.textAlign = 'left';
                ctx.fillText(item.name, 24, y);
                y += 18;
                ctx.font = '12px monospace';
                ctx.fillText(`${item.qty} x ${formatRupiah(item.price)}`, 24, y);
                ctx.textAlign = 'right';
                ctx.fillText(formatRupiah(item.total), width - 24, y);
                y += 24;
            });

            drawDashedLine(y - 6);
            y += 16;

            const drawRow = (label, val, bold = false) => {
                ctx.font = bold ? 'bold 15px monospace' : '13px monospace';
                ctx.textAlign = 'left';
                ctx.fillText(label, 24, y);
                ctx.textAlign = 'right';
                ctx.fillText(val, width - 24, y);
                y += 21;
            };

            drawRow('Subtotal', formatRupiah(d.subtotal));
            if (d.orderType === 'po') drawRow('Ongkos Kirim', formatRupiah(d.shipping));
            if (d.discount > 0) drawRow('Diskon', `-${formatRupiah(d.discount)}`);
            drawRow('TOTAL BAYAR', formatRupiah(d.grandTotal), true);
            drawRow('Dibayar', formatRupiah(d.cashPaid));
            drawRow('Kembalian', formatRupiah(d.change));

            y += 6;
            drawDashedLine(y);
            y += 24;
            ctx.textAlign = 'center';
            ctx.font = 'bold 13px monospace';
            ctx.fillText('Terima Kasih Telah Berbelanja!', width / 2, y);

            const link = document.createElement('a');
            link.download = `Struk-${d.invoiceNo}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showToast('Struk PNG berhasil diunduh!');
        }

        function copyReceiptForWhatsApp() {
            if (!currentReceiptData) return;
            const d = currentReceiptData;
            let text = `*STRUK - ${storeProfile.name.toUpperCase()}*\n`;
            text += `${storeProfile.address}\n`;
            text += `--------------------------------\n`;
            text += `No. Nota : *${d.invoiceNo}*\n`;
            text += `Tanggal  : ${d.timestamp}\n`;
            text += `Kasir    : ${d.cashierName}\n`;
            text += `Tipe     : ${d.orderType === 'po' ? 'PRE-ORDER (PO)' : 'PEMBELIAN BIASA'}\n`;

            if (d.orderType === 'po' && d.customerInfo) {
                text += `--------------------------------\n`;
                text += `*DATA PEMESAN PO:*\n`;
                text += `Nama     : ${d.customerInfo.name}\n`;
                text += `No. HP   : ${d.customerInfo.phone}\n`;
                text += `Jadwal   : ${d.customerInfo.datetime}\n`;
                text += `Alamat   : ${d.customerInfo.address}\n`;
                if (d.customerInfo.notes) text += `Catatan  : ${d.customerInfo.notes}\n`;
            }

            text += `--------------------------------\n`;
            text += `*DAFTAR ROTI:*\n`;
            d.items.forEach(item => {
                text += `• ${item.name} (${item.qty}x) = ${formatRupiah(item.total)}\n`;
            });
            text += `--------------------------------\n`;
            text += `Subtotal : ${formatRupiah(d.subtotal)}\n`;
            if (d.orderType === 'po') text += `Ongkir   : ${formatRupiah(d.shipping)}\n`;
            if (d.discount > 0) text += `Diskon   : -${formatRupiah(d.discount)}\n`;
            text += `*TOTAL   : ${formatRupiah(d.grandTotal)}*\n`;
            text += `Dibayar  : ${formatRupiah(d.cashPaid)}\n`;
            text += `Kembalian: ${formatRupiah(d.change)}\n`;
            text += `--------------------------------\n`;
            text += `Terima kasih sudah berbelanja di *${storeProfile.name}*! 🥐🍞`;

            const tempTextarea = document.createElement('textarea');
            tempTextarea.value = text;
            document.body.appendChild(tempTextarea);
            tempTextarea.select();
            try {
                document.execCommand('copy');
                showToast('Struk disalin! Siap ditempel ke WhatsApp.');
            } catch (err) {
                showToast('Gagal menyalin.', 'error');
            }
            document.body.removeChild(tempTextarea);
        }

        function openReceiptModal() {
            document.getElementById('receipt-modal').classList.remove('hidden');
            document.getElementById('receipt-modal').classList.add('flex');
            lucide.createIcons();
        }

        function closeReceiptModal() {
            document.getElementById('receipt-modal').classList.add('hidden');
            document.getElementById('receipt-modal').classList.remove('flex');
        }

        // --- DAFTAR PRE-ORDER ---
        function updateActivePOBadge() {
            const count = transactions.filter(t => t.orderType === 'po' && t.poStatus !== 'Selesai' && t.poStatus !== 'Dibatalkan').length;
            document.getElementById('active-po-badge').textContent = count;
        }

        function renderPOStatusFilters() {
            const statuses = ['Semua', 'Menunggu / Diproses', 'Siap Dikirim / Diambil', 'Selesai', 'Dibatalkan'];
            const container = document.getElementById('po-status-filters');
            const poList = transactions.filter(t => t.orderType === 'po');

            container.innerHTML = statuses.map(st => {
                const count = st === 'Semua' ? poList.length : poList.filter(p => (p.poStatus || 'Menunggu / Diproses') === st).length;
                const isActive = selectedPOStatusFilter === st;
                return `
                    <button type="button" onclick="selectedPOStatusFilter='${st}'; renderPOStatusFilters(); renderPOListView();" 
                        class="px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${isActive ? 'bg-bakery-cocoa text-white shadow-xs' : 'bg-white text-bakery-cocoa border border-bakery-latte hover:bg-bakery-latte/60'}">
                        <span>${st}</span>
                        <span class="px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-bakery-gold text-bakery-espresso' : 'bg-bakery-cream text-bakery-crust'}">${count}</span>
                    </button>
                `;
            }).join('');
        }

        function updatePOStatus(invoiceNo, newStatus) {
            const idx = transactions.findIndex(t => t.invoiceNo === invoiceNo);
            if (idx === -1) return;
            transactions[idx].poStatus = newStatus;
            saveTransactionsToStorage();
            renderPOStatusFilters();
            renderPOListView();
            showToast(`Status PO ${invoiceNo} diubah ke "${newStatus}"`);
        }

        function formatPhoneForWA(phone) {
            let clean = (phone || '').replace(/[^0-9]/g, '');
            if (clean.startsWith('0')) clean = '62' + clean.slice(1);
            return clean;
        }

        function renderPOListView() {
            const container = document.getElementById('po-cards-container');
            const query = (document.getElementById('po-search-input').value || '').toLowerCase().trim();
            const filteredPO = transactions.filter(t => {
                if (t.orderType !== 'po') return false;
                const status = t.poStatus || 'Menunggu / Diproses';
                const matchStatus = selectedPOStatusFilter === 'Semua' || status === selectedPOStatusFilter;
                const cName = (t.customerInfo?.name || '').toLowerCase();
                const cPhone = (t.customerInfo?.phone || '').toLowerCase();
                const inv = t.invoiceNo.toLowerCase();
                return matchStatus && (!query || cName.includes(query) || cPhone.includes(query) || inv.includes(query));
            });

            if (filteredPO.length === 0) {
                container.innerHTML = `<div class="col-span-full bg-white rounded-2xl p-10 text-center border border-bakery-latte"><p class="font-bold text-sm text-bakery-cocoa">Tidak ada Pre-Order yang sesuai</p></div>`;
                lucide.createIcons();
                return;
            }

            container.innerHTML = filteredPO.map(po => {
                const status = po.poStatus || 'Menunggu / Diproses';
                const info = po.customerInfo || {};
                const waNumber = formatPhoneForWA(info.phone);
                const waMsg = encodeURIComponent(`Halo Kak ${info.name || ''}, pesanan Pre-Order Anda di *${storeProfile.name}* (${po.invoiceNo}) berstatus: *${status}*. Terima kasih!`);

                return `
                    <div class="bg-white rounded-2xl border border-bakery-latte shadow-xs hover:shadow-md transition-all p-4 flex flex-col justify-between gap-3">
                        <div class="space-y-3">
                            <div class="flex flex-wrap items-start justify-between gap-2 pb-2.5 border-b border-bakery-latte">
                                <div>
                                    <div class="flex items-center gap-2">
                                        <span class="font-mono font-extrabold text-xs text-bakery-cocoa">${po.invoiceNo}</span>
                                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-900 border-amber-300">${status}</span>
                                    </div>
                                    <p class="text-[11px] text-bakery-cocoa/60 mt-0.5">Dibuat oleh: ${po.cashierName}</p>
                                </div>
                                <div class="text-right">
                                    <span class="text-[10px] font-bold uppercase tracking-wider text-bakery-crust block">Jadwal Kirim</span>
                                    <span class="text-xs font-extrabold text-bakery-espresso bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-block mt-0.5">${info.datetime || '-'}</span>
                                </div>
                            </div>

                            <div class="bg-bakery-cream/70 p-3 rounded-xl space-y-1 text-xs">
                                <div class="flex items-center justify-between gap-2">
                                    <span class="font-extrabold text-bakery-espresso text-sm">${info.name || '-'}</span>
                                    ${waNumber ? `<a href="https://wa.me/${waNumber}?text=${waMsg}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold"><i data-lucide="message-circle" class="w-3.5 h-3.5"></i> WA</a>` : ''}
                                </div>
                                <p class="text-bakery-cocoa/90 flex items-start gap-1.5 pt-0.5"><i data-lucide="map-pin" class="w-3.5 h-3.5 text-bakery-crust shrink-0 mt-0.5"></i><span>${info.address || '-'}</span></p>
                                ${info.notes ? `<p class="text-amber-900 bg-amber-100/70 px-2 py-1 rounded-lg text-[11px]">Catatan: ${info.notes}</p>` : ''}
                            </div>

                            <div class="space-y-1">
                                <span class="text-[11px] font-bold text-bakery-cocoa/70 uppercase">Rincian:</span>
                                <div class="divide-y divide-bakery-latte/60 text-xs">
                                    ${po.items.map(item => `<div class="py-1 flex justify-between"><span class="font-medium">${item.name} <strong class="text-bakery-crust">x${item.qty}</strong></span><span class="font-semibold">${formatRupiah(item.total)}</span></div>`).join('')}
                                </div>
                            </div>
                        </div>

                        <div class="pt-3 border-t border-bakery-latte space-y-2.5">
                            <div class="flex items-center justify-between text-xs">
                                <span class="text-bakery-cocoa/70">Ongkir: <strong>${formatRupiah(po.shipping)}</strong></span>
                                <span class="font-extrabold text-sm text-bakery-cocoa">Total: ${formatRupiah(po.grandTotal)}</span>
                            </div>
                            <div class="flex flex-wrap items-center justify-between gap-2">
                                <select onchange="updatePOStatus('${po.invoiceNo}', this.value)" class="flex-1 px-2.5 py-2 rounded-xl bg-bakery-cream border text-xs font-bold text-bakery-cocoa outline-none">
                                    <option value="Menunggu / Diproses" ${status === 'Menunggu / Diproses' ? 'selected' : ''}>Status: Menunggu / Diproses</option>
                                    <option value="Siap Dikirim / Diambil" ${status === 'Siap Dikirim / Diambil' ? 'selected' : ''}>Status: Siap Dikirim / Diambil</option>
                                    <option value="Selesai" ${status === 'Selesai' ? 'selected' : ''}>Status: Selesai</option>
                                    <option value="Dibatalkan" ${status === 'Dibatalkan' ? 'selected' : ''}>Status: Dibatalkan</option>
                                </select>
                                <button type="button" onclick="reopenReceiptByInvoice('${po.invoiceNo}')" class="px-3 py-2 rounded-xl bg-bakery-cocoa text-white text-xs font-bold flex items-center gap-1"><i data-lucide="receipt" class="w-3.5 h-3.5 text-bakery-gold"></i> Struk</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            lucide.createIcons();
        }

        // --- RIWAYAT PENJUALAN ---
        function handleHistoryDatePreset() {
            const preset = document.getElementById('history-date-preset').value;
            const customInput = document.getElementById('history-date-custom');
            if (preset === 'custom') customInput.classList.remove('hidden');
            else customInput.classList.add('hidden');
            renderSalesHistoryView();
        }

        function getFilteredSalesTransactions() {
            const query = (document.getElementById('history-search-input').value || '').toLowerCase().trim();
            const typeFilter = document.getElementById('history-type-filter').value;
            const datePreset = document.getElementById('history-date-preset').value;
            const customDate = document.getElementById('history-date-custom').value;
            const now = new Date();
            const tzOffset = now.getTimezoneOffset() * 60000;
            const todayISO = new Date(now - tzOffset).toISOString().slice(0, 10);

            return transactions.filter(trx => {
                const matchType = typeFilter === 'all' || trx.orderType === typeFilter;
                let matchDate = true;
                if (datePreset === 'today') matchDate = trx.dateISO === todayISO;
                else if (datePreset === 'custom' && customDate) matchDate = trx.dateISO === customDate;
                const cName = (trx.customerInfo?.name || 'biasa').toLowerCase();
                const inv = trx.invoiceNo.toLowerCase();
                return matchType && matchDate && (!query || cName.includes(query) || inv.includes(query));
            });
        }

        function renderSalesHistoryView() {
            const filtered = getFilteredSalesTransactions();
            const validTrx = filtered.filter(t => t.poStatus !== 'Dibatalkan');
            const totalRevenue = validTrx.reduce((sum, t) => sum + (t.grandTotal || 0), 0);
            const poTrx = validTrx.filter(t => t.orderType === 'po');
            const directTrx = validTrx.filter(t => t.orderType === 'direct');
            const poRevenue = poTrx.reduce((sum, t) => sum + (t.grandTotal || 0), 0);
            const directRevenue = directTrx.reduce((sum, t) => sum + (t.grandTotal || 0), 0);
            const totalItemsSold = validTrx.reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.qty, 0), 0);

            document.getElementById('kpi-total-revenue').textContent = formatRupiah(totalRevenue);
            document.getElementById('kpi-total-trx').textContent = `${validTrx.length} Nota`;
            document.getElementById('kpi-trx-breakdown').textContent = `${directTrx.length} Biasa • ${poTrx.length} PO`;
            document.getElementById('kpi-po-revenue').textContent = formatRupiah(poRevenue);
            document.getElementById('kpi-direct-revenue').textContent = `Biasa: ${formatRupiah(directRevenue)}`;
            document.getElementById('kpi-items-sold').textContent = `${totalItemsSold} Pcs`;

            const tbody = document.getElementById('sales-history-tbody');
            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="py-10 text-center text-bakery-cocoa/60 font-bold">Tidak ada riwayat penjualan.</td></tr>`;
                return;
            }

            tbody.innerHTML = filtered.map(trx => {
                const isPO = trx.orderType === 'po';
                const isCancelled = trx.poStatus === 'Dibatalkan';
                return `
                    <tr class="hover:bg-bakery-cream/50 transition ${isCancelled ? 'opacity-60 bg-red-50/30' : ''}">
                        <td class="py-3.5 px-4 align-top">
                            <div class="font-mono font-extrabold text-bakery-cocoa">${trx.invoiceNo}</div>
                            <div class="text-[11px] text-bakery-cocoa/70">${trx.timestamp}</div>
                        </td>
                        <td class="py-3.5 px-4 align-top">
                            <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${isPO ? 'bg-amber-100 text-amber-900' : 'bg-stone-200 text-stone-800'}">${isPO ? 'PRE-ORDER' : 'BIASA'}</span>
                            <div class="text-[11px] font-semibold text-bakery-crust mt-1">Kasir: ${trx.cashierName}</div>
                        </td>
                        <td class="py-3.5 px-4 align-top">
                            ${isPO && trx.customerInfo ? `<div class="font-bold">${trx.customerInfo.name}</div><div class="text-[11px]">${trx.customerInfo.phone}</div>` : `<span class="text-bakery-cocoa/50 italic">Pembelian Langsung</span>`}
                        </td>
                        <td class="py-3.5 px-4 align-top max-w-xs">
                            <div>${trx.items.map(i => `${i.name} (${i.qty}x)`).join(', ')}</div>
                        </td>
                        <td class="py-3.5 px-4 align-top text-right font-medium">${formatRupiah(trx.shipping)}</td>
                        <td class="py-3.5 px-4 align-top text-right font-extrabold">${formatRupiah(trx.grandTotal)}</td>
                        <td class="py-3.5 px-4 align-top text-center">
                            <div class="inline-flex items-center gap-1.5">
                                <button type="button" onclick="reopenReceiptByInvoice('${trx.invoiceNo}')" class="px-2.5 py-1.5 rounded-lg bg-bakery-cocoa text-white text-[11px] font-bold"><i data-lucide="eye" class="w-3.5 h-3.5"></i> Struk</button>
                                <button type="button" onclick="confirmDeleteTransaction('${trx.invoiceNo}')" class="p-1.5 rounded-lg bg-red-100 text-red-700"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
            lucide.createIcons();
        }

        function reopenReceiptByInvoice(invoiceNo) {
            const trx = transactions.find(t => t.invoiceNo === invoiceNo);
            if (!trx) return;
            currentReceiptData = trx;
            renderReceiptHTML(trx);
            openReceiptModal();
        }

        function confirmDeleteTransaction(invoiceNo) {
            const modal = document.getElementById('confirm-modal');
            document.getElementById('confirm-modal-message').textContent = `Hapus transaksi ${invoiceNo}?`;
            document.getElementById('confirm-modal-yes-btn').onclick = () => {
                transactions = transactions.filter(t => t.invoiceNo !== invoiceNo);
                saveTransactionsToStorage();
                renderSalesHistoryView();
                closeConfirmModal();
                showToast('Transaksi dihapus', 'info');
            };
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        function closeConfirmModal() {
            document.getElementById('confirm-modal').classList.add('hidden');
            document.getElementById('confirm-modal').classList.remove('flex');
        }

        function exportSalesCSV() {
            const data = getFilteredSalesTransactions();
            if (data.length === 0) {
                showToast('Tidak ada data.', 'error');
                return;
            }
            const headers = ['No Nota', 'Tanggal', 'Tipe', 'Kasir', 'Nama Pelanggan', 'No HP', 'Alamat', 'Rincian Item', 'Total Bayar'];
            const rows = data.map(t => [
                t.invoiceNo, `"${t.timestamp}"`, t.orderType, t.cashierName, `"${t.customerInfo?.name || '-'}"`, `"${t.customerInfo?.phone || '-'}"`, `"${t.customerInfo?.address || '-'}"`, `"${t.items.map(i => `${i.name} (${i.qty}x)`).join(';')}"`, t.grandTotal
            ]);
            const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Laporan-Oke-Bakery-${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
            showToast('Laporan CSV diekspor!');
        }

        // --- KELOLA MENU ---
        function openMenuModal() {
            resetMenuForm();
            document.getElementById('menu-modal').classList.remove('hidden');
            document.getElementById('menu-modal').classList.add('flex');
            renderManageMenuList();
            lucide.createIcons();
        }

        function closeMenuModal() {
            document.getElementById('menu-modal').classList.add('hidden');
            document.getElementById('menu-modal').classList.remove('flex');
        }

        async function handleMenuPhotoUpload(e) {
            const file = e.target.files[0];
            if (!file) return;
            try {
                pendingPhotoDataUrl = await compressImageFile(file, 420, 0.8);
                document.getElementById('menu-photo-preview').src = pendingPhotoDataUrl;
                document.getElementById('menu-photo-url').value = '';
            } catch (err) {
                showToast('Gagal upload foto.', 'error');
            }
        }

        function updateMenuPhotoPreviewFromUrl() {
            const url = document.getElementById('menu-photo-url').value.trim();
            if (url) {
                pendingPhotoDataUrl = url;
                document.getElementById('menu-photo-preview').src = url;
            }
        }

        function renderManageMenuList() {
            const list = document.getElementById('manage-menu-list');
            document.getElementById('manage-menu-count').textContent = menus.length;
            const fallbackPhoto = createBakeryIllustration('🍞');
            list.innerHTML = menus.map(item => `
                <div class="p-3 bg-white flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3 min-w-0">
                        <img src="${item.photo || fallbackPhoto}" class="w-12 h-12 rounded-xl object-cover border shrink-0">
                        <div class="min-w-0">
                            <p class="font-bold text-sm text-bakery-espresso truncate">${item.name}</p>
                            <p class="text-xs text-bakery-crust font-semibold">${item.category} • ${formatRupiah(item.price)}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                        <button type="button" onclick="editMenuItem('${item.id}')" class="p-2 rounded-lg bg-amber-100 text-amber-900"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                        <button type="button" onclick="deleteMenuItem('${item.id}')" class="p-2 rounded-lg bg-red-100 text-red-700"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </div>
            `).join('');
            lucide.createIcons();
        }

        function saveMenuItem(e) {
            e.preventDefault();
            const editId = document.getElementById('edit-menu-id').value;
            const name = document.getElementById('menu-name').value.trim();
            const price = Number(document.getElementById('menu-price').value);
            const category = document.getElementById('menu-category').value;
            const photo = pendingPhotoDataUrl || createBakeryIllustration('🥐');

            if (!name || price <= 0) {
                showToast('Nama dan harga valid wajib diisi!', 'error');
                return;
            }

            if (editId) {
                const idx = menus.findIndex(m => m.id === editId);
                if (idx !== -1) menus[idx] = { ...menus[idx], name, price, category, photo };
            } else {
                menus.unshift({ id: 'm_' + Date.now(), name, price, category, photo });
            }

            saveMenusToStorage();
            resetMenuForm();
            renderManageMenuList();
            renderCategoryFilters();
            renderMenuGrid();
            showToast('Menu roti disimpan!');
        }

        function editMenuItem(id) {
            const item = menus.find(m => m.id === id);
            if (!item) return;
            document.getElementById('edit-menu-id').value = item.id;
            document.getElementById('menu-name').value = item.name;
            document.getElementById('menu-price').value = item.price;
            document.getElementById('menu-category').value = item.category;
            pendingPhotoDataUrl = item.photo || createBakeryIllustration('🍞');
            document.getElementById('menu-photo-preview').src = pendingPhotoDataUrl;
            document.getElementById('menu-form-title').textContent = 'Edit Menu Roti';
            document.getElementById('menu-submit-text').textContent = 'Update Menu';
            document.getElementById('cancel-edit-btn').classList.remove('hidden');
        }

        function resetMenuForm() {
            document.getElementById('menu-form').reset();
            document.getElementById('edit-menu-id').value = '';
            pendingPhotoDataUrl = createBakeryIllustration('🥐');
            document.getElementById('menu-photo-preview').src = pendingPhotoDataUrl;
            document.getElementById('menu-form-title').textContent = 'Tambah Menu Roti Baru';
            document.getElementById('menu-submit-text').textContent = 'Simpan ke Daftar Menu';
            document.getElementById('cancel-edit-btn').classList.add('hidden');
        }

        function deleteMenuItem(id) {
            menus = menus.filter(m => m.id !== id);
            cart = cart.filter(c => c.id !== id);
            saveMenusToStorage();
            renderManageMenuList();
            renderCategoryFilters();
            renderMenuGrid();
            renderCart();
            showToast('Menu dihapus', 'info');
        }

        function resetDefaultMenus() {
            menus = [...DEFAULT_MENUS];
            saveMenusToStorage();
            renderManageMenuList();
            renderCategoryFilters();
            renderMenuGrid();
            showToast('Menu dikembalikan ke bawaan', 'info');
        }