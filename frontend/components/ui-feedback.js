(function () {
    'use strict';

    if (window.AppUI) return;

    const icons = {
        success: 'fa-check',
        error: 'fa-exclamation',
        warning: 'fa-triangle-exclamation',
        confirm: 'fa-trash-alt',
        info: 'fa-info'
    };

    const tones = {
        success: {
            ring: 'bg-success-100 text-success-600',
            button: 'bg-success-500 hover:bg-success-600 text-white',
            border: 'border-success-500',
            title: 'تم بنجاح'
        },
        error: {
            ring: 'bg-error-100 text-error-600',
            button: 'bg-error-500 hover:bg-error-600 text-white',
            border: 'border-error-500',
            title: 'تنبيه'
        },
        warning: {
            ring: 'bg-amber-100 text-amber-600',
            button: 'bg-amber-500 hover:bg-amber-600 text-white',
            border: 'border-amber-500',
            title: 'تحذير'
        },
        confirm: {
            ring: 'bg-error-100 text-error-600',
            button: 'bg-error-500 hover:bg-error-600 text-white',
            border: 'border-error-500',
            title: 'تأكيد الحذف'
        },
        info: {
            ring: 'bg-primary-50 text-primary-600',
            button: 'bg-primary-600 hover:bg-primary-700 text-white',
            border: 'border-primary-500',
            title: 'معلومة'
        }
    };

    function escapeHTML(value) {
        return String(value || '').replace(/[&<>'"]/g, tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag]));
    }

    function ensureToastHost() {
        let host = document.getElementById('toast-container');
        if (!host) {
            host = document.createElement('div');
            host.id = 'toast-container';
            host.className = 'fixed bottom-5 right-5 z-[70] flex flex-col gap-3 pointer-events-none';
            host.setAttribute('aria-live', 'polite');
            document.body.appendChild(host);
        }
        return host;
    }

    function toast(message, type = 'success', options = {}) {
        const host = ensureToastHost();
        const tone = tones[type] || tones.info;
        const duration = options.duration || 3000;
        const node = document.createElement('div');

        node.className = `pointer-events-auto relative overflow-hidden bg-white/95 backdrop-blur border-r-4 ${tone.border} shadow-[0_16px_45px_rgba(15,23,42,0.16)] rounded-xl w-[min(22rem,calc(100vw-2rem))] transform transition-all duration-300 translate-y-3 opacity-0 flex p-4 items-center gap-4`;
        node.setAttribute('role', type === 'error' ? 'alert' : 'status');
        node.innerHTML = `
            <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${tone.ring}">
                <i class="fas ${icons[type] || icons.info} text-lg"></i>
            </div>
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-gray-900 text-sm">${escapeHTML(options.title || tone.title)}</h4>
                <p class="text-xs text-gray-500 font-medium mt-0.5 leading-relaxed">${escapeHTML(message)}</p>
            </div>
            <button type="button" class="flex-shrink-0 text-gray-400 hover:text-gray-700 transition" aria-label="إغلاق">
                <i class="fas fa-times"></i>
            </button>
            <div class="absolute bottom-0 left-0 w-full h-1 bg-gray-100">
                <div class="h-full ${tone.border.replace('border-', 'bg-')}" style="animation: appUiProgress ${duration}ms linear forwards"></div>
            </div>
        `;

        node.querySelector('button').addEventListener('click', () => closeToast(node));
        host.appendChild(node);
        requestAnimationFrame(() => node.classList.remove('translate-y-3', 'opacity-0'));
        setTimeout(() => closeToast(node), duration);
        return node;
    }

    function closeToast(node) {
        if (!node || node.dataset.closing) return;
        node.dataset.closing = 'true';
        node.classList.add('translate-y-3', 'opacity-0');
        setTimeout(() => node.remove(), 300);
    }

    function modal(options = {}) {
        return new Promise(resolve => {
            const type = options.type || 'info';
            const tone = tones[type] || tones.info;
            const overlay = document.createElement('div');
            const confirmText = options.confirmText || 'حسنًا';
            const cancelText = options.cancelText || 'إلغاء';
            const showCancel = Boolean(options.showCancel);

            overlay.className = 'fixed inset-0 z-[80] bg-black/45 backdrop-blur-[1px] flex items-center justify-center px-4 opacity-0 transition-opacity duration-200';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('dir', 'rtl');
            overlay.innerHTML = `
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7 md:p-8 text-center transform scale-95 transition-transform duration-200">
                    <div class="w-20 h-20 mx-auto mb-5 rounded-full ${tone.ring} flex items-center justify-center text-3xl">
                        <i class="fas ${icons[type] || icons.info}"></i>
                    </div>
                    <h2 class="text-2xl font-extrabold text-gray-900 mb-3">${escapeHTML(options.title || tone.title)}</h2>
                    <p class="text-gray-500 leading-relaxed mb-7">${escapeHTML(options.message || '')}</p>
                    <div class="grid ${showCancel ? 'grid-cols-2' : 'grid-cols-1'} gap-3">
                        ${showCancel ? `<button type="button" data-action="cancel" class="bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold py-3 rounded-lg transition">${escapeHTML(cancelText)}</button>` : ''}
                        <button type="button" data-action="confirm" class="${tone.button} font-extrabold py-3 rounded-lg transition">${escapeHTML(confirmText)}</button>
                    </div>
                </div>
            `;

            function finish(value) {
                overlay.classList.add('opacity-0');
                overlay.firstElementChild.classList.add('scale-95');
                setTimeout(() => overlay.remove(), 180);
                resolve(value);
            }

            overlay.addEventListener('click', event => {
                if (event.target === overlay && showCancel) finish(false);
            });
            overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => finish(true));
            const cancelButton = overlay.querySelector('[data-action="cancel"]');
            if (cancelButton) cancelButton.addEventListener('click', () => finish(false));

            document.body.appendChild(overlay);
            requestAnimationFrame(() => {
                overlay.classList.remove('opacity-0');
                overlay.firstElementChild.classList.remove('scale-95');
            });
        });
    }

    function confirmDelete(message, options = {}) {
        return modal({
            type: 'confirm',
            title: options.title || 'تأكيد الحذف',
            message,
            showCancel: true,
            confirmText: options.confirmText || 'تأكيد الحذف',
            cancelText: options.cancelText || 'إلغاء'
        });
    }

    const style = document.createElement('style');
    style.textContent = '@keyframes appUiProgress{from{width:100%}to{width:0%}}';
    document.head.appendChild(style);

    window.AppUI = { toast, modal, confirmDelete, escapeHTML };
    window.showToast = toast;
})();
