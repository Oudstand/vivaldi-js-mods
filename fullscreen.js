/**
 * Forum link: https://forum.vivaldi.net/topic/92477/some-javascript-to-automatically-hide-tab-bar-and-address-bar-and-show-them-by-hovering
 * Hides the tab bar and address bar when not hovering
 */
(function checkWebViewForFullscreen() {
    const webView = document.querySelector("#webview-container")
        hidePanels = true,
        marginLeft = '0.5rem';

    if (!webView) {
        setTimeout(checkWebViewForFullscreen, 1337);
        return;
    }

    let header = document.querySelector("#header"),
        browser = document.querySelector("#browser"),
        mainBar = document.querySelector(".mainbar"),
        bookmarkBar = document.querySelector(".bookmark-bar"),
        panelsContainer = document.querySelector("#panels-container"),
        fullscreenEnabled;

    chrome.storage.local.get("fullScreenModEnabled").then((value) => {
        fullscreenEnabled = value.fullScreenModEnabled || value.fullScreenModEnabled == undefined;
        if (fullscreenEnabled) {
            setMarginAndZIndex(fullscreenEnabled);
            addFullScreenListener();
        }
    });

    chrome.webNavigation.onCompleted.addListener((details) => {
        let webview = document.querySelector(`.webpanel-content webview[src*="${details.url}"]`) ?? document.querySelector(`webview[tab_id="${details.tabId}"]`);        

        webview?.executeScript({code: `(${setFullscreenObserver})()`});
    });
  
    chrome.runtime.onMessage.addListener((message) => {
        if (message.fullscreenExit) {
            header = document.querySelector("#header");
            browser = document.querySelector("#browser");
            mainBar = document.querySelector(".mainbar");
            bookmarkBar = document.querySelector(".bookmark-bar");
            panelsContainer = document.querySelector("#panels-container");

            setMarginAndZIndex(fullscreenEnabled);
            fullscreenEnabled ? hide() : show();
        }
    });

    vivaldi.tabsPrivate.onKeyboardShortcut.addListener(
        (id, combination) => combination === "Ctrl+Alt+F" && toggleFullScreen()
    );

    const style = document.createElement("style");
    style.appendChild(document.createTextNode(`
        .fullscreen-listener-enabled #header, .fullscreen-listener-enabled .mainbar, .fullscreen-listener-enabled .bookmark-bar, .fullscreen-listener-enabled #panels-container { transition: transform .5s !important; }
        [hidden] { transform: translateY(-100px) !important; }
        .hidden-panel { transform: translateX(-100%); }
        .fullscreen-listener-enabled #main { padding-top: 0 !important; }
    `));
    document.head.appendChild(style);

    const hoverDiv = document.createElement("div");
    hoverDiv.style.height = "9px";
    hoverDiv.style.width = "100vw";
    hoverDiv.style.position = "fixed";
    hoverDiv.style.left = "0";
    hoverDiv.style.top = "0";
    hoverDiv.style.zIndex = "1";
    hoverDiv.pointerEvents = "none";
    document.body.insertBefore(hoverDiv, document.body.firstChild);

    const panelHoverDiv = document.createElement("div");
    if (hidePanels) {        
        panelHoverDiv.style.height = "100%";
        panelHoverDiv.style.width = "1rem";
        panelHoverDiv.style.position = "fixed";
        panelHoverDiv.style.left = "0";
        panelHoverDiv.pointerEvents = "none";
        panelsContainer.before(panelHoverDiv); 
    }

    function toggleFullScreen() {
        fullscreenEnabled = !fullscreenEnabled;
        setMarginAndZIndex(fullscreenEnabled);
        fullscreenEnabled ? addFullScreenListener() : removeFullScreenListener();
        chrome.storage.local.set({fullScreenModEnabled: fullscreenEnabled})
    }

    function addFullScreenListener() {
        document.querySelector("#app").classList.add("fullscreen-listener-enabled");
        webView.addEventListener("pointerenter", hide);
        hoverDiv.addEventListener("pointerenter", showTop);
        hidePanels && panelHoverDiv.addEventListener("pointerenter", showLeft);
        hide();
    }

    function removeFullScreenListener() {
        document.querySelector("#app").classList.remove("fullscreen-listener-enabled");
        webView.removeEventListener("pointerenter", hide);
        hoverDiv.removeEventListener("pointerenter", showTop);
        hidePanels && panelHoverDiv.removeEventListener("pointerenter", showLeft);
        show();
    }

    function hide() {
        header.hidden = true;
        mainBar.hidden = true;
        bookmarkBar.hidden = true;
       
        if (hidePanels) {
            panelsContainer.classList.add("hidden-panel");
        }
    }

    function show() {
        showTop();
        showLeft();
    }

    function showTop() {
        header.hidden = false;
        mainBar.hidden = false;
        bookmarkBar.hidden = false;

        browser.classList.remove("address-top-off");
        browser.classList.add("address-top");
    }

    function showLeft() {
        if (hidePanels) {
            panelsContainer.classList.remove("hidden-panel");
        }
    }

    function setMarginAndZIndex(shouldAdjustStyles) {
        const headerOffset = header.offsetHeight;
        const mainBarOffset = mainBar.offsetHeight;

        adjustStyles(header, shouldAdjustStyles, 0);
        adjustStyles(mainBar, shouldAdjustStyles, headerOffset);
        adjustStyles(bookmarkBar, shouldAdjustStyles, headerOffset + mainBarOffset);

        if (hidePanels) {
            webView.style.marginLeft = shouldAdjustStyles ? `calc(-${panelsContainer.offsetWidth}px + ${marginLeft})` : "";
        }
    }

    function adjustStyles(element, shouldAdjustStyles, offset) {
        if (!element) return;
        element.style.marginTop = shouldAdjustStyles && offset ? `${offset}px` : "";
        element.style.marginBottom = shouldAdjustStyles ? `-${offset + element.offsetHeight}px` : "";
        element.style.zIndex = shouldAdjustStyles ? 9 : "";
    }

    function setFullscreenObserver() {
        if (this.fullscreenListenerSet) return;

        document.addEventListener('fullscreenchange', () => {
            if(!document.webkitIsFullScreen) chrome.runtime.sendMessage({fullscreenExit: true});
        });
        this.fullscreenListenerSet = true;    
    }
})();
