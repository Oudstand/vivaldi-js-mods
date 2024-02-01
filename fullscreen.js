/**
 * Forum link: https://forum.vivaldi.net/topic/92477/some-javascript-to-automatically-hide-tab-bar-and-address-bar-and-show-them-by-hovering
 * Hides the tab bar and address bar when not hovering
 */
(function checkWebViewForFullscreen() {
    const webView = document.querySelector("#webview-container");
    if (!webView) {
        setTimeout(checkWebViewForFullscreen, 1337);
        return;
    }

    const header = document.querySelector("#header"),
        browser = document.querySelector("#browser"),
        mainBar = document.querySelector(".mainbar"),
        bookmarkBar = document.querySelector(".bookmark-bar");

    let fullscreenEnabled;
    chrome.storage.local.get("fullScreenModEnabled").then((value) => {
        fullscreenEnabled = value.fullScreenModEnabled || value.fullScreenModEnabled == undefined;
        if (fullscreenEnabled) {
            setMarginAndZIndex(fullscreenEnabled);
            addFullScreenListener();
        }
    });

    vivaldi.tabsPrivate.onKeyboardShortcut.addListener(
        (id, combination) => combination === "Ctrl+Alt+F" && toggleFullScreen()
    );

    const style = document.createElement("style");
    style.appendChild(document.createTextNode("[hidden] { transform: translateY(-100px) !important; }"));
    document.head.appendChild(style);

    const hoverDiv = document.createElement("div");
    hoverDiv.style.height = "9px";
    hoverDiv.style.width = "100vw";
    hoverDiv.style.position = "fixed";
    hoverDiv.style.left = "0";
    hoverDiv.style.top = "0";
    hoverDiv.style.zIndex = "1";
    document.body.insertBefore(hoverDiv, document.body.firstChild);

    function toggleFullScreen() {
        fullscreenEnabled = !fullscreenEnabled;
        setMarginAndZIndex(fullscreenEnabled);
        fullscreenEnabled ? addFullScreenListener() : removeFullScreenListener();
        chrome.storage.local.set({fullScreenModEnabled: fullscreenEnabled})
    }

    function addFullScreenListener() {
        webView.addEventListener("pointerenter", hide);
        hoverDiv.addEventListener("pointerenter", show);
        hide();
    }

    function removeFullScreenListener() {
        webView.removeEventListener("pointerenter", hide);
        hoverDiv.removeEventListener("pointerenter", show);
        show();
    }

    function hide() {
        header.hidden = true;
        mainBar.hidden = true;
        bookmarkBar.hidden = true;
    }

    function show() {
        header.hidden = false;
        mainBar.hidden = false;
        bookmarkBar.hidden = false;

        browser.classList.remove("address-top-off");
        browser.classList.add("address-top");
    }

    function setMarginAndZIndex(shouldAdjustStyles) {
        const headerOffset = header.offsetHeight;
        const mainBarOffset = mainBar.offsetHeight;

        adjustStyles(header, shouldAdjustStyles, 0);
        adjustStyles(mainBar, shouldAdjustStyles, headerOffset);
        adjustStyles(bookmarkBar, shouldAdjustStyles, headerOffset + mainBarOffset);
    }

    function adjustStyles(element, shouldAdjustStyles, offset) {
        element.style.marginTop = shouldAdjustStyles && offset ? `${offset}px` : "";
        element.style.marginBottom = shouldAdjustStyles ? `-${offset + element.offsetHeight}px` : "";
        element.style.zIndex = shouldAdjustStyles ? 9 : "";
    }
})();
