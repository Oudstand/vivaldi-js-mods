/**
 * Forum link: https://forum.vivaldi.net/topic/92477/some-javascript-to-automatically-hide-tab-bar-and-address-bar-and-show-them-by-hovering
 * Hides the tab bar and address bar when not hovering
 */
(function checkWebViewForFullscreen() {
    const webView = document.querySelector('#webview-container'),
        hidePanels = true, // set to false to not hide the panels
        marginLeft = 'var(--edge-like-border-radius) / 2', // set to '0px' to remove the margin left
        bookmarkBarPadding = '6px', // set to '0px' to remove the padding around the bookmark bar
        delay = 125; // set to   0 to remove the delay

    if (!webView) {
        setTimeout(checkWebViewForFullscreen, 1337);
        return;
    }

    let app = document.querySelector('#app'),
        header = document.querySelector('#header'),
        mainBar = document.querySelector('.mainbar'),
        bookmarkBar = document.querySelector('.bookmark-bar'),
        panelsContainer = document.querySelector('#panels-container'),
        fullscreenEnabled,
        showLeftTimeout,
        showTopTimeout;

    chrome.storage.local.get('fullScreenModEnabled').then((value) => {
        fullscreenEnabled = value.fullScreenModEnabled || value.fullScreenModEnabled == undefined;
        if (fullscreenEnabled) {
            addFullScreenListener();
        }
    });

    vivaldi.tabsPrivate.onKeyboardShortcut.addListener((id, combination) => combination === 'F11' && id === vivaldiWindowId && toggleFullScreen());

    let style = `
        .fullscreen-listener-enabled {
            #header, .mainbar, .bookmark-bar, #panels-container { 
                transition: transform .5s, opacity .5s ease-in-out !important; 
            }

            &.hidden-top {
                #header, .mainbar, .bookmark-bar { 
                    transform: translateY(-${header.offsetHeight + mainBar.offsetHeight + (bookmarkBar?.offsetHeight || 0)}px); 
                    opacity: 0;
                }
            }

            #header, .mainbar {
                z-index: 8;
            }
            .bookmark-bar  {
                z-index: 7;
            }

            #header .vivaldi {
                margin-top: 3px;
            }

            .hover-div {
                transition: visibility 0.5s ease-in-out;
            }

            &:not(.hidden-top) .hover-div {
                visibility: hidden;
            }

            .bookmark-bar-top-off .mainbar {
                padding-bottom: 5px;
                background: var(--colorAccentBg);
            }

            .mainbar {
                display: block;
                margin-top: ${header.offsetHeight}px; 
            }

            #main { 
                padding-top: 0 !important; 
            }

            .bookmark-bar {
                margin-top: 0;
            }

            #main, .inner {
                position: absolute !important;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
            }

            .extensionIconPopupMenu {
                z-index: 8;
            }

            footer {
                margin-top: auto !important;
            }

            &.hidden-panel #panels-container {
                transform: translateX(-100%); 
                opacity: 0;
            }

            .panel-hover-div {
                transition: visibility 0.5s ease-in-out;
            }

            &:not(.hidden-panel) .panel-hover-div {
                visibility: hidden;
            }
        }

        #app:not(.fullscreen-listener-enabled) {
            .hover-div, .panel-hover-div {
                visibility: hidden;
            }
        }

        .hidden-panel .panel-group {
            display: none;
        }
    `;

    if (hidePanels) {
        style += `.fullscreen-listener-enabled #webview-container {
            margin-left: calc(-${panelsContainer.offsetWidth}px + ${marginLeft});
        }`;
    }

    if (bookmarkBarPadding) {
        style += `.fullscreen-listener-enabled .bookmark-bar {
            height: auto;
            padding-top: ${bookmarkBarPadding};
            padding-bottom: calc(${bookmarkBarPadding} / 2);
        }`;
    }

    const styleEl = document.createElement('style');
    styleEl.appendChild(document.createTextNode(style));

    document.head.appendChild(styleEl);

    const hoverDiv = document.createElement('div');
    hoverDiv.style.height = '1.5rem';
    hoverDiv.style.width = '100vw';
    hoverDiv.style.position = 'fixed';
    hoverDiv.style.left = '0';
    hoverDiv.style.top = '0';
    hoverDiv.style.zIndex = '10';
    hoverDiv.className = 'hover-div';
    document.querySelector('#app').appendChild(hoverDiv);

    const panelHoverDiv = document.createElement('div');
    if (hidePanels) {
        panelHoverDiv.style.height = '100%';
        panelHoverDiv.style.width = '1.5rem';
        panelHoverDiv.style.position = 'fixed';
        panelHoverDiv.style.left = '0';
        panelHoverDiv.style.zIndex = '10';
        panelHoverDiv.className = 'panel-hover-div';
        panelsContainer.before(panelHoverDiv);
    }

    function toggleFullScreen() {
        fullscreenEnabled = !fullscreenEnabled;
        fullscreenEnabled ? addFullScreenListener() : removeFullScreenListener();
        chrome.storage.local.set({fullScreenModEnabled: fullscreenEnabled});
    }

    function addFullScreenListener() {
        app.classList.add('fullscreen-listener-enabled');
        webView.addEventListener('pointerenter', hide);
        hoverDiv.addEventListener('pointerenter', showTop);
        hoverDiv.addEventListener('pointerleave', clearTimeouts);
        if (hidePanels) {
            panelHoverDiv.addEventListener('pointerenter', showLeft);
            panelHoverDiv.addEventListener('pointerleave', clearTimeouts);
        }

        hide();
    }

    function removeFullScreenListener() {
        app.classList.remove('fullscreen-listener-enabled');
        webView.removeEventListener('pointerenter', hide);
        hoverDiv.removeEventListener('pointerenter', showTop);
        hoverDiv.removeEventListener('pointerleave', clearTimeouts);
        if (hidePanels) {
            panelHoverDiv.removeEventListener('pointerenter', showLeft);
            panelHoverDiv.removeEventListener('pointerleave', clearTimeouts);
        }

        show();
    }

    function clearTimeouts() {
        if (showTopTimeout) clearTimeout(showTopTimeout);
        if (showLeftTimeout) clearTimeout(showLeftTimeout);
    }

    function hide() {
        app.classList.add('hidden-top');
        if (hidePanels) app.classList.add('hidden-panel');
    }

    function show() {
        showTop();
        showLeft();
    }

    function showTop() {
        showTopTimeout = setTimeout(() => app.classList.remove('hidden-top'), delay);
    }

    function showLeft() {
        if (hidePanels) {
            showLeftTimeout = setTimeout(() => app.classList.remove('hidden-panel'), delay);
        }
    }
})();
