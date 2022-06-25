window.Alpine = {
  directives: {
    "x-text": (el, value) => {
      el.textContent = value;
    },

    "x-show": (el, value) => {
      el.style.display = value ? "block" : "none";
    },
  },

  start() {
    this.root = document.querySelector("[x-data]");
    this.rawData = this.getInitialData();
    this.data = this.observe(this.rawData);

    this.refreshDom();
    this.registerListeners();
  },

  getInitialData() {
    let dataString = this.root.getAttribute("x-data");
    return eval(`(${dataString})`);
  },

  observe(rawData) {
    let self = this;
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
      Array.from(el.attributes).forEach((attribute) => {
        if (!Object.keys(this.directives).includes(attribute.name)) return;

        let directive = this.directives[attribute.name];
        directive(el, eval(`with (this.data) { ${attribute.value} }`));
      });
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
    Array.from(el.attributes).forEach((attribute) => {
      if (!attribute.name.startsWith("@")) return;

      let event = attribute.name.substring(1);

      el.addEventListener(event, () => {
        eval(`with(this.data) { ${attribute.value} }`);
      });
    });
  },
};

Alpine.start();
