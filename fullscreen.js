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

            fullscreenEnabled ? hide() : show();
        }
    });

    vivaldi.tabsPrivate.onKeyboardShortcut.addListener(
        (id, combination) => combination === "Ctrl+Alt+F" && toggleFullScreen()
    );

    let style = `
        .fullscreen-listener-enabled #header, .fullscreen-listener-enabled .mainbar, .fullscreen-listener-enabled .bookmark-bar, .fullscreen-listener-enabled #panels-container { 
            transition: transform .5s, opacity .5s ease-in-out !important; 
        }
        .fullscreen-listener-enabled .mainbar {
            display: block;
        }

        [hidden] { 
            transform: translateY(-${header.offsetHeight + mainBar.offsetHeight + bookmarkBar.offsetHeight}px) !important; 
            opacity: 0;
        }
        .hidden-panel { 
            transform: translateX(-100%); 
            opacity: 0;
        }

        .fullscreen-listener-enabled #main { 
            padding-top: 0 !important; 
        }

        .fullscreen-listener-enabled #header, .fullscreen-listener-enabled .mainbar, .fullscreen-listener-enabled .bookmark-bar { 
            z-index: 7;
        }
        .fullscreen-listener-enabled .mainbar { 
            margin-top: ${header.offsetHeight}px; 
        }
        .fullscreen-listener-enabled .bookmark-bar {
            margin-top: 0;
        }
        .fullscreen-listener-enabled #main, .fullscreen-listener-enabled .inner {
            position: absolute !important;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
        }
    `;

    if(hidePanels) {
        style += `.fullscreen-listener-enabled #webview-container {
            margin-left: calc(-${panelsContainer.offsetWidth}px + ${marginLeft});
        }`;
    }

    const styleEl = document.createElement("style");
    styleEl.appendChild(document.createTextNode(style));

    document.head.appendChild(styleEl);

    const hoverDiv = document.createElement("div");
    hoverDiv.style.height = "9px";
    hoverDiv.style.width = "100vw";
    hoverDiv.style.position = "fixed";
    hoverDiv.style.left = "0";
    hoverDiv.style.top = "0";
    hoverDiv.style.zIndex = "10";
    document.body.insertBefore(hoverDiv, document.body.firstChild);

    const panelHoverDiv = document.createElement("div");
    if (hidePanels) {        
        panelHoverDiv.style.height = "100%";
        panelHoverDiv.style.width = "1rem";
        panelHoverDiv.style.position = "fixed";
        panelHoverDiv.style.left = "0";
        panelsContainer.before(panelHoverDiv); 
    }

    function toggleFullScreen() {
        fullscreenEnabled = !fullscreenEnabled;
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

    function setFullscreenObserver() {
        if (this.fullscreenListenerSet) return;

        document.addEventListener('fullscreenchange', () => {
            if(!document.webkitIsFullScreen) chrome.runtime.sendMessage({fullscreenExit: true});
        });
        this.fullscreenListenerSet = true;    
    }
})();