window.ModModal = {
    async init() {
        if (!document.getElementById('mod-modal')) {
            try {
                const res = await fetch('src/html/modal.html');
                const html = await res.text();
                const div = document.createElement('div');
                div.innerHTML = html;
                document.body.appendChild(div.firstElementChild);
            } catch (err) {
                console.error("Error loading modal HTML", err);
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

        const data = await window.GameBananaAPI.getModDetails(modId);
        if (!data) {
            document.getElementById('modal-title').textContent = "Error loading mod";
            return;
        }

        this.populateData(data);
    },

    close() {
        const modal = document.getElementById('mod-modal');
        if (!modal) return;
        
        modal.classList.remove('show');
        
        if (window.ModModalCarousel) {
            window.ModModalCarousel.stopAutoPlay();
        }
        
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
        btn.onclick = null;
    },

    populateData(data) {
        document.getElementById('modal-title').textContent = data.title;
        document.getElementById('modal-author').textContent = `by ${data.author}`;
        document.getElementById('modal-time').textContent = data.timeAgo;
        document.getElementById('modal-likes').textContent = data.likes.toLocaleString();
        document.getElementById('modal-views').textContent = data.views.toLocaleString();
        document.getElementById('modal-description').innerHTML = data.description;
        document.getElementById('modal-filesize').textContent = data.fileSizeStr;
        document.getElementById('modal-image-loader').style.display = 'none';

        const btn = document.getElementById('modal-download-btn');
        if (data.downloadUrl) {
            btn.disabled = false;
            btn.onclick = () => {
                console.log("Downloading from:", data.downloadUrl);
                window.open(data.downloadUrl, "_blank");
            };
        }

        if (window.ModModalCarousel) {
            window.ModModalCarousel.setup(data.images);
        }
    }
};
