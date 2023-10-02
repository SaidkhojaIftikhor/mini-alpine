function reactive() {
    return {
        rawData: null,
        root: null,
        data: null,
        init(root, rawData) {
            this.root = root;
            this.rawData = rawData;

            this.observe();
            this.refreshDom();
            this.registerListeners();


            return this;
        },
        refreshDom() {
            this.walkDom(this.root, (el) => {
                for (const attribute of el.attributes) {
                    let { name, value } = attribute;
                    if (name.startsWith('x-bind') || name.startsWith(':')) {
                        directives['x-bind'](el, name, eval(`with (this.data) { ${value} }`))
                        continue
                    }
                    if (!Object.keys(directives).includes(name)) return;

                    const directive = directives[name];

                    directive(el, eval(`with (this.data) { ${value} }`));
                }
            });
            return this;
        },
        observe() {
            const self = this;
            this.data = new Proxy(self.rawData, {
                set(target, key, value) {
                    target[key] = value;
                    self.refreshDom();
                    self.root.setAttribute("x-data", JSON.stringify(self.rawData));
                    return true;
                },
            });
            return this;
        },
        registerListeners() {
            this.walkDom(this.root, (el) => {
                this.addListenerToElement(el);
            });
            return this;
        },
        walkDom(el, callback) {
            callback(el);

            el = el.firstElementChild;

            while (el) {
                this.walkDom(el, callback);
                el = el.nextElementSibling;
            }
            return this;
        },
        addListenerToElement(el) {
            for (const attribute of el.attributes) {
                if (!attribute.name.startsWith("x-on") && !attribute.name.startsWith("@")) return;
                const event = attribute.name.startsWith("@") ? attribute.name.substring(1) : attribute.name.substring(5);
                el.addEventListener(event, () => {
                    eval(`with(this.data) { ${attribute.value} }`);
                });
            }
            return this;
        },
    }
};
const getElementId = (() => {
    let incrementingId = 0;
    return (element) => {
      if (!element.cache_id) element.cache_id = "id_" + incrementingId++;
      return element.cache_id;
    }
})();
const directives = {
    "x-text": (el, value) => {
        el.textContent = value;
    },
    "x-show": (el, value) => {
        el.style.display = value ? "block" : "none";
    },
    "x-if": (element, value) => {

        
        if (!value) {
            if (element instanceof HTMLElement) {
                let elementId = getElementId(element);
                if (!Alpine.cache.has(elementId)) {
                    Alpine.cache.set(elementId, element.innerHTML.toString());
                }
                element.innerHTML = "";
            }

            return;
        }

        if (element.innerHTML === "") {
            let elementId = getElementId(element);
            if (Alpine.cache.has(elementId)) {
                element.innerHTML = Alpine.cache.get(elementId);
            }
        }
    },
    "x-bind": (el, attrName, value) => {
        const actualAttrName = attrName.startsWith(":") ? attrName.substring(1) : attrName.substring(7);
        el.setAttribute(actualAttrName, value);
    }
}
window.Alpine = {
    cache: new Map(),
    start() {
        const roots = document.querySelectorAll("[x-data]");
        for(const root of roots) {
            const rawData = this.getInitialData(root);
            new reactive().init(root, rawData);
        }
    },

    getInitialData(root) {
        const dataString = root.getAttribute("x-data");
        return eval(`(${dataString})`);
    },
};

Alpine.start();