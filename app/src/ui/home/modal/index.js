import { gameBananaApi } from '../../../api/gamebanana.js';
import { modModalCarousel } from './carousel.js';
import { downloadMod } from './downloadMod.js';
import { FS } from '../../../utils/filesystem.js';

export const modModal = {
    async init() {
        if (!document.getElementById('mod-modal')) {
            try {
                const res = await fetch('src/html/modal.html');
                const html = await res.text();
                const div = document.createElement('div');
                div.innerHTML = html;
                document.body.appendChild(div.firstElementChild);
            } catch (err) {
                return;
            }
        }
        const modal = document.getElementById('mod-modal');
        const closeBtn = document.getElementById('modal-close-btn');
        closeBtn.addEventListener('click', () => this.close());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });
    },
    
    async open(modId) {
        if (!document.getElementById('mod-modal')) await this.init();
        const modal = document.getElementById('mod-modal');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
        this.resetUI();
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
        const modal = document.getElementById('mod-modal');
        if (!modal) return;
        modal.classList.remove('show');
        modModalCarousel.stopAutoPlay();
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    },
    
    resetUI() {
        document.getElementById('modal-title').textContent = "";
        document.getElementById('modal-author').textContent = "";
        document.getElementById('modal-description').innerHTML = "";
        document.getElementById('modal-time').textContent = "--";
        document.getElementById('modal-likes').textContent = "--";
        document.getElementById('modal-views').textContent = "--";
        document.getElementById('modal-filesize').textContent = "--";
        document.getElementById('modal-main-image').src = "";
        document.getElementById('modal-main-image').classList.remove('fade-anim');
        document.getElementById('modal-thumbnails').innerHTML = "";
        const progressBar = document.getElementById('modal-progress-bar');
        if (progressBar) {
            progressBar.style.transition = 'none';
            progressBar.style.width = '0%';
        }
        const btn = document.getElementById('modal-download-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-download"></i> Download';
        btn.onclick = null;
    },
    
    async populateData(data) {
        document.getElementById('modal-title').textContent = data.title;
        document.getElementById('modal-author').textContent = `by ${data.author}`;
        document.getElementById('modal-time').textContent = data.timeAgo;
        document.getElementById('modal-likes').textContent = data.likes.toLocaleString();
        document.getElementById('modal-views').textContent = data.views.toLocaleString();
        document.getElementById('modal-description').innerHTML = data.description;
        document.getElementById('modal-filesize').textContent = data.fileSizeStr;
        document.getElementById('modal-image-loader').style.display = 'none';
        
        const btn = document.getElementById('modal-download-btn');
        
        const isInstalled = await FS.isModInstalled(data.id);
        
        if (isInstalled) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Already Installed';
        } else if (data.downloadUrl) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-download"></i> Download';
            btn.onclick = () => {
                downloadMod.install(data.id, data.title, data.downloadUrl);
            };
        }
        
        modModalCarousel.setup(data.images);
    }
};