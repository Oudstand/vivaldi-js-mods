/**
 * Opens links in a dialog, either by key combinations, holding middle mouse button or context menu
 * Forum link: https://forum.vivaldi.net/topic/92501/open-in-dialog-mod?_=1717490394230
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
        if (!browser) {
            setTimeout(waitDialog, 300);
            return;
        }

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

        // inject detection of click observers
        chrome.webNavigation.onCompleted.addListener((navigationDetails) => {
            const {webview, fromPanel} = getWebviewConfig(navigationDetails);
            webview?.executeScript({code: `(${setUrlClickObserver})(${fromPanel})`});
        });

        // react on demand to open dialog
        chrome.runtime.onMessage.addListener((message) => {
            if (message.url) {
                fromPanel = message.fromPanel;
                dialogTab(message.url, message.fromPanel);
            }
        });
    }, 300);

    /**
     * Finds the correct configuration for showing the dialog
     */
    function getWebviewConfig(navigationDetails) {
        // first dialog from webpanel
        let webview = document.querySelector(`.webpanel-content webview[src*="${navigationDetails.url}"]`);
        if (webview) return {webview, fromPanel: true};

        // first dialog from tab
        webview = document.querySelector(`webview[tab_id="${navigationDetails.tabId}"]`);
        if (webview) return {webview, fromPanel: false};

        // follow up dialog from webpanel
        webview = Array.from(webviews.values()).find(view => view.fromPanel)?.webview;
        if (webview) return {webview, fromPanel: true};

        // follow up dialog from tab
        const lastWebviewId = document.querySelector('.active.visible.webpageview .dialog-container:last-of-type webview')?.id;
        return {webview: webviews.get(lastWebviewId)?.webview, fromPanel: false};
    }

    /**
     * Checks if a link is clicked by middle mouse while pressing Ctrl + Alt, then fires an event with the Url
     */
    function setUrlClickObserver(fromPanel = false) {
        if (this.dialogEventListenerSet) return;

        let timer;
        document.addEventListener('pointerdown', function (event) {
            // Check if the Ctrl key, Shift key, and middle mouse button were pressed
            if (event.ctrlKey && event.altKey && (event.button === 0 || event.button === 1)) {
                callDialog(event);
            } else if (event.button === 1) {
                timer = setTimeout(() => callDialog(event), 500);
            }
        });

        document.addEventListener('pointerup', function (event) {
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
            let childLink = el.querySelector('a[href]:not([href="#"])');
            if (childLink) {
                return childLink;
            }

            while (el) {
                if (el.tagName != null && el.tagName.toLowerCase() === 'a') {
                    return el.getAttribute('href') !== '#' ? el : null;
                }
                el = el.parentNode;
            }

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
            contexts: ['link']
        });
        chrome.contextMenus.create({
            id: 'search-dialog-tab',
            title: '[Dialog Tab] Search for "%s"',
            contexts: ['selection']
        });
        chrome.contextMenus.create({
            id: 'select-search-dialog-tab',
            title: '[Dialog Tab] Search with',
            contexts: ['selection']
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
            if (!createdContextMenuIds.includes(engine.guid)) {
                chrome.contextMenus.create({
                    id: 'select-search-dialog-tab' + engine.guid,
                    parentId: 'select-search-dialog-tab',
                    title: engine.name,
                    contexts: ['selection']
                });
                createdContextMenuIds.push(engine.guid);
            }
        });
    }

    /**
     * updates the search engines and context menu
     */
    async function updateSearchEnginesAndContextMenu() {
        const searchEngines = await vivaldi.searchEngines.getTemplateUrls();
        searchEngineCollection = searchEngines.templateUrls;
        defaultSearchId = searchEngines.defaultSearch;
        privateSearchId = searchEngines.defaultPrivate;

        createContextMenuSelectSearch();
    }

    /**
     * Updates sub-context menu items for select search engine menu item
     */
    function removeContextMenuSelectSearch() {
        searchEngineCollection.forEach(function (engine) {
            if (createdContextMenuIds.includes(engine.guid)) {
                chrome.contextMenus.remove('select-search-dialog-tab' + engine.guid);
                createdContextMenuIds.splice(createdContextMenuIds.indexOf(engine.guid), 1);
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
     * Handle a potential keyboard shortcut (copy from KeyboardMachine)
     * @param {number} id I don't know what this does, but it's an extra argument
     * @param {String} combination written in the form (CTRL+SHIFT+ALT+KEY)
     */
    function keyCombo(id, combination) {
        /** Open Default Search Engine in Dialog and search for selected text */
        const searchForSelectedText = async () => {
            let tabs = await chrome.tabs.query({active: true});
            vivaldi.utilities.getSelectedText(tabs[0].id, (text) => dialogTabSearch(defaultSearchId, text));
        };

        const SHORTCUTS = {
            'Ctrl+Alt+Period': searchForSelectedText,
            'Ctrl+Shift+F': searchForSelectedText,
            Esc: () => removeDialog(Array.from(webviews.keys()).pop())
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
        const data = webviews.get(webviewId);
        if (data) {
            chrome.tabs.query({}, (tabs) => {
                const tab = tabs.find(tab => tab.vivExtData && tab.vivExtData.includes(`${webviewId}tabId`));
                if (tab) chrome.tabs.remove(tab.id);
            });

            data.divContainer.remove();
            chrome.tabs.onRemoved.removeListener(data.tabCloseListener);
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
        const dialogContainer = document.createElement('div'),
            dialogTab = document.createElement('div'),
            webview = document.createElement('webview'),
            webviewId = 'dialog-' + getWebviewId(),
            progressBar = document.createElement('div'),
            optionsContainer = document.createElement('div');

        if (fromPanel === undefined && webviews.size !== 0) {
            fromPanel = Array.from(webviews.values()).pop().fromPanel;
        }

        webviews.set(webviewId, {
            divContainer: dialogContainer,
            webview: webview,
            fromPanel: fromPanel
        });

//        remove dialogs when tab is closed without closing dialogs
        if (!fromPanel) {
            const tabId = Number(document.querySelector('.active.visible.webpageview webview').tab_id),
                clearWebviews = (closedTabId) => {
                    if (tabId === closedTabId) {
                        webviews.forEach((view, key) => view.tabCloseListener === clearWebviews && removeDialog(key));
                        chrome.tabs.onRemoved.removeListener(clearWebviews);
                    }
                };
            webviews.get(webviewId).tabCloseListener = clearWebviews;
            chrome.tabs.onRemoved.addListener(clearWebviews);
        }

        //#region dialogTab properties
        dialogTab.setAttribute('class', 'dialog-tab');
        dialogTab.style.width = 85 - 5 * webviews.size + '%';
        dialogTab.style.height = 95 - 5 * webviews.size + '%';
        //#endregion

        //#region progressBar properties
        progressBar.setAttribute('class', 'progress-bar');
        progressBar.id = 'progressBar-' + webviewId;
        //#endregion

        //#region optionsContainer properties
        optionsContainer.setAttribute('class', 'options-container');
        optionsContainer.innerHTML = getEllipsisContent();

        let timeout;
        optionsContainer.addEventListener('mouseover', function () {
            if (optionsContainer.children.length === 1) {
                optionsContainer.innerHTML = '';
                showWebviewOptions(webviewId, optionsContainer);
            }
            if (timeout) {
                clearTimeout(timeout);
                timeout = undefined;
            }
        });
        optionsContainer.addEventListener('mouseleave', function () {
            if (!timeout) {
                timeout = setTimeout(() => {
                    while (optionsContainer.firstChild) {
                        optionsContainer.removeChild(optionsContainer.firstChild);
                    }
                    optionsContainer.innerHTML = getEllipsisContent();
                }, 1500);
            }
        });
        //#endregion

        //#region webview properties
        webview.id = webviewId;
        webview.tab_id = webviewId + 'tabId';
        webview.setAttribute('src', linkUrl);

        let progress = 0,
            interval;

        const clearProgressInterval = (loadStop) => {
            if (interval) {
                clearInterval(interval);
                interval = undefined;
            }
            if (loadStop) {
                const progressbar = document.getElementById('progressBar-' + webviewId);
                progressbar.style.width = '100%';

                setTimeout(() => {
                    progress = 0;
                    progressbar.style.visibility = 'hidden';
                    progressbar.style.width = progress + '%';
                }, 250);
            }
        };

        webview.addEventListener('loadstart', function () {
            this.style.backgroundColor = 'var(--colorBorder)';
            const progressbar = document.getElementById('progressBar-' + webviewId);
            progressbar.style.visibility = 'visible';

            if (!interval) {
                interval = setInterval(() => {
                    if (progress >= 100) {
                        clearProgressInterval();
                    } else {
                        progress++;
                        progressBar.style.width = progress + '%';
                    }
                }, 10);
            }

            if (document.getElementById('input-' + this.id) !== null) {
                document.getElementById('input-' + this.id).value = this.src;
            }
        });
        webview.addEventListener('loadstop', function () {
            clearProgressInterval(true);
        });
        fromPanel && webview.addEventListener('mousedown', (event) => event.stopPropagation());
        //#endregion

        //#region dialogContainer properties
        dialogContainer.setAttribute('class', 'dialog-container');

        let stopEvent = (event) => {
            event.preventDefault();
            event.stopPropagation();

            if (event.target.id === 'input-' + webviewId) {
                const inputElement = event.target;

                // Calculate the cursor position based on the click location
                const offsetX = event.clientX - inputElement.getBoundingClientRect().left;

                // Create a canvas to measure text width
                const context = document.createElement('canvas').getContext('2d');
                context.font = window.getComputedStyle(inputElement).font;

                // Measure the width of the text up to each character
                let cursorPosition = 0,
                    textWidth = 0;
                for (let i = 0; i < inputElement.value.length; i++) {
                    const charWidth = context.measureText(inputElement.value[i]).width;
                    if (textWidth + charWidth > offsetX) {
                        cursorPosition = i;
                        break;
                    }
                    textWidth += charWidth;
                    cursorPosition = i + 1;
                }

                // Manually focus the input element and set the cursor position
                inputElement.focus({preventScroll: true});
                inputElement.setSelectionRange(cursorPosition, cursorPosition);
            }
        };

        fromPanel && document.body.addEventListener('pointerdown', stopEvent);

        dialogContainer.addEventListener('click', function (event) {
            if (event.target === this) {
                fromPanel && document.body.removeEventListener('pointerdown', stopEvent);
                removeDialog(webviewId);
            }
        });

        //#endregion

        dialogTab.appendChild(optionsContainer);
        dialogTab.appendChild(progressBar);
        dialogTab.appendChild(webview);

        dialogContainer.appendChild(dialogTab);

        // Get for current tab and append divContainer
        fromPanel
            ? document.querySelector('#browser').appendChild(dialogContainer)
            : document.querySelector('.active.visible.webpageview').appendChild(dialogContainer);
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
            const input = document.createElement('input', 'text');

            input.value = webview.src;
            input.id = inputId;
            input.setAttribute('class', 'dialog-input');

            input.addEventListener('keydown', async function (event) {
                if (event.key === 'Enter') {
                    let value = input.value;
                    if (
                        value.startsWith('http://') ||
                        value.startsWith('https://') ||
                        value.startsWith('file://') ||
                        value.startsWith('vivaldi://') ||
                        value === 'about:blank'
                    ) {
                        webview.src = value;
                    } else {
                        const searchRequest = await vivaldi.searchEngines.getSearchRequest(defaultSearchId, value);
                        webview.src = searchRequest.url;
                    }
                }
            });

            let buttonBack = createOptionsButton(getBackButtonContent(), webview.back.bind(webview)),
                buttonForward = createOptionsButton(getForwardButtonContent(), webview.forward.bind(webview)),
                buttonReload = createOptionsButton(getReloadButtonContent(), webview.reload.bind(webview)),
                buttonReaderView = createOptionsButton(getReaderViewButtonContent(), showReaderView.bind(this, webview), 'reader-view-toggle'),
                buttonNewTab = createOptionsButton(getNewTabButtonContent(), openNewTab.bind(this, inputId, true)),
                buttonBackgroundTab = createOptionsButton(getBackgroundTabButtonContent(), openNewTab.bind(this, inputId, false));

            thisElement.append(buttonBack, buttonForward, buttonReload, buttonReaderView, buttonNewTab, buttonBackgroundTab, input);
        }
    }

    /**
     * Create a button with default style for the web view options.
     * @param {Node | string} content the content of the button to display
     * @param {Function} clickListenerCallback the click listeners callback function
     * @param {string} cls optional additional class for the button
     */
    function createOptionsButton(content, clickListenerCallback, cls = '') {
        const button = document.createElement('button');
        button.setAttribute('class', `options-button ${cls}`);

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
        while (document.getElementById('dialog-' + tempId)) {
            tempId = Math.floor(Math.random() * 1000 + 1);
        }
        return tempId;
    }

    /**
     * Sets the webviews content to a reader version
     *
     * @param {webview} webview the webview to update
     */
    function showReaderView(webview) {
        if (webview.src.includes('https://clearthis.page/?u=')) {
            webview.src = webview.src.replace('https://clearthis.page/?u=', '');
        } else {
            webview.src = 'https://clearthis.page/?u=' + webview.src;
        }
    }

    /**
     * Opens a new Chrome tab with specified active boolean value
     * @param {string} inputId is the id of the input containing current url
     * @param {boolean} active indicates whether the tab is active or not (background tab)
     */
    function openNewTab(inputId, active) {
        const url = document.getElementById(inputId).value;
        chrome.tabs.create({url: url, active: active});
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
        const svg = document.querySelector('.button-toolbar [name="Back"] svg');
        return svg
            ? svg.cloneNode(true)
            : '<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 448 512"><path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/></svg>';
    }

    /**
     * Gets the svg icon for the forward button
     */
    function getForwardButtonContent() {
        const svg = document.querySelector('.button-toolbar [name="Forward"] svg');
        return svg
            ? svg.cloneNode(true)
            : '<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 448 512"><path d="M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z"/></svg>';
    }

    /**
     * Gets the svg icon for the reload button
     */
    function getReloadButtonContent() {
        const svg = document.querySelector('.button-toolbar [name="Reload"] svg');
        return svg
            ? svg.cloneNode(true)
            : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M125.7 160H176c17.7 0 32 14.3 32 32s-14.3 32-32 32H48c-17.7 0-32-14.3-32-32V64c0-17.7 14.3-32 32-32s32 14.3 32 32v51.2L97.6 97.6c87.5-87.5 229.3-87.5 316.8 0s87.5 229.3 0 316.8s-229.3 87.5-316.8 0c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0c62.5 62.5 163.8 62.5 226.3 0s62.5-163.8 0-226.3s-163.8-62.5-226.3 0L125.7 160z"/></svg>';
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
