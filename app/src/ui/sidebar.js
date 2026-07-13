window.SidebarLogic = {
    async init() {
        this.sidebar = document.getElementById('sidebar');
        this.resizer = document.getElementById('sidebar-resizer');
        this.tabButtons = document.querySelectorAll('.nav-btn[data-tab]');
        
        this.isResizing = false;
        if (!this.sidebar) return;
        
        this.setupResizer();
        this.setupNavigation();
        
        await this.loadEngines();
    },
    
    setupResizer() {
        if (!this.resizer) return;
        
        this.resizer.addEventListener('mousedown', () => {
            this.isResizing = true;
            document.body.style.cursor = 'ew-resize';
            this.resizer.classList.add('resizing');
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isResizing) return;
            let newWidth = e.clientX;
            if (newWidth < 200) newWidth = 200;
            if (newWidth > 500) newWidth = 500;
            this.sidebar.style.width = `${newWidth}px`;
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isResizing) {
                this.isResizing = false;
                document.body.style.cursor = 'default';
                this.resizer.classList.remove('resizing');
            }
        });
    },
    
    setupNavigation() {
        this.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.tabButtons.forEach(b => b.classList.remove('active'));
                
                const engineBtns = document.querySelectorAll('.engine-btn');
                engineBtns.forEach(b => b.classList.remove('active'));
                
                btn.classList.add('active');
                const viewToLoad = btn.getAttribute('data-tab');
                window.Router.navigate(viewToLoad);
            });
        });
    },
    
    extractVersionFromUrl(url) {
        if (!url) return "Unknown";
        const githubMatch = url.match(/\/download\/(v?([^\/]+))\//);
        if (githubMatch && githubMatch[2]) return githubMatch[2]; 
        
        const genericMatch = url.match(/(?:v|-)?(\d+\.\d+(?:\.\d+)?)/i);
        if (genericMatch && genericMatch[1]) return genericMatch[1];
        
        return "Unknown";
    },
    
    async loadEngines() {
        const wrapper = document.getElementById('engines-wrapper');
        if (!wrapper) return;
        
        try {
            const response = await fetch('src/data/engines-router.json');
            if (!response.ok) throw new Error("Error cargando engines-router.json");
            
            const enginesRouter = await response.json();
            wrapper.innerHTML = '';
            
            for (const engineDef of enginesRouter) {
                const displayName = engineDef.name;
                const iconSrc = engineDef.icon ? `assets/icons/${engineDef.icon}` : '';
                
                const btn = document.createElement('button');
                btn.className = 'nav-btn engine-btn';
                
                btn.innerHTML = `
                    <img src="${iconSrc}" class="engine-icon" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 512 512\\'><path fill=\\'%23888\\' d=\\'M448 32H64C28.65 32 0 60.65 0 96v320c0 35.35 28.65 64 64 64h384c35.35 0 64-28.65 64-64V96C512 60.65 483.3 32 448 32zM212.7 222.7L132.7 302.7C126.4 308.9 118.2 312 110.1 312s-16.38-3.125-22.62-9.375c-12.5-12.5-12.5-32.75 0-45.25L155.3 189.3l-67.88-67.88c-12.5-12.5-12.5-32.75 0-45.25s32.75-12.5 45.25 0l102.6 102.6C247.7 191.3 247.7 210.2 212.7 222.7zM384 320c-17.67 0-32-14.33-32-32s14.33-32 32-32h32c17.67 0 32 14.33 32 32s-14.33 32-32 32H384z\\'/></svg>'">
                    <span>${displayName}</span>
                `;
                
                btn.addEventListener('click', async () => {
                    this.tabButtons.forEach(b => b.classList.remove('active'));
                    const engineBtns = document.querySelectorAll('.engine-btn');
                    engineBtns.forEach(b => b.classList.remove('active'));
                    
                    btn.classList.add('active');
                    
                    try {
                        const originalText = btn.querySelector('span').textContent;
                        btn.querySelector('span').innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right:4px;"></i> Cargando...`;
                        
                        const verResponse = await fetch(`src/data/${engineDef.versions}.json`);
                        if (!verResponse.ok) throw new Error(`Error cargando ${engineDef.versions}.json`);
                        
                        const rawVersionsData = await verResponse.json();
                        
                        const processedVersionsData = rawVersionsData.map(item => {
                            const sampleLink = item.win || item.lin || item.mac || "";
                            return {
                                ...item,
                                version: item.version || this.extractVersionFromUrl(sampleLink)
                            };
                        });
                        
                        processedVersionsData.sort((a, b) => {
                            return b.version.localeCompare(a.version, undefined, { numeric: true, sensitivity: 'base' });
                        });
                        
                        btn.querySelector('span').textContent = originalText;
                        
                        window.SelectedEngine = { 
                            id: engineDef.versions,
                            meta: {
                                name: engineDef.name,
                                icon: engineDef.icon
                            },
                            versions: processedVersionsData 
                        };
                        
                        window.Router.navigate('engines');
                        
                    } catch (err) {
                        console.error(err);
                        btn.querySelector('span').textContent = displayName;
                        alert(`No se pudo cargar la información de las versiones para ${displayName}`);
                    }
                });
                
                wrapper.appendChild(btn);
            }
        } catch (error) {
            console.error(error);
            wrapper.innerHTML = `<p style="color:red; padding:8px; font-size:12px;">Error cargando router de motores</p>`;
        }
    }
};
