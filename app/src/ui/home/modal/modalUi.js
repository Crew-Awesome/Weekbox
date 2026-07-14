export async function ensureModal(onClose) {
    if (!document.getElementById('mod-modal')) {
        const response = await fetch('src/html/modal.html');
        if (!response.ok) throw new Error('Could not load mod modal');
        const wrapper = document.createElement('div');
        wrapper.innerHTML = await response.text();
        document.body.appendChild(wrapper.firstElementChild);
    }

    const modal = document.getElementById('mod-modal');
    const closeBtn = document.getElementById('modal-close-btn');
    closeBtn.onclick = onClose;
    modal.onclick = event => {
        if (event.target === modal) onClose();
    };
}

export function showModal() {
    const modal = document.getElementById('mod-modal');
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('show'));
}

export function hideModal() {
    const modal = document.getElementById('mod-modal');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
}

export function resetModal() {
    ['modal-title', 'modal-author', 'modal-description'].forEach(id => { document.getElementById(id).textContent = ''; });
    ['modal-time', 'modal-likes', 'modal-views', 'modal-filesize'].forEach(id => { document.getElementById(id).textContent = '--'; });
    document.getElementById('modal-main-image').src = '';
    document.getElementById('modal-main-image').classList.remove('fade-anim');
    document.getElementById('modal-thumbnails').replaceChildren();
    const progressBar = document.getElementById('modal-progress-bar');
    if (progressBar) {
        progressBar.style.transition = 'none';
        progressBar.style.width = '0%';
    }
    const button = document.getElementById('modal-download-btn');
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-download"></i> Download';
    button.onclick = null;
    document.getElementById('modal-engine-badge').hidden = true;
    document.getElementById('modal-engine-name').textContent = '';
}

export function showModData(data, isInstalled, onDownload) {
    document.getElementById('modal-title').textContent = data.title;
    document.getElementById('modal-author').textContent = `by ${data.author}`;
    document.getElementById('modal-time').textContent = data.timeAgo;
    document.getElementById('modal-likes').textContent = data.likes.toLocaleString();
    document.getElementById('modal-views').textContent = data.views.toLocaleString();
    document.getElementById('modal-description').innerHTML = data.description;
    document.getElementById('modal-filesize').textContent = data.fileSizeStr;
    document.getElementById('modal-image-loader').style.display = 'none';

    const engine = engineDetails[data.engineId];
    const engineBadge = document.getElementById('modal-engine-badge');
    const engineIcon = document.getElementById('modal-engine-icon');
    const engineName = document.getElementById('modal-engine-name');
    if (engine) {
        engineIcon.src = `assets/icons/${engine.icon}`;
        engineIcon.alt = '';
        engineName.textContent = engine.name;
        engineBadge.hidden = false;
    } else {
        engineBadge.hidden = true;
    }

    const button = document.getElementById('modal-download-btn');
    if (isInstalled) {
        button.disabled = true;
        button.innerHTML = '<i class="fa-solid fa-check"></i> Already Installed';
    } else if (data.downloadUrl) {
        button.disabled = false;
        button.innerHTML = '<i class="fa-solid fa-download"></i> Download';
        button.onclick = onDownload;
    }
}
const engineDetails = {
    vslice: { name: 'Base Game', icon: 'vslice.png' },
    psych: { name: 'Psych Engine', icon: 'psych.png' },
    codename: { name: 'Codename Engine', icon: 'codename.png' }
};
