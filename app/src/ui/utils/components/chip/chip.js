/**
 * Md3Chip - Material Design 3 based chip web component.
 * It uses the BEM methodology and manages the DOM safely without using innerHTML.
 */
export class Md3Chip {
    /**
     * @param {HTMLElement} container - The base container element (e.g., an empty div with the .md3-component-chip class).
     */
    constructor(container) {
        if (!container) throw new Error('Container is required for Md3Chip');
        if (container.md3ChipAPI) return container.md3ChipAPI;

        this.container = container;
        this.container.md3ChipAPI = this;
        this.container.dataset.init = 'true';

        if (!this.container.classList.contains('md3-component-chip')) {
            this.container.classList.add('md3-component-chip');
        }

        this.config = {
            text: this.container.dataset.text || '',
            icon: this.container.dataset.icon || '',
            variant: this.container.dataset.variant || 'primary',
            state: this.container.dataset.state || 'default'
        };

        this._buildDOM();
        this._applyConfig();
        this._bindEvents();
    }

    /**
     * Safely constructs the internal structure without using innerHTML.
     * @private
     */
    _buildDOM() {
        this.container.textContent = '';

        this.elements = {
            iconContainer: document.createElement('div'),
            label: document.createElement('span')
        };

        this.elements.iconContainer.className = 'md3-component-chip__icon-container';
        this.elements.label.className = 'md3-component-chip__label';

        this.container.appendChild(this.elements.iconContainer);
        this.container.appendChild(this.elements.label);
    }

    /**
     * Applies the current configuration to the DOM elements.
     * @private
     */
    _applyConfig() {
        this.setText(this.config.text);
        this.setIcon(this.config.icon);
        this.setVariant(this.config.variant);
        this.setState(this.config.state);
    }

    /**
     * Attaches basic event listeners safely for hover and active states.
     * @private
     */
    _bindEvents() {
        this._listeners = {
            mouseenter: () => {
                if (this.config.state !== 'disabled') {
                    this.container.classList.add('md3-component-chip--hover');
                }
            },
            mouseleave: () => {
                this.container.classList.remove('md3-component-chip--hover');
                this.container.classList.remove('md3-component-chip--active');
            },
            mousedown: () => {
                if (this.config.state !== 'disabled') {
                    this.container.classList.add('md3-component-chip--active');
                }
            },
            mouseup: () => {
                this.container.classList.remove('md3-component-chip--active');
            }
        };

        this.container.addEventListener('mouseenter', this._listeners.mouseenter);
        this.container.addEventListener('mouseleave', this._listeners.mouseleave);
        this.container.addEventListener('mousedown', this._listeners.mousedown);
        this.container.addEventListener('mouseup', this._listeners.mouseup);
    }

    /**
     * Destroys the component instance, cleaning up event listeners and references.
     * Useful for preventing memory leaks when the chip is removed from the DOM.
     */
    destroy() {
        if (this._listeners) {
            this.container.removeEventListener('mouseenter', this._listeners.mouseenter);
            this.container.removeEventListener('mouseleave', this._listeners.mouseleave);
            this.container.removeEventListener('mousedown', this._listeners.mousedown);
            this.container.removeEventListener('mouseup', this._listeners.mouseup);
            this._listeners = null;
        }

        delete this.container.md3ChipAPI;
        delete this.container.dataset.init;
        this.container.textContent = '';
    }

    /**
     * Updates the text label of the chip.
     * @param {string} text - The text to display.
     */
    setText(text) {
        this.config.text = text;
        this.elements.label.textContent = text;
    }

    /**
     * Updates the icon. Smartly detects if it's an image path or a FontAwesome class.
     * @param {string} icon - Image path or FontAwesome class string.
     */
    setIcon(icon) {
        this.config.icon = icon;
        this.elements.iconContainer.textContent = '';

        if (!icon) {
            this.elements.iconContainer.style.display = 'none';
            return;
        }

        this.elements.iconContainer.style.display = 'flex';

        if (icon.includes('fa-') || icon.startsWith('fas ') || icon.startsWith('fab ') || icon.startsWith('fa-solid')) {
            const i = document.createElement('i');
            const classes = icon.split(' ').filter(c => c.trim() !== '');
            i.classList.add('md3-component-chip__icon', 'md3-component-chip__icon--fa', ...classes);
            this.elements.iconContainer.appendChild(i);
        } else {
            const img = document.createElement('img');
            img.classList.add('md3-component-chip__icon', 'md3-component-chip__icon--img');
            img.src = icon;
            img.alt = 'Chip Icon';
            this.elements.iconContainer.appendChild(img);
        }
    }

    /**
     * Applies a specific variant style to the chip.
     * @param {string} variant - The visual variant (e.g., primary, secondary, engine, time).
     */
    setVariant(variant) {
        this.container.classList.forEach(cls => {
            if (cls.startsWith('md3-component-chip--variant-')) {
                this.container.classList.remove(cls);
            }
        });
        
        this.config.variant = variant;
        if (variant) {
            this.container.classList.add(`md3-component-chip--variant-${variant}`);
        }
    }

    /**
     * Applies a visual state to the chip.
     * @param {string} state - The state (e.g., default, disabled).
     */
    setState(state) {
        this.container.classList.remove('md3-component-chip--state-disabled');
        
        this.config.state = state;
        if (state === 'disabled') {
            this.container.classList.add('md3-component-chip--state-disabled');
        }
    }

    /**
     * Gets the current visual state of the chip.
     * @returns {string} The current state.
     */
    getState() {
        return this.config.state;
    }
}

/**
 * Initializes all chip components found in the provided DOM root.
 * @param {string} [selector='.md3-component-chip'] - The CSS selector for finding chip containers.
 * @param {Document|Element} [root=document] - The root element to query within.
 */
export function initChips(selector = '.md3-component-chip', root = document) {
    const elements = root.querySelectorAll(selector);
    elements.forEach(el => {
        if (!el.dataset.init) {
            new Md3Chip(el);
        }
    });
}
