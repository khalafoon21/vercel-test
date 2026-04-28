function ensureSellerUiFeedbackScript() {
    if (window.AppUI || document.querySelector('script[data-ui-feedback]')) return;
    const script = document.createElement('script');
    script.src = '../../components/ui-feedback.js';
    script.dataset.uiFeedback = 'true';
    document.head.appendChild(script);
}

function ensureSellerAppStateScript() {
    if (window.AppState || document.querySelector('script[data-app-state]')) return;
    const script = document.createElement('script');
    script.src = '../../components/app-state.js';
    script.dataset.appState = 'true';
    document.head.appendChild(script);
}

function getStoredSellerToken() {
    if (window.AppState && typeof window.AppState.getToken === 'function') {
        return window.AppState.getToken();
    }
    return localStorage.getItem('spider_token') || localStorage.getItem('token');
}

function decodeSellerRole(token) {
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.role === 'customer' ? 'user' : payload.role;
    } catch (error) {
        return null;
    }
}

async function getLiveSellerRole(token) {
    const decodedRole = decodeSellerRole(token);
    if (decodedRole === 'seller') return decodedRole;

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

async function loadSellerSidebar(activePage) {
    ensureSellerAppStateScript();
    ensureSellerUiFeedbackScript();
    const token = getStoredSellerToken();
    const role = await getLiveSellerRole(token);

    if (!token || role !== 'seller') {
        window.location.href = '../auth/login.html';
        return;
    }

    const linkClass = page => `block px-4 py-3 rounded-md transition ${activePage === page ? 'bg-slate-800 text-cyan-400 font-bold' : 'hover:bg-slate-800'}`;
    const sidebarHTML = `
        <div class="md:hidden bg-slate-900 text-white flex justify-between items-center p-4 shadow-md sticky top-0 z-40">
            <h2 class="text-xl font-bold text-cyan-400">Spider<span class="text-white">Seller</span></h2>
            <button type="button" id="mobileMenuBtn" class="text-white focus:outline-none hover:text-cyan-400 transition">
                <i class="fas fa-bars text-2xl"></i>
            </button>
        </div>

        <div id="sidebarOverlay" class="fixed inset-0 bg-black bg-opacity-50 z-40 hidden transition-opacity md:hidden"></div>

        <aside id="sidebar" class="w-64 bg-slate-900 text-white min-h-screen shadow-lg fixed right-0 top-0 z-50 transform translate-x-full md:translate-x-0 transition-transform duration-300 ease-in-out">
            <div class="p-6 text-center border-b border-slate-800 flex justify-between items-center md:block">
                <h2 class="text-2xl font-bold text-cyan-400 hidden md:block">Spider<span class="text-white">Seller</span></h2>
                <h2 class="text-xl font-bold text-cyan-400 md:hidden">القائمة</h2>
                <button type="button" id="closeSidebarBtn" class="md:hidden text-slate-400 hover:text-white focus:outline-none">
                    <i class="fas fa-times text-2xl"></i>
                </button>
            </div>
            <nav class="p-4 space-y-2 mt-2">
                <a href="dashboard.html" class="${linkClass('dashboard')}">
                    <i class="fas fa-chart-line ml-2"></i> لوحة البائع
                </a>
                <a href="products.html" class="${linkClass('products')}">
                    <i class="fas fa-boxes-stacked ml-2"></i> منتجاتي
                </a>
                <a href="orders.html" class="${linkClass('orders')}">
                    <i class="fas fa-receipt ml-2"></i> طلباتي
                </a>
                <a href="reviews.html" class="${linkClass('reviews')}">
                    <i class="fas fa-star ml-2"></i> تقييمات منتجاتي
                </a>
                <a href="../../index.html" class="block px-4 py-3 hover:bg-slate-800 rounded-md transition mt-4">
                    <i class="fas fa-store ml-2"></i> العودة للمتجر
                </a>
                <button type="button" onclick="logout()" class="w-full text-right block px-4 py-3 text-red-400 hover:bg-slate-800 rounded-md transition mt-8">
                    <i class="fas fa-sign-out-alt ml-2"></i> تسجيل الخروج
                </button>
            </nav>
        </aside>
    `;

    document.getElementById('seller-layout').insertAdjacentHTML('afterbegin', sidebarHTML);

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
