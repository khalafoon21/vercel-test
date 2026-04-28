// دالة لتحديث عداد السلة من السيرفر مباشرة
async function updateGlobalCartCount() {
    const badge = document.getElementById('cartCountBadge');
    const token = getStoredToken();
    
    if (!badge) return;

    if (!token) {
        badge.textContent = getStoredCartCount();
        return;
    }

    try {
        // بنسأل الباك اند عن السلة
        const res = await fetch('/api/cart', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            const items = data.data || data.cart || [];
            // بنحسب مجموع الكميات
            const totalItems = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
            badge.textContent = totalItems;
        } else {
            badge.textContent = '0';
        }
    } catch (error) {
        console.error('خطأ في جلب عدد السلة:', error);
        badge.textContent = '0';
    }
}

function loadMainNavbar() {
    const isHomePage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('frontend/');
    const pathPrefix = isHomePage ? '' : '../../';
    const authPathPrefix = isHomePage ? 'pages/auth/' : '../auth/';
    const cartPathPrefix = isHomePage ? 'pages/cart/' : '../cart/';
    const profilePathPrefix = isHomePage ? 'pages/profile/' : '../profile/';
    const adminPath = isHomePage ? 'pages/admin/dashboard.html' : '../admin/dashboard.html';
    const sellerPath = isHomePage ? 'pages/seller/dashboard.html' : '../seller/dashboard.html';

    ensureAppStateScript(pathPrefix);

    const token = getStoredToken();
    const role = decodeUserRole(token);
    const isAdmin = role === 'admin';
    const isSeller = role === 'seller';
    ensureUiFeedbackScript(pathPrefix);

    const navbarHTML = `
    <nav class="bg-primary-600 text-white shadow-md sticky top-0 z-50">
        <div class="container mx-auto px-4 lg:px-8 py-3 flex items-center justify-between">
            <a href="${pathPrefix}index.html" class="text-2xl font-bold tracking-wider hover:text-secondary-500 smooth-transition">
                Spider<span class="text-secondary-500">Store</span>
            </a>

            <div class="hidden md:flex flex-1 mx-12 relative">
                <input type="text" id="searchInput" placeholder="ابحث عن المنتجات..." 
                    class="w-full pl-10 pr-4 py-2 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-secondary-500 border-none shadow-sm">
                <button type="button" onclick="typeof searchProducts === 'function' ? searchProducts() : window.location.href='${pathPrefix}index.html'" class="absolute left-0 top-0 h-full px-4 bg-secondary-500 text-white rounded-l-md hover:bg-yellow-500 smooth-transition">
                    <i class="fas fa-search"></i>
                </button>
            </div>

            <div class="flex items-center gap-6">
                ${isAdmin ? `
                <a href="${adminPath}" id="adminDashboardLink" class="hidden sm:inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-2 rounded-md smooth-transition text-sm font-bold">
                    <i class="fas fa-gauge-high"></i>
                    <span>لوحة الأدمن</span>
                </a>` : ''}
                ${isSeller ? `
                <a href="${sellerPath}" id="sellerDashboardLink" class="hidden sm:inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-2 rounded-md smooth-transition text-sm font-bold">
                    <i class="fas fa-store"></i>
                    <span>لوحة البائع</span>
                </a>` : ''}
                <a href="${token ? profilePathPrefix + 'profile.html' : authPathPrefix + 'login.html'}" id="authLink" class="hover:text-secondary-500 smooth-transition text-sm font-medium">
                    <i class="fas fa-user ml-1"></i> ${token ? 'حسابي' : 'دخول'}
                </a> 
                
                <a href="${cartPathPrefix}cart.html" class="relative hover:text-secondary-500 smooth-transition flex items-center">
                    <i class="fas fa-shopping-cart text-xl"></i>
                    <span id="cartCountBadge" class="absolute -top-2 -right-2 bg-secondary-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full shadow-sm">0</span>
                </a>
            </div>
        </div>
    </nav>
    `;

    document.body.insertAdjacentHTML('afterbegin', navbarHTML);
    
    // تحديث العداد بعد تحميل الناف بار
    updateGlobalCartCount();
}

// تشغيل الدالة تلقائياً
loadMainNavbar();
function decodeUserRole(token) {
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.role || null;
    } catch (error) {
        return null;
    }
}

function getStoredToken() {
    if (window.AppState && typeof window.AppState.getToken === 'function') {
        return window.AppState.getToken();
    }
    const token = localStorage.getItem('spider_token') || localStorage.getItem('token') || getCookieValue('spider_token');
    if (token) {
        try {
            localStorage.setItem('spider_token', token);
            localStorage.removeItem('token');
        } catch (error) {}
    }
    return token;
}

function getStoredCartCount() {
    if (window.AppState && typeof window.AppState.getCartCount === 'function') {
        return window.AppState.getCartCount();
    }
    try {
        const localCart = JSON.parse(localStorage.getItem('spider_cart') || '[]');
        return Array.isArray(localCart)
            ? localCart.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
            : 0;
    } catch (error) {
        return 0;
    }
}

function getCookieValue(name) {
    const encodedName = `${encodeURIComponent(name)}=`;
    return document.cookie
        .split(';')
        .map(part => part.trim())
        .filter(Boolean)
        .reduce((found, part) => found || (part.startsWith(encodedName) ? decodeURIComponent(part.slice(encodedName.length)) : null), null);
}

function ensureAppStateScript(pathPrefix) {
    if (window.AppState || document.querySelector('script[data-app-state]')) return;
    const script = document.createElement('script');
    script.src = `${pathPrefix}components/app-state.js`;
    script.dataset.appState = 'true';
    document.head.appendChild(script);
}

function ensureUiFeedbackScript(pathPrefix) {
    if (window.AppUI || document.querySelector('script[data-ui-feedback]')) return;
    const script = document.createElement('script');
    script.src = `${pathPrefix}components/ui-feedback.js`;
    script.dataset.uiFeedback = 'true';
    document.head.appendChild(script);
}

window.addEventListener('spider:cart-changed', updateGlobalCartCount);
