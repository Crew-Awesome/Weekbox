import { gameBananaApi } from '../../../api/gamebanana.js';
import { modModalCarousel } from './carousel.js';
import { downloadMod } from './downloadMod.js';
import { FS } from '../../../utils/filesystem.js';
import { ensureModal, hideModal, resetModal, showModal, showModData } from './modalUi.js';

export const modModal = {
    async init() {
        try {
            await ensureModal(() => this.close());
        } catch (error) {}
    },
    
    async open(modId) {
        if (!document.getElementById('mod-modal')) await this.init();
        if (!document.getElementById('mod-modal')) return;
        showModal();
        resetModal();
        document.getElementById('modal-title').textContent = "Loading info...";
        document.getElementById('modal-image-loader').style.display = 'block';
        const data = await gameBananaApi.getModDetails(modId);
        if (!data) {
            document.getElementById('modal-title').textContent = "Error loading mod";
            return;
        }
        await this.populateData(data);
    },
    
    close() {
        modModalCarousel.stopAutoPlay();
        hideModal();
    },
    
    async populateData(data) {
        const isInstalled = await FS.isModInstalled(data.id);
        showModData(data, isInstalled, () => downloadMod.install(data.id, data.title, data.downloadUrl, data.engineId));
        
        modModalCarousel.setup(data.images);
    }
};
