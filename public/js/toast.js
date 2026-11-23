(function () {
    let hideTimer;

    window.showToast = function (message, type = 'success') {
        let toast = document.getElementById('hubGlobalToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'hubGlobalToast';
            toast.style.cssText = 'position:fixed; bottom:24px; right:24px; max-width:calc(100vw - 32px); background:#162544; color:#fff; padding:14px 20px; border-radius:8px; font-weight:700; font-size:13px; box-shadow:0 10px 30px rgba(0,0,0,0.3); z-index:99999; transition:opacity 0.3s ease; display:none;';
            document.body.appendChild(toast);
        }

        const isError = type === 'error';
        const borderColor = isError ? '#ef4444' : type === 'info' ? '#3b82f6' : '#10b981';
        toast.style.borderLeft = `4px solid ${borderColor}`;
        toast.setAttribute('role', isError ? 'alert' : 'status');
        toast.setAttribute('aria-live', isError ? 'assertive' : 'polite');
        toast.textContent = String(message);
        toast.style.display = 'block';
        toast.style.opacity = '1';

        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.style.display = 'none';
            }, 300);
        }, 3500);
    };
})();
