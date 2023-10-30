(function() {
  let searchEngineCollection, defaultSearchId, privateSearchId, webviews = new Map();

  // Wait for the browser to come to a ready state
  setTimeout(function waitDialog() {
    const browser = document.getElementById("browser");
    if (browser) {
      vivaldi.searchEngines.getTemplateUrls().then((searchEnignes) => {
        searchEngineCollection = searchEnignes.templateUrls;
        defaultSearchId = searchEnignes.defaultSearch;
        privateSearchId = searchEnignes.defaultPrivate;

        // Create a context menu item to call on a link
        createContextMenuOption();
        // Setup keyboard shortcuts
        vivaldi.tabsPrivate.onKeyboardShortcut.addListener(keyCombo);
      });

      chrome.runtime.onMessage.addListener((message) => {
        if (message.url) {
          dialogTab(message.url);
        }
      });
      chrome.tabs.onUpdated.addListener((tabId, data) => {
        if (data.status === "complete") {
          chrome.scripting.executeScript({
            target: {
              tabId: tabId
            },
            func: setUrlClickObserver,
            args: [tabId],
          });
        }
      });

      /* chrome.storage.local.get({
                'SEARCH_ENGINE_COLLECTION': {
                    engines: []
                }
            }, function (res) {
                searchEngineCollection = res.SEARCH_ENGINE_COLLECTION;

                // Create a context menu item to call on a link
                createContextMenuOption();
                // Setup keyboard shortcuts
                vivaldi.tabsPrivate.onKeyboardShortcut.addListener(keyCombo);
            }); 

            chrome.storage.local.onChanged.addListener(function (changes, namespace) {
                if (changes.SEARCH_ENGINE_COLLECTION) {
                    searchEngineCollection = changes.SEARCH_ENGINE_COLLECTION.newValue;
                    createOrRemoveContextMenuSelectSearch(changes.SEARCH_ENGINE_COLLECTION.oldValue)
                }
            });*/
    } else {
      setTimeout(waitDialog, 300);
    }
  }, 300);

  /**
   * Checks if a link is clicked by middle mouse while pressing Ctrl + Alt, then fires an event with the Url
   */
  function setUrlClickObserver() {
    if (this.dialogEventListenerSet) return;

    document.addEventListener("mousedown", function(event) {
      // Check if the Ctrl key, Shift key, and middle mouse button were pressed
      if (event.buttons === 6 || (event.ctrlKey && event.altKey && (event.button === 0 || event.button === 1))) {
        let link = getLinkElement(event.target);
        if (link) {
          event.preventDefault();
          chrome.runtime.sendMessage({
            url: link.href
          });
        }
      }
    });

    this.dialogEventListenerSet = true;

    const getLinkElement = (el) => {
      do {
        if (el.tagName != null && el.tagName.toLowerCase() === "a") {
          if (el.getAttribute("href") == "#") return null;
          return el;
        }
      } while ((el = el.parentNode));

      return null;
    };
  }

  /**
   * Creates context menu items to open dialog tab
   */
  function createContextMenuOption() {
    chrome.contextMenus.create({
      id: "dialog-tab-link",
      title: "[Dialog Tab] Open Link",
      contexts: ["link"],
    });
    chrome.contextMenus.create({
      id: "search-dialog-tab",
      title: '[Dialog Tab] Search for "%s"',
      contexts: ["selection"],
    });
    chrome.contextMenus.create({
      id: "select-search-dialog-tab",
      title: "[Dialog Tab] Search with",
      contexts: ["selection"],
    });

    createContextMenuSelectSearch();

    chrome.contextMenus.onClicked.addListener(function(itemInfo) {
      chrome.windows.getLastFocused(function(window) {
        if (window.id === vivaldiWindowId && window.state !== "minimized") {
          if (itemInfo.menuItemId === "dialog-tab-link") {
            dialogTab(itemInfo.linkUrl);
          } else if (itemInfo.menuItemId === "search-dialog-tab") {
            var engineId = window.incognito ? privateSearchId : defaultSearchId;
            dialogTabSearch(engineId, itemInfo.selectionText);
          } else if (itemInfo.parentMenuItemId === "select-search-dialog-tab") {
            var engineId = itemInfo.menuItemId.substr(
              itemInfo.parentMenuItemId.length
            );
            dialogTabSearch(engineId, itemInfo.selectionText);
          }
        }
      });
    });
  }

  /**
   * Creates sub-context menu items for select search engine menu item
   */
  function createContextMenuSelectSearch() {
    searchEngineCollection
      .filter((e) => e.removed !== true)
      .forEach(function(engine) {
        chrome.contextMenus.create({
          id: "select-search-dialog-tab" + engine.id,
          parentId: "select-search-dialog-tab",
          title: engine.name,
          contexts: ["selection"],
        });
      });
  }

  /**
   * Updates sub-context menu items for select search engine menu item
   * @param {Object} oldValue the value that is used as reference to old sub-menu items
   */
  function createOrRemoveContextMenuSelectSearch(oldValue) {
    oldValue.engines
      .filter((e) => e.removed !== true)
      .forEach(function(engine) {
        chrome.contextMenus.remove("select-search-dialog-tab" + engine.id);
      });
    createContextMenuSelectSearch();
  }

  /**
   * Prepares url for search, calls dailogTab function
   * @param {String} engineId engine id of the engine to be used
   * @param {int} selectionText the text to search
   */
  function dialogTabSearch(engineId, selectionText) {
    dialogTab(getEngine(engineId).url.replace(/%s/g, selectionText));
  }

  /**
   * Returns engine from the collection variable with matching id
   * @param {int} engineId engine id of the required engine
   */
  function getEngine(engineId) {
    return searchEngineCollection.find(function(engine) {
      return engine.id === engineId;
    });
  }

  /**
   * Handle a potential keyboard shortcut (copy from KeyboardMachine)
   * @param {number} some id, but I don't know what this does, but it's an extra argument
   * @param {String} combination written in the form (CTRL+SHIFT+ALT+KEY)
   */
  function keyCombo(id, combination) {
    const SHORTCUTS = {
      "Ctrl+Alt+Period": () => {
        // Open Default Search Engine in Dialog
        chrome.tabs
          .query({
            active: true
          })
          .then((tabs) =>
            vivaldi.utilities.getSelectedText(tabs[0].id, (text) =>
              dialogTabSearch(defaultSearchId, text)
            )
          );
      },
      Esc: () => removeDialog(webviews.keys().toArray().pop()),
    };

    const customShortcut = SHORTCUTS[combination];
    if (customShortcut) {
      customShortcut();
    }
  }

  /**
   * removes the dialog
   */
  function removeDialog(webviewId) {
    let data = webviews.get(webviewId);
    if (data) {
      data.divContainer.remove();
      webviews.delete(webviewId);
    }
  }

  /**
   * Opens a link in a dialog like display in the current visible tab
   * @param {string} linkUrl the url to load
   */
  function dialogTab(linkUrl) {
    let divContainer = document.createElement("div"),
      webview = document.createElement("webview"),
      webviewId = "dialog-" + getWebviewId(),
      divOptionContainer = document.createElement("div"),
      progressBarContainer = document.createElement("div"),
      progressBar = document.createElement("div");


    webviews.set(webviewId, {
      divContainer: divContainer,
      webview: webview
    });

    //#region webview properties
    webview.setAttribute("src", linkUrl);
    webview.id = webviewId;
    webview.style.width = "80%";
    webview.style.height = "85%";
    webview.style.margin = "auto";
    webview.style.overflow = "hidden";
    webview.style.borderRadius = "10px";

    webview.addEventListener("loadstart", function() {
      this.style.backgroundColor = "var(--colorBorder)";
      document.getElementById("progressBar-" + webviewId).style.display =
        "block";

      if (document.getElementById("input-" + this.id) !== null) {
        document.getElementById("input-" + this.id).value = this.src;
      }
    });
    webview.addEventListener("loadstop", function() {
      document.getElementById("progressBar-" + webviewId).style.display =
        "none";
    });
    //#endregion

    //#region divOptionContainer properties
    divOptionContainer.style.height = "4%";
    divOptionContainer.style.width = "75%";
    divOptionContainer.style.textAlign = "center";
    divOptionContainer.style.margin = "auto";
    divOptionContainer.style.color = "white";
    divOptionContainer.style.zIndex = "1160";
    divOptionContainer.innerHTML = getEllipsisContent();

    let timeout;
    divOptionContainer.addEventListener("mouseover", function() {
      if (divOptionContainer.children.length === 1) {
        divOptionContainer.innerHTML = "";
        showWebviewOptions(webviewId, divOptionContainer);
      }
      if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }
    });
    divOptionContainer.addEventListener("mouseleave", function() {
      if (!timeout) {
        timeout = setTimeout(() => {
          while (divOptionContainer.firstChild) {
            divOptionContainer.removeChild(divOptionContainer.firstChild);
          }
          divOptionContainer.innerHTML = getEllipsisContent();
        }, 1500);
      }
    });
    //#endregion

    //#region divContainer properties
    divContainer.setAttribute("class", "dialog-tab");
    divContainer.style.zIndex = "1060";
    divContainer.style.position = "fixed";
    divContainer.style.top = "0";
    divContainer.style.right = "0";
    divContainer.style.bottom = "0";
    divContainer.style.left = "0";
    divContainer.style.backgroundColor = "rgba(0,0,0,.4)";
    divContainer.style.transitionProperty = "background-color";
    divContainer.style.transitionDuration = "0.1s";
    divContainer.style.transitionTimingFunction = "ease";
    divContainer.style.transitionDelay = "0s";
    divContainer.style.backdropFilter = "blur(1px)";

    divContainer.addEventListener("click", function(event) {
      if (event.target === this) {
        removeDialog(webviewId);
      }
    });
    //#endregion

    //#region progressBarContainer properties
    progressBarContainer.style.width = "77%";
    progressBarContainer.style.margin = "1.3rem auto auto";

    progressBar.id = "progressBar-" + webviewId;
    progressBar.style.height = "5px";
    progressBar.style.width = "10%";
    progressBar.style.backgroundColor = "#0080ff";
    progressBar.style.borderRadius = "5px";
    //#endregion

    progressBarContainer.appendChild(progressBar);
    divContainer.appendChild(divOptionContainer);
    divContainer.appendChild(webview);
    divContainer.appendChild(progressBarContainer);

    // Get for current tab and append divContainer
    document
      .getElementsByClassName("active visible webpageview")[0]
      .appendChild(divContainer);
  }

  /**
   * Displays open in tab buttons and current url in input element
   * @param {string} webviewId is the id of the webview
   * @param {Object} thisElement the current instance divOptionContainer (div) element
   */
  function showWebviewOptions(webviewId, thisElement) {
    let inputId = "input-" + webviewId,
      data = webviews.get(webviewId),
      webview = data ? data.webview : undefined;
    console.log(document.getElementById(inputId) === null, webviewId);
    if (webview && document.getElementById(inputId) === null) {
      let webviewSrc = webview.src,
        input = document.createElement("input", "text"),
        buttonBack = createOptionsButton(),
        buttonForward = createOptionsButton(),
        buttonNewTab = createOptionsButton(),
        buttonBackgroundTab = createOptionsButton();

      input.value = webviewSrc;
      input.id = inputId;
      input.setAttribute("readonly", "");
      input.style.background = "transparent";
      input.style.color = "white";
      input.style.border = "unset";
      input.style.width = "20%";
      input.style.margin = "0 0.5rem 0 0.5rem";

      buttonBack.innerHTML = getBackButtonContent();
      buttonBack.addEventListener("click", function(event) {
        if (event.target === this || this.firstChild) {
          webview.back();
        }
      });

      buttonForward.innerHTML = getForwardButtonContent();
      buttonForward.addEventListener("click", function(event) {
        if (event.target === this || this.firstChild) {
          webview.forward();
        }
      });

      buttonNewTab.innerHTML = getNewtabContent();
      buttonNewTab.addEventListener("click", function(event) {
        if (event.target === this || this.firstChild) {
          openNewTab(inputId, true);
        }
      });

      buttonBackgroundTab.innerHTML = getBacktabContent();
      buttonBackgroundTab.addEventListener("click", function(event) {
        if (event.target === this || this.firstChild) {
          openNewTab(inputId, false);
        }
      });

      thisElement.appendChild(buttonBack);
      thisElement.appendChild(buttonForward);
      thisElement.appendChild(buttonNewTab);
      thisElement.appendChild(buttonBackgroundTab);
      thisElement.appendChild(input);

      console.log(webviewSrc, thisElement);
    }
  }

  /**
   * Create a button with default style for the web view options.
   */
  function createOptionsButton() {
    var button = document.createElement("button");

    button.style.background = "transparent";
    button.style.margin = "0 0.5rem 0 0.5rem";
    button.style.border = "unset";

    return button;
  }

  /**
   * Returns a random, verified id.
   */
  function getWebviewId() {
    var tempId = 0;
    while (true) {
      if (document.getElementById("dialog-" + tempId) === null) {
        break;
      }
      tempId = Math.floor(Math.random() * 1000 + 1);
    }
    return tempId;
  }

  /**
   * Opens a new chrome tab with specified active boolean value
   * @param {string} inputId is the id of the input containing current url
   * @param {boolean} active indicates whether the tab is active or not (background tab)
   */
  function openNewTab(inputId, active) {
    var url = document.getElementById(inputId).value;

    chrome.tabs.create({
      url: url,
      active: active,
    });
  }

  /**
   * Returns string of ellipsis svg icon
   */
  function getEllipsisContent() {
    return '<svg id="optionsIco" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="ellipsis-h" class="svg-inline--fa fa-ellipsis-h fa-w-16" style="width: 25px;     vertical-align: middle; margin: 0 0.5rem;" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M328 256c0 39.8-32.2 72-72 72s-72-32.2-72-72 32.2-72 72-72 72 32.2 72 72zm104-72c-39.8 0-72 32.2-72 72s32.2 72 72 72 72-32.2 72-72-32.2-72-72-72zm-352 0c-39.8 0-72 32.2-72 72s32.2 72 72 72 72-32.2 72-72-32.2-72-72-72z"></path></svg>';
  }

  /**
   * Returns string of back button svg icon
   */
  function getBackButtonContent() {
    return '<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="arrow-left" class="svg-inline--fa fa-arrow-left fa-w-18" style="width: 25px;" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="currentColor" d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"></path></svg>';
  }

  /**
   * Returns string of forward button svg icon
   */
  function getForwardButtonContent() {
    return '<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="arrow-right" class="svg-inline--fa fa-arrow-right fa-w-18" style="width: 25px;" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="currentColor" d="M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z"></path></svg>';
  }

  /**
   *  Returns string of external link alt svg icon
   */
  function getNewtabContent() {
    return '<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="external-link-alt" class="svg-inline--fa fa-external-link-alt fa-w-18" style="width: 25px;" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="currentColor" d="M576 24v127.984c0 21.461-25.96 31.98-40.971 16.971l-35.707-35.709-243.523 243.523c-9.373 9.373-24.568 9.373-33.941 0l-22.627-22.627c-9.373-9.373-9.373-24.569 0-33.941L442.756 76.676l-35.703-35.705C391.982 25.9 402.656 0 424.024 0H552c13.255 0 24 10.745 24 24zM407.029 270.794l-16 16A23.999 23.999 0 0 0 384 303.765V448H64V128h264a24.003 24.003 0 0 0 16.97-7.029l16-16C376.089 89.851 365.381 64 344 64H48C21.49 64 0 85.49 0 112v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V287.764c0-21.382-25.852-32.09-40.971-16.97z"></path></svg>';
  }

  /**
   * Returns string of external link square alt svg icon
   */
  function getBacktabContent() {
    return '<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="external-link-square-alt" class="svg-inline--fa fa-external-link-square-alt fa-w-14" style="width: 21px;" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M448 80v352c0 26.51-21.49 48-48 48H48c-26.51 0-48-21.49-48-48V80c0-26.51 21.49-48 48-48h352c26.51 0 48 21.49 48 48zm-88 16H248.029c-21.313 0-32.08 25.861-16.971 40.971l31.984 31.987L67.515 364.485c-4.686 4.686-4.686 12.284 0 16.971l31.029 31.029c4.687 4.686 12.285 4.686 16.971 0l195.526-195.526 31.988 31.991C358.058 263.977 384 253.425 384 231.979V120c0-13.255-10.745-24-24-24z"></path></svg>';
  }
})();