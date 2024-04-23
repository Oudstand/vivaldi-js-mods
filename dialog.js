/**
 * Inspired by @biruktes and @tam710562
 * Forum links:
 *  https://forum.vivaldi.net/topic/29845/web-page-preview
 *  https://forum.vivaldi.net/topic/38084/open-link-or-new-tab-in-a-dialog-mod
 */
(function () {
    let searchEngineCollection,
        defaultSearchId,
        privateSearchId,
        createdContextMenuIds = [],
        webviews = new Map(),
        fromPanel;

    // Wait for the browser to come to a ready state
    setTimeout(function waitDialog() {
        const browser = document.getElementById('browser');
        if (browser) {
            // Create a context menu item to call on a link
            createContextMenuOption();

            // create initial search engine context menus
            updateSearchEnginesAndContextMenu();

            // detect changes in search engines and recreate the context menus
            vivaldi.searchEngines.onTemplateUrlsChanged.addListener(() => {
                removeContextMenuSelectSearch();
                updateSearchEnginesAndContextMenu();
            });

            // Setup keyboard shortcuts
            vivaldi.tabsPrivate.onKeyboardShortcut.addListener(keyCombo);

            chrome.runtime.onMessage.addListener((message) => {
                if (message.url) {
                    fromPanel = message.fromPanel;
                    dialogTab(message.url, message.fromPanel);
                }
            });

            chrome.webNavigation.onCompleted.addListener((details) => {
                let fromPanel = false,
                    webview;

                if (details.tabId < 0) {
                    let view = Array.from(webviews.values()).pop();
                    webview = view?.webview;
                    fromPanel = view?.fromPanel;
                } else {
                    webview = document.querySelector(`.webpanel-content webview[src*="${details.url}"]`);
                    if (webview) fromPanel = true;
                    else webview = document.querySelector(`webview[tab_id="${details.tabId}"]`);
                }

                webview?.executeScript({code: `(${setUrlClickObserver})(${fromPanel})`});
            });

        } else {
            setTimeout(waitDialog, 300);
        }
    }, 300);

    /**
     * Checks if a link is clicked by middle mouse while pressing Ctrl + Alt, then fires an event with the Url
     */
    function setUrlClickObserver(fromPanel = false) {
        if (this.dialogEventListenerSet) return;

        let timer;
        document.addEventListener('mousedown', function (event) {
            // Check if the Ctrl key, Shift key, and middle mouse button were pressed
            if (event.ctrlKey && event.altKey && (event.button === 0 || event.button === 1)) {
                callDialog(event);
            } else if (event.button === 1) {
                timer = setTimeout(() => callDialog(event), 500);
            }
        });

        document.addEventListener('mouseup', function (event) {
            if (event.button === 1) {
                clearTimeout(timer);
            }
        });

        this.dialogEventListenerSet = true;

        let callDialog = (event) => {
            let link = getLinkElement(event.target);
            if (link) {
                event.preventDefault();
                chrome.runtime.sendMessage({url: link.href, fromPanel: fromPanel});
            }
        };

        let getLinkElement = (el) => {
            do {
                if (el.tagName != null && el.tagName.toLowerCase() === 'a') {
                    if (el.getAttribute('href') === '#') return null;
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
            id: 'dialog-tab-link',
            title: '[Dialog Tab] Open Link',
            contexts: ['link'],
        });
        chrome.contextMenus.create({
            id: 'search-dialog-tab',
            title: '[Dialog Tab] Search for "%s"',
            contexts: ['selection'],
        });
        chrome.contextMenus.create({
            id: 'select-search-dialog-tab',
            title: '[Dialog Tab] Search with',
            contexts: ['selection'],
        });

        chrome.contextMenus.onClicked.addListener(function (itemInfo) {
            if (itemInfo.menuItemId === 'dialog-tab-link') {
                dialogTab(itemInfo.linkUrl);
            } else if (itemInfo.menuItemId === 'search-dialog-tab') {
                let engineId = window.incognito ? privateSearchId : defaultSearchId;
                dialogTabSearch(engineId, itemInfo.selectionText);
            } else if (itemInfo.parentMenuItemId === 'select-search-dialog-tab') {
                let engineId = itemInfo.menuItemId.substr(itemInfo.parentMenuItemId.length);
                dialogTabSearch(engineId, itemInfo.selectionText);
            }
        });
    }

    /**
     * Creates sub-context menu items for select search engine menu item
     */
    function createContextMenuSelectSearch() {
        searchEngineCollection.forEach(function (engine) {
            if (!createdContextMenuIds.includes(engine.id)) {
                chrome.contextMenus.create({
                    id: 'select-search-dialog-tab' + engine.id,
                    parentId: 'select-search-dialog-tab',
                    title: engine.name,
                    contexts: ['selection'],
                });
                createdContextMenuIds.push(engine.id);
            }
        });
    }

    /**
     * updates the search engines and context menu
     */
    function updateSearchEnginesAndContextMenu() {
        vivaldi.searchEngines.getTemplateUrls().then((searchEnignes) => {
            searchEngineCollection = searchEnignes.templateUrls;
            defaultSearchId = searchEnignes.defaultSearch;
            privateSearchId = searchEnignes.defaultPrivate;

            createContextMenuSelectSearch();
        });
    }

    /**
     * Updates sub-context menu items for select search engine menu item
     * @param {Object} oldValue the value that is used as reference to old sub-menu items
     */
    function removeContextMenuSelectSearch() {
        searchEngineCollection.forEach(function (engine) {
            if (createdContextMenuIds.includes(engine.id)) {
                chrome.contextMenus.remove('select-search-dialog-tab' + engine.id);
                createdContextMenuIds.splice(createdContextMenuIds.indexOf(engine.id), 1);
            }
        });
    }

    /**
     * Prepares url for search, calls dailogTab function
     * @param {String} engineId engine id of the engine to be used
     * @param {int} selectionText the text to search
     */
    async function dialogTabSearch(engineId, selectionText) {
        let searchRequest = await vivaldi.searchEngines.getSearchRequest(engineId, selectionText);
        dialogTab(searchRequest.url);
    }

    /**
     * Returns engine from the collection variable with matching id
     * @param {int} engineId engine id of the required engine
     */
    function getEngine(engineId) {
        return searchEngineCollection.find(function (engine) {
            return engine.id === engineId;
        });
    }

    /**
     * Handle a potential keyboard shortcut (copy from KeyboardMachine)
     * @param {number} some id, but I don't know what this does, but it's an extra argument
     * @param {String} combination written in the form (CTRL+SHIFT+ALT+KEY)
     */
    function keyCombo(id, combination) {
        /** Open Default Search Engine in Dialog and search for selected text */
        const searchForSelectedText = async () => {
            let tabs = await chrome.tabs.query({active: true})
            vivaldi.utilities.getSelectedText(tabs[0].id, (text) =>
                dialogTabSearch(defaultSearchId, text)
            );
        }

        const SHORTCUTS = {
            'Ctrl+Alt+Period': searchForSelectedText,
            'Ctrl+Shift+F': searchForSelectedText,
            'Esc': () => removeDialog(Array.from(webviews.keys()).pop())
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
     * Checks if the current window is the correct window to show the dialog and then opens the dialog
     * @param {string} linkUrl the url to load
     * @param {boolean} fromPanel indicates whether the dialog is opened from a panel
     */
    function dialogTab(linkUrl, fromPanel = undefined) {
        chrome.windows.getLastFocused(function (window) {
            if (window.id === vivaldiWindowId && window.state !== chrome.windows.WindowState.MINIMIZED) {
                showDialog(linkUrl, fromPanel);
            }
        });
    }

    /**
     * Opens a link in a dialog like display in the current visible tab
     * @param {string} linkUrl the url to load
     * @param {boolean} fromPanel indicates whether the dialog is opened from a panel
     */
    function showDialog(linkUrl, fromPanel) {
        let divContainer = document.createElement('div'),
            webview = document.createElement('webview'),
            webviewId = 'dialog-' + getWebviewId(),
            divOptionContainer = document.createElement('div'),
            progressBarContainer = document.createElement('div'),
            progressBar = document.createElement('div');

        if (fromPanel === undefined && webviews.size !== 0) {
            fromPanel = Array.from(webviews.values()).pop().fromPanel;
        }

        webviews.set(webviewId, {
            divContainer: divContainer,
            webview: webview,
            fromPanel: fromPanel
        });

        //#region webview properties
        webview.setAttribute('src', linkUrl);
        webview.id = webviewId;
        webview.style.width = 85 - 5 * webviews.size + '%';
        webview.style.height = 90 - 5 * webviews.size + '%';
        webview.style.margin = 'auto';
        webview.style.overflow = 'hidden';
        webview.style.borderRadius = '10px';

        webview.addEventListener('loadstart', function () {
            this.style.backgroundColor = 'var(--colorBorder)';
            document.getElementById('progressBar-' + webviewId).style.display = 'block';

            if (document.getElementById('input-' + this.id) !== null) {
                document.getElementById('input-' + this.id).value = this.src;
            }
        });
        webview.addEventListener('loadstop', function () {
            document.getElementById('progressBar-' + webviewId).style.display = 'none';
        });
        fromPanel && webview.addEventListener('mousedown', event => event.stopPropagation());
        //#endregion

        //#region divOptionContainer properties
        divOptionContainer.style.position = 'fixed';
        divOptionContainer.style.width = '100%';
        divOptionContainer.style.textAlign = 'center';
        divOptionContainer.style.alignItems = 'center';
        divOptionContainer.style.top = (100 - (90 - 5 * webviews.size)) / 2 - 4 + '%';
        divOptionContainer.style.color = 'white';
        divOptionContainer.style.zIndex = '1160';
        divOptionContainer.innerHTML = getEllipsisContent();

        let timeout;
        divOptionContainer.addEventListener('mouseover', function () {
            if (divOptionContainer.children.length === 1) {
                divOptionContainer.innerHTML = '';
                showWebviewOptions(webviewId, divOptionContainer);
            }
            if (timeout) {
                clearTimeout(timeout);
                timeout = undefined;
            }
        });
        divOptionContainer.addEventListener('mouseleave', function () {
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
        divContainer.setAttribute('class', 'dialog-tab');
        divContainer.style.zIndex = '1060';
        divContainer.style.position = 'fixed';
        divContainer.style.top = '0';
        divContainer.style.right = '0';
        divContainer.style.bottom = '0';
        divContainer.style.left = '0';
        divContainer.style.backgroundColor = 'rgba(0,0,0,.4)';
        divContainer.style.transitionProperty = 'background-color';
        divContainer.style.transitionDuration = '0.1s';
        divContainer.style.transitionTimingFunction = 'ease';
        divContainer.style.transitionDelay = '0s';
        divContainer.style.backdropFilter = 'blur(1px)';

        let stopEvent = event => {
            event.preventDefault();
            event.stopPropagation();
        };

        fromPanel && document.body.addEventListener('pointerdown', stopEvent);

        divContainer.addEventListener('click', function (event) {
            if (event.target === this) {
                fromPanel && document.body.removeEventListener('pointerdown', stopEvent);
                removeDialog(webviewId);
            }
        });

        //#endregion

        //#region progressBarContainer properties
        progressBarContainer.style.width = '77%';
        progressBarContainer.style.margin = '1.3rem auto auto';

        progressBar.id = 'progressBar-' + webviewId;
        progressBar.style.height = '5px';
        progressBar.style.width = '10%';
        progressBar.style.backgroundColor = '#0080ff';
        progressBar.style.borderRadius = '5px';
        //#endregion

        progressBarContainer.appendChild(progressBar);
        divContainer.appendChild(divOptionContainer);
        divContainer.appendChild(webview);
        divContainer.appendChild(progressBarContainer);

        // Get for current tab and append divContainer
        fromPanel ? document.body.appendChild(divContainer) : document.querySelector('.active.visible.webpageview').appendChild(divContainer);
    }

    /**
     * Displays open in tab buttons and current url in input element
     * @param {string} webviewId is the id of the webview
     * @param {Object} thisElement the current instance divOptionContainer (div) element
     */
    function showWebviewOptions(webviewId, thisElement) {
        let inputId = 'input-' + webviewId,
            data = webviews.get(webviewId),
            webview = data ? data.webview : undefined;
        if (webview && document.getElementById(inputId) === null) {
            let webviewSrc = webview.src,
                input = document.createElement('input', 'text');

            input.value = webviewSrc;
            input.id = inputId;
            input.style.background = 'var(--colorAccentBgAlpha)' // 'transparent';
            input.style.color = 'white';
            input.style.border = 'unset';
            input.style.width = '20%';
            input.style.margin = '0 0.5rem 0 0.5rem';
            input.style.padding = '0.25rem 0.5rem';
            input.addEventListener("keydown", function (event) {
                if (event.key === "Enter") {
                    let value = input.value;
                    if (value.startsWith("http://") ||
                        value.startsWith("https://") ||
                        value.startsWith("file://") ||
                        value.startsWith("vivaldi://") ||
                        value === "about:blank"
                    ) {
                        webview.src = value;
                    } else {
                        vivaldi.searchEngines.getSearchRequest(defaultSearchId, value).then(function (searchRequest) {
                            webview.src = searchRequest.url;
                        });
                    }
                }
            });

            let buttonBack = createOptionsButton(getBackButtonContent(), webview.back.bind(webview)),
                buttonForward = createOptionsButton(getForwardButtonContent(), webview.forward.bind(webview)),
                buttonReaderView = createOptionsButton(getReaderViewButtonContent(), showReaderView.bind(this, webview)),
                buttonNewTab = createOptionsButton(getNewTabButtonContent(), openNewTab.bind(this, inputId, true)),
                buttonBackgroundTab = createOptionsButton(getBackgroundTabButtonContent(), openNewTab.bind(this, inputId, false));

            thisElement.append(buttonBack, buttonForward, buttonReaderView, buttonNewTab, buttonBackgroundTab, input);
        }
    }

    /**
     * Create a button with default style for the web view options.
     * @param {Node | string} content the content of the button to display
     * @param {Function} clickListenerCallback the click listeners callback function
     */
    function createOptionsButton(content, clickListenerCallback) {
        let button = document.createElement('button');

        button.style.background = 'transparent';
        button.style.margin = '0 0.5rem 0 0.5rem';
        button.style.border = 'unset';
        button.style.cursor = 'pointer';

        if (typeof content === 'string') {
            button.innerHTML = content;
        } else {
            button.appendChild(content);
        }

        button.addEventListener('click', function (event) {
            if (event.target === this || this.firstChild) {
                clickListenerCallback();
            }
        });

        return button;
    }

    /**
     * Returns a random, verified id.
     */
    function getWebviewId() {
        let tempId = 0;
        while (true) {
            if (document.getElementById('dialog-' + tempId) === null) {
                break;
            }
            tempId = Math.floor(Math.random() * 1000 + 1);
        }
        return tempId;
    }

    /**
     * Sets the webviews content to a reader version
     *
     * @param {Webview} webview the webview to update 
     */
    function showReaderView(webview) {
        if (webview.src.includes('https://reader-next.pages.dev/?url=')) {
            webview.src = webview.src.replace('https://reader-next.pages.dev/?url=', '');
        } else {
            webview.src = 'https://reader-next.pages.dev?url=' + webview.src;

            const injectCSS = () => {
                const script = `

                    var style = document.createElement('style');
                    style.textContent = \`
                        body {
                            max-width: 100ch;
                        }
                        body > *:not(#output):not(#title) {
                            display: none;
                        }
                    \`;
                    document.head.appendChild(style);
                `;

                webview.executeScript({code: script});
                webview.removeEventListener('loadstop', injectCSS);
            }

            webview.addEventListener('loadstop', injectCSS);
        }
    }

    /**
     * Opens a new Chrome tab with specified active boolean value
     * @param {string} inputId is the id of the input containing current url
     * @param {boolean} active indicates whether the tab is active or not (background tab)
     */
    function openNewTab(inputId, active) {
        let url = document.getElementById(inputId).value;

        chrome.tabs.create({url: url, active: active})
    }

    /**
     * Returns string of ellipsis svg icon
     */
    function getEllipsisContent() {
        return '<svg xmlns="http://www.w3.org/2000/svg" height="2em" viewBox="0 0 448 512"><path d="M8 256a56 56 0 1 1 112 0A56 56 0 1 1 8 256zm160 0a56 56 0 1 1 112 0 56 56 0 1 1 -112 0zm216-56a56 56 0 1 1 0 112 56 56 0 1 1 0-112z"/></svg>';
    }

    /**
     * Gets the svg icon for the back button
     */
    function getBackButtonContent() {
        let svg = document.querySelector('.button-toolbar [name="Back"] svg');
        return svg ? svg.cloneNode(true) : '<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 448 512"><path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/></svg>';
    }

    /**
     * Gets the svg icon for the forward button
     */
    function getForwardButtonContent() {
        let svg = document.querySelector('.button-toolbar [name="Forward"] svg');
        return svg ? svg.cloneNode(true) : '<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 448 512"><path d="M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z"/></svg>';
    }

    /**
     * Gets the svg icon for the reader view button
     */
    function getReaderViewButtonContent() {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M3 4h10v1H3zM3 6h10v1H3zM3 8h10v1H3zM3 10h6v1H3z"></path></svg>';
    }

    /**
     *  Returns string of external link alt svg icon
     */
    function getNewTabButtonContent() {
        return '<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512"><path d="M320 0c-17.7 0-32 14.3-32 32s14.3 32 32 32h82.7L201.4 265.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L448 109.3V192c0 17.7 14.3 32 32 32s32-14.3 32-32V32c0-17.7-14.3-32-32-32H320zM80 32C35.8 32 0 67.8 0 112V432c0 44.2 35.8 80 80 80H400c44.2 0 80-35.8 80-80V320c0-17.7-14.3-32-32-32s-32 14.3-32 32V432c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V112c0-8.8 7.2-16 16-16H192c17.7 0 32-14.3 32-32s-14.3-32-32-32H80z"/></svg>';
    }

    /**
     * Returns string of external link square alt svg icon
     */
    function getBackgroundTabButtonContent() {
        return '<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 448 512"><path d="M384 32c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96C0 60.7 28.7 32 64 32H384zM160 144c-13.3 0-24 10.7-24 24s10.7 24 24 24h94.1L119 327c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l135-135V328c0 13.3 10.7 24 24 24s24-10.7 24-24V168c0-13.3-10.7-24-24-24H160z"/></svg>';
    }
})();