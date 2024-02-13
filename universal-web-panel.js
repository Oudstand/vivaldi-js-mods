/**
 * Inspired by @aminought
 * Forum link: https://forum.vivaldi.net/topic/94754/universal-web-panel-mod
 */
(function universal_web_panel() {
  "use strict";

  const PANEL_ID = "WEBPANEL_7386ba5c-36af-495f-a850-8a7acbb242ac";

  const DEFAULT_TITLE = "Universal Web Panel";
  const DEFAULT_ICON = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23cdc8c0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='feather feather-search'><circle cx='11' cy='11' r='8'></circle><line x1='21' y1='21' x2='16.65' y2='16.65'></line></svg>";
  const USE_DEFAULT_ICON = true;
  const FAVORITES = [{caption: "YouTube", url: "https://www.youtube.com"}, {caption: "Google", url: "https://www.google.com"}];

  class UWP {
    #panelStackChangeObserver;
    #panelChangeObserver;

    constructor() {
      if (this.#panel) {
        this.#panelChangeObserver = this.#createPanelChangeObserver();
        this.#register();
      } else {
        this.#panelStackChangeObserver = this.#createPanelStackChangeObserver();
      }
    }

    #register() {
      this.#isVisible ? this.#registerVisible() : this.#registerInvisible();
    }

    #registerVisible() {
      if (!this.#input) {
        this.#createInputToolbarAndInput();
        this.#addInputEvents();
        FAVORITES && FAVORITES.length && this.#addComboboxEvents();
        this.#addWebviewEvents();
      }
      this.#focusInput();
      if (this.#isBlank) {
        this.#title = DEFAULT_TITLE;
        this.#buttonImg = DEFAULT_ICON;
      } else if (USE_DEFAULT_ICON) {
        this.#buttonImg = DEFAULT_ICON;
      }
    }

    #registerInvisible() {
      this.#buttonImg = this.#isBlank || USE_DEFAULT_ICON ? DEFAULT_ICON : this.#webview.src;
    }

    // listeners

    #createPanelStackChangeObserver() {
      const panelStackChangeObserver = new MutationObserver((records) => {
        records.forEach(() => this.#handlePanelStackChange());
      });
      panelStackChangeObserver.observe(this.#panelStack, { childList: true });
      return panelStackChangeObserver;
    }

    #createPanelChangeObserver() {
      const panelChangeObserver = new MutationObserver((records) => {
        records.forEach(() => this.#handlePanelChange());
      });
      panelChangeObserver.observe(this.#panel, {
        attributes: true,
        attributeFilter: ["class"],
      });
      return panelChangeObserver;
    }

    #addInputEvents() {
      this.#input.addEventListener("input", () => this.#handleInput(this.#input.value.trim()));
    }

    #addComboboxEvents() {
      this.#combobox.addEventListener("input", () => this.#handleInput(this.#combobox.value.trim()));
    }

    #addWebviewEvents() {
      this.#webview.addEventListener("contentload", () => {
        this.#showWebview();
        if (this.#isBlank) {
          this.#title = DEFAULT_TITLE;
          this.#buttonImg = DEFAULT_ICON;
        } else if (USE_DEFAULT_ICON) {
          this.#buttonImg = DEFAULT_ICON;
        } else {
          this.#buttonImg = this.#webview.src;
        }
      });
    }

    // builders

    #createInputToolbarAndInput() {
      const input = this.#createInput();
      const inputToolbar = this.#createInputToolbar();
      inputToolbar.appendChild(input);

      if(FAVORITES && FAVORITES.length) {
        const combobox = this.#createCombobox();
        inputToolbar.appendChild(combobox);
      }

      this.#panel.appendChild(inputToolbar);
    }

    #createInputToolbar() {
      const inputToolbar = document.createElement("div");
      inputToolbar.className =
        "panel-universal-input toolbar-default full-width";
      inputToolbar.width = "100%";
      inputToolbar.style.height = "24px";
      inputToolbar.style.width = "100%";
      inputToolbar.style.height = "28px";
      inputToolbar.style.padding = "0 2px";
      inputToolbar.style.marginTop = "2px";
      inputToolbar.style.display = "flex";
      inputToolbar.style.gap = "10px";
      return inputToolbar;
    }

    #createInput() {
      const input = document.createElement("input");
      input.className = "universal-input";
      input.type = "text";
      input.placeholder = "Paste your link, html or javascript";
      input.style.flex = 3;
      input.style.height = "28px";
      input.style.padding = "10px";
      return input;
    }

    #createCombobox() {
      const comboboxDropdown = document.createElement('select');
      comboboxDropdown.id = "combobox-dropdown";
      comboboxDropdown.className = "universal-combobox";
      comboboxDropdown.style.flex = 1;
    
      // Create a default option
      const defaultOption = document.createElement('option');
      defaultOption.textContent = "Favorites";
      defaultOption.selected = true;
      defaultOption.disabled = true;
      comboboxDropdown.appendChild(defaultOption);
    
      FAVORITES.forEach(favorite => {
        const option = document.createElement('option');
        option.value = favorite.url;
        option.textContent = favorite.caption;
        comboboxDropdown.appendChild(option);
      });
      
      return comboboxDropdown;
    }   

    #createHtmlview() {
      const htmlview = document.createElement("div");
      htmlview.id = "htmlview";
      htmlview.style.height = "100%";
      htmlview.style.overflow = "auto";
      return htmlview;
    }

    // getters

    get #panelStack() {
      return document.querySelector(".webpanel-stack");
    }

    get #panel() {
      return document.querySelector(`webview[tab_id^="${PANEL_ID}"], webview[vivaldi_view_type^="${PANEL_ID}`)
        ?.parentElement?.parentElement;
    }

    get #button() {
      return document.querySelector(`button[name="${PANEL_ID}"]`);
    }

    get #content() {
      return this.#panel.querySelector(".webpanel-content");
    }

    get #title() {
      return this.#panel.querySelector(".webpanel-title").querySelector("span");
    }

    get #htmlview() {
      return this.#panel.querySelector("#htmlview");
    }

    get #webview() {
      return this.#panel.querySelector("webview");
    }

    get #input() {
      return this.#panel.querySelector(".universal-input");
    }

    get #combobox() {
      return this.#panel.querySelector(".universal-combobox");
    }

    get #buttonImg() {
      return this.#button.querySelector("img");
    }

    get #isVisible() {
      return this.#panel.classList.contains("visible");
    }

    get #isBlank() {
      return this.#webview.src === "about:blank";
    }

    // setters

    set #title(title) {
      setTimeout(() => (this.#title.innerText = title), 100);
    }

    set #buttonImg(url) {
      this.#buttonImg.removeAttribute("srcset");
      const src =
        url && (url.startsWith("http://") || url.startsWith("https://"))
          ? `chrome://favicon/size/16@1x/${url}`
          : url;
      this.#buttonImg.setAttribute("src", src);
    }

    // handlers

    #handleInput(value) {
      if (
        value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("file://") ||
        value.startsWith("vivaldi://") ||
        value === "about:blank"
      ) {
        this.#openUrl(value);
      } else if (value.startsWith("(()") && value.endsWith(")()")) {
        this.#executeScript(value);
      } else {
        this.#showHtml(value);
      }
      this.#clearInput();
    }

    #openUrl(url) {
      this.#showWebview();
      this.#webview.src = url;
    }

    #executeScript(script) {
      this.#showWebview();
      this.#webview.executeScript({ code: script });
    }

    #showHtml(html) {
      this.#hideWebview();
      if (!this.#htmlview) {
        const htmlview = this.#createHtmlview();
        this.#content.appendChild(htmlview);
      }
      this.#htmlview.innerHTML = html;
      this.#title = DEFAULT_TITLE;
      this.#buttonImg = DEFAULT_ICON;
    }

    #handlePanelStackChange() {
      if (this.#panel) {
        this.#panelChangeObserver = this.#createPanelChangeObserver();
        this.#register();
      }
    }

    #handlePanelChange() {
      if (this.#isVisible) {
        this.#registerVisible();
      }
    }

    // actions

    #showWebview() {
      if (this.#webview.style.display === "none") {
        this.#htmlview.remove();
        this.#webview.style.display = "";
      }
    }

    #hideWebview() {
      this.#webview.style.display = "none";
    }

    #clearInput() {
      this.#input.value = "";
    }

    #focusInput() {
      setTimeout(() => this.#input.focus(), 100);
    }
  }

  function getPanels() {
    return document.querySelector(".webpanel-stack");
  }

  function initMod() {
    const panels = getPanels();
    if (panels) {
      window.uwp = new UWP();
    } else {
      setTimeout(initMod, 500);
    }
  }

  setTimeout(initMod, 500);
})();