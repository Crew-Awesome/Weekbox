export class ResizeController {
    constructor(sidebar, resizer, options = {}) {
        this.sidebar = sidebar;
        this.resizer = resizer;
        this.minWidth = options.minWidth || 150;
        this.maxWidth = options.maxWidth || 600;
        this.collapsedWidth = options.collapsedWidth || 10;
        this.windowBreakpoint = options.windowBreakpoint || 768; 
        
        this.isForcedCollapsed = false;
        this.lastManualWidth = 250;
    }

    init() {
        if (!this.sidebar || !this.resizer) return;
        
        this.setupResizer();
        this.setupWindowResize();
        this.checkWindowSize();
    }

    checkWindowSize() {
        const windowWidth = window.innerWidth;
        if (windowWidth < this.windowBreakpoint) {
            if (!this.isForcedCollapsed) {
                this.isForcedCollapsed = true;
                this.sidebar.classList.add('is-collapsed');
                this.sidebar.style.width = `${this.collapsedWidth}px`;
                this.resizer.style.display = 'none';
            }
        } else {
            if (this.isForcedCollapsed) {
                this.isForcedCollapsed = false;
                this.sidebar.classList.remove('is-collapsed');
                this.sidebar.style.width = `${this.lastManualWidth}px`;
                this.resizer.style.display = '';
            }
        }
    }

    setupWindowResize() {
        window.addEventListener('resize', () => {
            this.checkWindowSize();
        });
    }

    setupResizer() {
        let isResizing = false;

        const onMouseMove = (e) => {
            if (!isResizing) return;
            
            const sidebarRect = this.sidebar.getBoundingClientRect();
            let newWidth = e.clientX - sidebarRect.left;
            
            if (newWidth < this.minWidth) newWidth = this.minWidth;
            if (newWidth > this.maxWidth) newWidth = this.maxWidth;
            
            this.lastManualWidth = newWidth;
            
            if (this.isForcedCollapsed && window.innerWidth >= this.windowBreakpoint) {
                this.isForcedCollapsed = false;
                this.sidebar.classList.remove('is-collapsed');
                this.resizer.style.display = '';
            }
            
            this.sidebar.style.width = `${newWidth}px`;
        };

        const onMouseUp = () => {
            if (isResizing) {
                isResizing = false;
                this.resizer.classList.remove('is-resizing');
                document.body.style.cursor = 'default';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
        };

        this.resizer.addEventListener('mousedown', (e) => {
            if (this.isForcedCollapsed && window.innerWidth < this.windowBreakpoint) {
                return;
            }

            isResizing = true;
            this.resizer.classList.add('is-resizing');
            document.body.style.cursor = 'col-resize';
            e.preventDefault();

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }
}