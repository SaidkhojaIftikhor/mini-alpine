window.Alpine = {
    cache: new Map(),

    constants: {
        removedElement: "_rmEl",
    },
    directives: {
        "x-text": (el, value) => {
            el.textContent = value;
        },

        "x-show": (el, value) => {
            el.style.display = value ? "block" : "none";
        },
        "x-if": (element, value) => {
            if (!value) {
                if (element instanceof HTMLElement) {
                    if (!Alpine.cache.has(Alpine.constants.removedElement)) {
                        Alpine.cache.set(
                            Alpine.constants.removedElement,
                            element.innerHTML.toString()
                        );
                    }

                    element.innerHTML = "";
                }

                return;
            }

            if (element.innerHTML === "") {
                if (Alpine.cache.has(Alpine.constants.removedElement)) {
                    element.innerHTML = Alpine.cache.get(
                        Alpine.constants.removedElement
                    );
                }
            }
        },
        "x-bind": (el, value) => {
            const attrName = el.getAttributeNames().find(name => name.startsWith("x-bind:") || name.startsWith(":"));
            const actualAttrName = attrName.startsWith(":") ? attrName.substring(1) : attrName.substring(7);
            el.setAttribute(actualAttrName, value);
        }
    },

    start() {
        this.root = document.querySelector("[x-data]");
        this.rawData = this.getInitialData();
        this.data = this.observe(this.rawData);
        this.refreshDom();
        this.registerListeners();
    },

    getInitialData() {
        const dataString = this.root.getAttribute("x-data");
        return eval(`(${dataString})`);
    },

    observe(rawData) {
        const self = this;
        return new Proxy(rawData, {
            set(target, key, value) {
                target[key] = value;
                self.refreshDom();
                self.root.setAttribute("x-data", JSON.stringify(rawData));
                return true;
            },
        });
    },

    refreshDom() {
        this.walkDom(this.root, (el) => {
            for (const attribute of el.attributes) {
                let { name, value } = attribute;
                if (name.startsWith('x-bind') || name.startsWith(':')) {
                    this.directives['x-bind'](el, eval(`with (this.data) { ${value} }`))
                    continue
                }
                if (!Object.keys(this.directives).includes(name)) return;

                const directive = this.directives[name];
                directive(el, eval(`with (this.data) { ${value} }`));
            }
        });
    },

    walkDom(el, callback) {
        callback(el);

        el = el.firstElementChild;

        while (el) {
            this.walkDom(el, callback);
            el = el.nextElementSibling;
        }
    },

    registerListeners() {
        this.walkDom(this.root, (el) => {
            this.addListenerToElement(el);
        });
    },

    addListenerToElement(el) {
        for (const attribute of el.attributes) {
            if (!attribute.name.startsWith("@")) return;

            const event = attribute.name.substring(1);

            el.addEventListener(event, () => {
                eval(`with(this.data) { ${attribute.value} }`);
            });
        }
    },
};

Alpine.start();
