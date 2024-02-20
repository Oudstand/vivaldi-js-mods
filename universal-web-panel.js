/**
 * Inspired by @aminought
 * Forum link: https://forum.vivaldi.net/topic/94754/universal-web-panel-mod
 */
(function universal_web_panel() {
  "use strict";

  const PANEL_ID = "WEBPANEL_7386ba5c-36af-495f-a850-8a7acbb242ac";

  const DEFAULT_TITLE = "Universal Web Panel";
  const DEFAULT_ICON =
    "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23cdc8c0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='feather feather-search'><circle cx='11' cy='11' r='8'></circle><line x1='21' y1='21' x2='16.65' y2='16.65'></line></svg>";
  const USE_DEFAULT_ICON = true;
  const FAVORITES = [
    { caption: "YouTube", url: "https://www.youtube.com" },
    { caption: "Google", url: "https://www.google.com" },
  ];

  const TOOLBAR_HEIGHT = "28px";
  const INPUT_BORDER_RADIUS = "10px";

  class UWP {
    #panelStackChangeObserver;
    #panelChangeObserver;

    constructor() {
      if (this.#panel) {
        this.#panelChangeObserver = this.#createPanelChangeObserver();
        this.#register();
      } else {
        this.#panelStackChangeObserver = this.#createPanelStackChangeObserver();
        if (USE_DEFAULT_ICON) {
          this.#buttonImg = DEFAULT_ICON;
        }
      }
    }

    #register() {
      this.#isVisible ? this.#registerVisible() : this.#registerInvisible();
    }

    #registerVisible() {
      if (!this.#input) {
        this.createUwpToolbar();
        this.#addInputEvents();
        this.#addWebviewEvents();
        this.#addFavoritesSelectEvents();
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
      this.#buttonImg =
        this.#isBlank || USE_DEFAULT_ICON ? DEFAULT_ICON : this.#webview.src;
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
      this.#input.addEventListener("input", () =>
        this.#handleInput(this.#input.value.trim())
      );
    }

    #addFavoritesSelectEvents() {
      if (this.#isfavoritesEnabled) {
        this.#favoritesSelect.addEventListener("input", () => {
          this.#handleInput(this.#favoritesSelect.value.trim());
          this.#resetFavoritesSelect();
        });
      }
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

    createUwpToolbar() {
      const uwpToolbar = this.#createEmptyUwpToolbar();
      const input = this.#createInput();
      uwpToolbar.appendChild(input);

      if (this.#isfavoritesEnabled) {
        const favoritesSelect = this.#createFavoritesSelect();
        uwpToolbar.appendChild(favoritesSelect);
      }

      this.#panel.appendChild(uwpToolbar);
    }

    #createEmptyUwpToolbar() {
      const uwpToolbar = document.createElement("div");
      uwpToolbar.className = "uwp-toolbar toolbar-default full-width";
      uwpToolbar.width = "100%";
      uwpToolbar.style.height = TOOLBAR_HEIGHT;
      uwpToolbar.style.width = "100%";
      uwpToolbar.style.marginTop = "2px";
      uwpToolbar.style.display = "flex";
      uwpToolbar.style.gap = "2px";
      return uwpToolbar;
    }

    #createInput() {
      const input = document.createElement("input");
      input.className = "uwp-input";
      input.type = "text";
      input.placeholder = "Paste your link, html or javascript";
      input.style.flex = 3;
      input.style.height = TOOLBAR_HEIGHT;
      input.style.padding = "10px";
      input.style.borderRadius = INPUT_BORDER_RADIUS;
      input.style.outline = "none";
      input.style.borderWidth = "0px";
      return input;
    }

    #createFavoritesSelect() {
      const favoritesSelect = document.createElement("select");
      favoritesSelect.className = "uwp-favorites-select";
      favoritesSelect.style.width = "30px";
      favoritesSelect.style.padding = "0";
      favoritesSelect.style.backgroundColor = "transparent";
      favoritesSelect.style.backgroundImage = "none";
      favoritesSelect.style.borderWidth = "0px";
      favoritesSelect.style.outline = "none";

      // Create a default option
      const defaultOption = document.createElement("option");
      defaultOption.textContent = "🤍";
      defaultOption.selected = true;
      defaultOption.disabled = true;
      defaultOption.style.backgroundColor = "var(--colorBg)";
      defaultOption.setAttribute("value", 0);
      favoritesSelect.appendChild(defaultOption);

      FAVORITES.forEach((favorite) => {
        const option = document.createElement("option");
        option.value = favorite.url;
        option.textContent = favorite.caption;
        option.style.backgroundColor = "var(--colorBg)";
        favoritesSelect.appendChild(option);
      });

      return favoritesSelect;
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
      const selector = `webview[tab_id^="${PANEL_ID}"], webview[vivaldi_view_type^="${PANEL_ID}"`;
      return document.querySelector(selector)?.parentElement?.parentElement;
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
      return this.#panel.querySelector(".uwp-input");
    }

    get #favoritesSelect() {
      return this.#panel.querySelector(".uwp-favorites-select");
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

    get #isfavoritesEnabled() {
      return FAVORITES && FAVORITES.length;
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

    #resetFavoritesSelect() {
      this.#favoritesSelect.value = 0;
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
