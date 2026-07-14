// Opcional: utils/downloadToast.js simplificado
import { FS } from './filesystem.js';
import { appEvents } from '../core/events.js';

class GlobalDownloadToast {
    constructor() {
        this.el = null;
        this.currentView = 'engines';
        this.lastData = null;
    }
    createUI() {}
    bindEvents() {}
    handleUpdate(data) {}
    checkVisibility() {}
}

export const globalDownloadToast = new GlobalDownloadToast();