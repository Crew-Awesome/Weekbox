window.Router = {
    async init() {
        this.mainContent = document.getElementById('main-content');
        this.sidebarContainer = document.getElementById('sidebar-container');

        await this.loadComponent(this.sidebarContainer, 'src/html/sidebar.html');
        
        if (window.SidebarLogic) {
            window.SidebarLogic.init();
        }

        await this.navigate('home');
    },

    async loadComponent(container, path) {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`No se pudo encontrar el archivo HTML: ${path}`);
        container.innerHTML = await response.text();
    },

    async navigate(viewId) {
        try {
            await this.loadComponent(this.mainContent, `src/html/${viewId}.html`);
            
            window.dispatchEvent(new CustomEvent('view:loaded', { detail: viewId }));
            
        } catch (error) {
            this.mainContent.innerHTML = `<p style="padding: 24px; color: #ff4a4a;">Error cargando la vista: ${viewId}.html</p>`;
        }
    }
};
