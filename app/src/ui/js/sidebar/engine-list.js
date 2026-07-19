export class EngineListController {
    constructor(containerSelector, dataPath, templatePath, parentContainer) {
        this.container = parentContainer.querySelector(containerSelector);
        this.dataPath = dataPath;
        this.templatePath = templatePath;
    }

    async init() {
        if (!this.container) return;

        try {
            const [dataResponse, templateResponse] = await Promise.all([
                fetch(this.dataPath),
                fetch(this.templatePath)
            ]);

            if (!dataResponse.ok || !templateResponse.ok) throw new Error('Fetch failed');

            const engines = await dataResponse.json();
            const templateHtml = await templateResponse.text();
            const parser = new DOMParser();

            engines.forEach(engine => {
                const doc = parser.parseFromString(templateHtml, 'text/html');
                const button = doc.body.firstElementChild;

                if (button) {
                    button.setAttribute('data-engine', engine.versions);
                    button.setAttribute('title', engine.name);

                    const img = button.querySelector('img');
                    if (img) {
                        img.src = `assets/engine-icons/${engine.icon}`;
                        img.alt = engine.name;
                    }

                    const span = button.querySelector('span');
                    if (span) {
                        span.textContent = engine.name;
                    }

                    this.container.appendChild(button);
                }
            });
        } catch (error) {
            const errorSpan = document.createElement('span');
            errorSpan.style.color = '#ccc';
            errorSpan.style.padding = '10px 12px';
            errorSpan.style.fontSize = '14px';
            errorSpan.textContent = 'Failed to load engines';
            this.container.appendChild(errorSpan);
        }
    }
}