export const toastDownloadMod = {
    toasts: new Map(),

    initContainer() {
        if (document.getElementById('toast-container-main')) return;
        const container = document.createElement('div');
        container.id = 'toast-container-main';
        container.style.cssText = `
            position: fixed;
            top: 30px;
            right: 30px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 12px;
            align-items: flex-end;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    },

    toggleCollapse(modId) {
        const toast = this.toasts.get(modId);
        if (!toast) return;

        toast.isCollapsed = !toast.isCollapsed;
        const { bg, wrapper, expContent, colContent } = toast.elements;

        if (toast.isCollapsed) {
            bg.style.width = '50px';
            bg.style.height = '50px';
            bg.style.borderRadius = '25px';
            wrapper.style.width = '50px';
            wrapper.style.height = '50px';
            wrapper.style.padding = '0';

            expContent.style.opacity = '0';
            expContent.style.pointerEvents = 'none';
            colContent.style.opacity = '1';
            colContent.style.pointerEvents = 'auto';
        } else {
            bg.style.width = '300px';
            bg.style.height = '80px';
            bg.style.borderRadius = '12px';
            wrapper.style.width = '300px';
            wrapper.style.height = '80px';
            wrapper.style.padding = '16px';

            expContent.style.opacity = '1';
            expContent.style.pointerEvents = 'auto';
            colContent.style.opacity = '0';
            colContent.style.pointerEvents = 'none';
        }
    },

    show(modId, modName, onCancel) {
        this.initContainer();
        const container = document.getElementById('toast-container-main');

        const toastContainer = document.createElement('div');
        toastContainer.style.cssText = `
            position: relative;
            width: 300px;
            height: 80px;
            display: flex;
            align-items: flex-start;
            justify-content: flex-end;
            transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.6s ease, height 0.6s ease, margin-bottom 0.6s ease;
            transform: translateX(120%);
            opacity: 0;
            overflow: visible;
        `;

        const toastBg = document.createElement('div');
        toastBg.style.cssText = `
            width: 300px;
            height: 80px;
            background-color: rgba(10, 10, 10, 0.65);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1), height 0.6s cubic-bezier(0.22, 1, 0.36, 1), border-radius 0.6s ease, background-color 0.4s ease, border-color 0.4s ease;
            position: absolute;
            top: 0;
            right: 0;
        `;

        const toastContent = document.createElement('div');
        toastContent.style.cssText = `
            width: 300px;
            height: 80px;
            padding: 16px;
            position: absolute;
            top: 0;
            right: 0;
            display: flex;
            flex-direction: column;
            pointer-events: auto;
            transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1), height 0.6s cubic-bezier(0.22, 1, 0.36, 1), padding 0.6s ease;
            overflow: hidden;
            box-sizing: border-box;
        `;

        toastContent.innerHTML = `
            <div class="toast-expanded-content" style="display: flex; flex-direction: column; width: 100%; height: 100%; transition: opacity 0.4s; opacity: 1;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div class="toast-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 190px; font-weight: 800; font-size: 0.8rem; color: var(--text-main);">${modName}</div>
                    <div style="display: flex; gap: 8px;">
                        <button class="toast-mod-cancel" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1rem; padding: 0; outline: none;">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                        <button class="toast-mod-collapse" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1rem; padding: 0; outline: none;">
                            <i class="fa-solid fa-compress"></i>
                        </button>
                    </div>
                </div>
                <div class="toast-status" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.9rem; margin-top: 4px; color: var(--text-muted);">Connecting...</div>
                <div style="width: 100%; height: 4px; background: rgba(255, 255, 255, 0.1); margin-top: auto; border-radius: 2px; overflow: hidden;">
                    <div class="toast-mod-progress" style="width: 0%; height: 100%; background: var(--text-main); transition: width 0.3s ease-out;"></div>
                </div>
            </div>
            
            <div class="toast-collapsed-content" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.4s; font-weight: 800; color: var(--text-main); cursor: pointer;">
                <span class="toast-mod-percent">0%</span>
            </div>
        `;

        toastContainer.appendChild(toastBg);
        toastContainer.appendChild(toastContent);
        container.appendChild(toastContainer);

        const expContent = toastContent.querySelector('.toast-expanded-content');
        const colContent = toastContent.querySelector('.toast-collapsed-content');
        const statusEl = toastContent.querySelector('.toast-status');
        const progressEl = toastContent.querySelector('.toast-mod-progress');
        const percentEl = toastContent.querySelector('.toast-mod-percent');

        this.toasts.set(modId, {
            isCollapsed: false,
            container: toastContainer,
            elements: {
                bg: toastBg,
                wrapper: toastContent,
                expContent,
                colContent,
                statusEl,
                progressEl,
                percentEl
            }
        });

        toastContent.querySelector('.toast-mod-collapse').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleCollapse(modId);
        });

        toastContent.querySelector('.toast-mod-cancel').addEventListener('click', (e) => {
            e.stopPropagation();
            if (onCancel) onCancel(modId);
        });

        colContent.addEventListener('click', () => {
            const t = this.toasts.get(modId);
            if (t && t.isCollapsed) this.toggleCollapse(modId);
        });

        requestAnimationFrame(() => {
            toastContainer.style.transform = 'translateX(0)';
            toastContainer.style.opacity = '1';
        });
    },

    update(modId, percent, statusText) {
        const toast = this.toasts.get(modId);
        if (!toast) return;

        const p = Math.floor(percent);
        toast.elements.statusEl.textContent = `${p}% - ${statusText}`;
        toast.elements.percentEl.textContent = `${p}%`;
        toast.elements.progressEl.style.width = `${percent}%`;
    },

    success(modId) {
        const toast = this.toasts.get(modId);
        if (!toast) return;

        toast.elements.bg.style.backgroundColor = 'rgba(46, 125, 50, 0.75)';
        toast.elements.bg.style.borderColor = 'rgba(46, 125, 50, 0.9)';
        toast.elements.statusEl.innerHTML = '<i class="fa-solid fa-check" style="margin-right: 6px; color: #fff;"></i><span style="color: #fff;">Installed</span>';
        toast.elements.percentEl.innerHTML = '<i class="fa-solid fa-check"></i>';
        toast.elements.progressEl.style.width = '100%';
        toast.elements.progressEl.style.background = '#ffffff';

        setTimeout(() => this.hide(modId), 4000);
    },

    cancelAnim(modId) {
        const toast = this.toasts.get(modId);
        if (!toast) return;

        toast.elements.bg.style.backgroundColor = 'rgba(180, 40, 40, 0.75)';
        toast.elements.bg.style.borderColor = 'rgba(180, 40, 40, 0.9)';
        toast.elements.statusEl.innerHTML = `<span style="color: #fff;">Cancelling...</span>`;
        toast.elements.progressEl.style.background = '#ffcccc';
        toast.elements.progressEl.style.width = '0%';
        
        let current = parseInt(toast.elements.percentEl.textContent) || 0;
        const step = Math.max(1, Math.floor(current / 15));
        
        const interval = setInterval(() => {
            current -= step;
            if (current <= 0) {
                current = 0;
                clearInterval(interval);
                toast.elements.percentEl.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                toast.elements.statusEl.innerHTML = `<span style="color: #fff;">Cancelled</span>`;
            } else {
                toast.elements.percentEl.textContent = `${current}%`;
            }
        }, 20);
    },

    error(modId, msg) {
        const toast = this.toasts.get(modId);
        if (!toast) return;

        toast.elements.bg.style.backgroundColor = 'rgba(180, 40, 40, 0.75)';
        toast.elements.bg.style.borderColor = 'rgba(180, 40, 40, 0.9)';
        toast.elements.statusEl.innerHTML = `<span style="color: #fff;">Error: ${msg}</span>`;
        toast.elements.percentEl.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        toast.elements.progressEl.style.background = '#ffcccc';
        
        setTimeout(() => this.hide(modId), 5000);
    },

    hide(modId) {
        const toast = this.toasts.get(modId);
        if (!toast) return;

        toast.container.style.transform = 'translateX(120%)';
        toast.container.style.opacity = '0';

        setTimeout(() => {
            toast.container.style.height = '0px';
            toast.container.style.marginBottom = '-12px';
            toast.container.style.overflow = 'hidden';
        }, 500);

        setTimeout(() => {
            toast.container.remove();
            this.toasts.delete(modId);
            
            if (this.toasts.size === 0) {
                const main = document.getElementById('toast-container-main');
                if (main) main.remove();
            }
        }, 1000);
    }
};