(function () {
    'use strict';

    const TOKEN_KEY = 'spider_token';
    const LEGACY_TOKEN_KEY = 'token';
    const CART_KEY = 'spider_cart';
    const RETURN_TO_KEY = 'spider_return_to';
    const COOKIE_DAYS = 7;

    function storageGet(key) {
        try { return window.localStorage.getItem(key); } catch (error) { return null; }
    }

    function storageSet(key, value) {
        try { window.localStorage.setItem(key, value); } catch (error) {}
    }

    function storageRemove(key) {
        try { window.localStorage.removeItem(key); } catch (error) {}
    }

    function setCookie(name, value, days) {
        if (!navigator.cookieEnabled) return;
        const maxAge = Math.max(1, Number(days || COOKIE_DAYS)) * 24 * 60 * 60;
        document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }

    function getCookie(name) {
        const encodedName = `${encodeURIComponent(name)}=`;
        return document.cookie
            .split(';')
            .map(part => part.trim())
            .filter(Boolean)
            .reduce((found, part) => {
                if (found !== null || !part.startsWith(encodedName)) return found;
                return decodeURIComponent(part.slice(encodedName.length));
            }, null);
    }

    function deleteCookie(name) {
        document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0; SameSite=Lax`;
    }

    function decodeToken(token) {
        if (!token || !token.includes('.')) return null;
        try {
            const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const padded = payload.padEnd(payload.length + ((4 - payload.length % 4) % 4), '=');
            return JSON.parse(atob(padded));
        } catch (error) {
            return null;
        }
    }

    function getToken() {
        const token = storageGet(TOKEN_KEY) || storageGet(LEGACY_TOKEN_KEY) || getCookie(TOKEN_KEY);
        if (token) setToken(token);
        return token || null;
    }

    function setToken(token) {
        if (!token) return clearToken();
        storageSet(TOKEN_KEY, token);
        storageRemove(LEGACY_TOKEN_KEY);
        setCookie(TOKEN_KEY, token, COOKIE_DAYS);
    }

    function clearToken() {
        storageRemove(TOKEN_KEY);
        storageRemove(LEGACY_TOKEN_KEY);
        deleteCookie(TOKEN_KEY);
    }

    function normalizeCartItem(item) {
        const productId = Number(item && (item.product_id || item.id));
        const quantity = Math.max(1, Math.floor(Number(item && item.quantity) || 1));
        if (!productId) return null;
        return { id: productId, product_id: productId, quantity };
    }

    function getCart() {
        let cart = [];
        try { cart = JSON.parse(storageGet(CART_KEY) || '[]'); } catch (error) { cart = []; }
        if (!Array.isArray(cart)) return [];
        return cart.map(normalizeCartItem).filter(Boolean);
    }

    function setCart(items) {
        const merged = [];
        (Array.isArray(items) ? items : []).forEach(item => {
            const normalized = normalizeCartItem(item);
            if (!normalized) return;
            const existing = merged.find(cartItem => cartItem.product_id === normalized.product_id);
            if (existing) existing.quantity += normalized.quantity;
            else merged.push(normalized);
        });
        storageSet(CART_KEY, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent('spider:cart-changed', { detail: { cart: merged } }));
        return merged;
    }

    function addCartItem(productId, quantity) {
        const id = Number(productId);
        const qty = Math.max(1, Math.floor(Number(quantity) || 1));
        if (!id) return getCart();
        const cart = getCart();
        const existing = cart.find(item => item.product_id === id);
        if (existing) existing.quantity += qty;
        else cart.push({ id, product_id: id, quantity: qty });
        return setCart(cart);
    }

    function updateCartItem(productId, quantity) {
        const id = Number(productId);
        const qty = Math.floor(Number(quantity) || 0);
        if (!id) return getCart();
        const cart = getCart()
            .map(item => item.product_id === id ? { ...item, quantity: qty } : item)
            .filter(item => item.quantity > 0);
        return setCart(cart);
    }

    function removeCartItem(productId) {
        return updateCartItem(productId, 0);
    }

    function clearCart() {
        storageRemove(CART_KEY);
        window.dispatchEvent(new CustomEvent('spider:cart-changed', { detail: { cart: [] } }));
    }

    function getCartCount() {
        return getCart().reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    }

    function saveReturnTo(url) {
        storageSet(RETURN_TO_KEY, url || window.location.href);
    }

    function takeReturnTo(fallback) {
        const url = storageGet(RETURN_TO_KEY);
        storageRemove(RETURN_TO_KEY);
        return url || fallback || '../../index.html';
    }

    document.addEventListener('click', event => {
        const anchor = event.target.closest && event.target.closest('a[href="#"]');
        if (!anchor) return;
        event.preventDefault();
    }, true);

    window.AppState = {
        keys: { token: TOKEN_KEY, cart: CART_KEY, returnTo: RETURN_TO_KEY },
        getToken,
        setToken,
        clearToken,
        decodeToken,
        getRole: () => (decodeToken(getToken()) || {}).role || null,
        getUserId: () => (decodeToken(getToken()) || {}).userId || null,
        getCart,
        setCart,
        addCartItem,
        updateCartItem,
        removeCartItem,
        clearCart,
        getCartCount,
        saveReturnTo,
        takeReturnTo
    };
})();
