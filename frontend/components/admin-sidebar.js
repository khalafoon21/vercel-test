function ensureAdminUiFeedbackScript() {
    if (window.AppUI || document.querySelector('script[data-ui-feedback]')) return;
    const script = document.createElement('script');
    script.src = '../../components/ui-feedback.js';
    script.dataset.uiFeedback = 'true';
    document.head.appendChild(script);
}

function ensureAdminAppStateScript() {
    if (window.AppState || document.querySelector('script[data-app-state]')) return;
    const script = document.createElement('script');
    script.src = '../../components/app-state.js';
    script.dataset.appState = 'true';
    document.head.appendChild(script);
}

function getStoredAdminToken() {
    if (window.AppState && typeof window.AppState.getToken === 'function') {
        return window.AppState.getToken();
    }
    return localStorage.getItem('spider_token') || localStorage.getItem('token');
}

async function getLiveAdminRole(token) {
    const decodedRole = decodeAdminRole(token);
    if (decodedRole === 'admin') return decodedRole;

    try {
        const response = await fetch('/api/profile', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json();
        return result && result.data ? result.data.role : decodedRole;
    } catch (error) {
        return decodedRole;
    }
}

async function loadAdminSidebar(activePage) {
    ensureAdminAppStateScript();
    ensureAdminUiFeedbackScript();
    const token = getStoredAdminToken();
    const role = await getLiveAdminRole(token);
    if (!token || role !== 'admin') {
        window.location.href = '../auth/login.html';
        return;
    }
    const sidebarHTML = `
        <div class="md:hidden bg-gray-900 text-white flex justify-between items-center p-4 shadow-md sticky top-0 z-40">
            <h2 class="text-xl font-bold text-primary-500">Spider<span class="text-white">Admin</span></h2>
            <button type="button" id="mobileMenuBtn" class="text-white focus:outline-none hover:text-primary-500 transition">
                <i class="fas fa-bars text-2xl"></i>
            </button>
        </div>

        <div id="sidebarOverlay" class="fixed inset-0 bg-black bg-opacity-50 z-40 hidden transition-opacity md:hidden"></div>

        <aside id="sidebar" class="w-64 bg-gray-900 text-white min-h-screen shadow-lg fixed right-0 top-0 z-50 transform translate-x-full md:translate-x-0 transition-transform duration-300 ease-in-out">
            <div class="p-6 text-center border-b border-gray-800 flex justify-between items-center md:block">
                <h2 class="text-2xl font-bold text-primary-500 hidden md:block">Spider<span class="text-white">Admin</span></h2>
                <h2 class="text-xl font-bold text-primary-500 md:hidden">القائمة</h2>
                <button type="button" id="closeSidebarBtn" class="md:hidden text-gray-400 hover:text-white focus:outline-none">
                    <i class="fas fa-times text-2xl"></i>
                </button>
            </div>
            <nav class="p-4 space-y-2 mt-2">
                <a href="dashboard.html" class="block px-4 py-3 rounded-md transition ${activePage === 'dashboard' ? 'bg-gray-800 text-primary-500 font-bold' : 'hover:bg-gray-800'}">
                    <i class="fas fa-box-open ml-2"></i> إدارة الطلبات
                </a>
                <a href="add-product.html" class="block px-4 py-3 rounded-md transition ${activePage === 'add-product' ? 'bg-gray-800 text-primary-500 font-bold' : 'hover:bg-gray-800'}">
                    <i class="fas fa-plus-circle ml-2"></i> إضافة منتج
                </a>
                <a href="manage-products.html" class="block px-4 py-3 rounded-md transition ${activePage === 'manage-products' ? 'bg-gray-800 text-primary-500 font-bold' : 'hover:bg-gray-800'}">
                    <i class="fas fa-pen-to-square ml-2"></i> المنتجات
                </a>
                
                <a href="add-category.html" class="block px-4 py-3 rounded-md transition ${activePage === 'add-category' ? 'bg-gray-800 text-primary-500 font-bold' : 'hover:bg-gray-800'}">
                    <i class="fas fa-tags ml-2"></i> إضافة قسم
                </a>
                <a href="manage-tags.html" class="block px-4 py-3 rounded-md transition ${activePage === 'manage-tags' ? 'bg-gray-800 text-primary-500 font-bold' : 'hover:bg-gray-800'}">
                    <i class="fas fa-hashtag ml-2"></i> إدارة الوسوم
                </a>
                <a href="add-banner.html" class="block px-4 py-3 rounded-md transition ${activePage === 'add-banner' ? 'bg-gray-800 text-primary-500 font-bold' : 'hover:bg-gray-800'}">
                    <i class="fas fa-images ml-2"></i> إضافة سلايدر
                </a>
                
                <a href="users.html" class="block px-4 py-3 rounded-md transition ${activePage === 'users' ? 'bg-gray-800 text-primary-500 font-bold' : 'hover:bg-gray-800'}">
                    <i class="fas fa-users ml-2"></i> إدارة المستخدمين
                </a>
                <a href="../../index.html" class="block px-4 py-3 hover:bg-gray-800 rounded-md transition mt-4">
                    <i class="fas fa-store ml-2"></i> العودة للمتجر
                </a>
                <button type="button" onclick="logout()" class="w-full text-right block px-4 py-3 text-error-500 hover:bg-gray-800 rounded-md transition mt-8">
                    <i class="fas fa-sign-out-alt ml-2"></i> تسجيل الخروج
                </button>
            </nav>
        </aside>
    `;

    document.getElementById('admin-layout').insertAdjacentHTML('afterbegin', sidebarHTML);

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    function toggleSidebar() {
        sidebar.classList.toggle('translate-x-full');
        overlay.classList.toggle('hidden');
    }

    document.getElementById('mobileMenuBtn').addEventListener('click', toggleSidebar);
    document.getElementById('closeSidebarBtn').addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);
}

function decodeAdminRole(token) {
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.role === 'customer' ? 'user' : payload.role;
    } catch (error) {
        return null;
    }
}
