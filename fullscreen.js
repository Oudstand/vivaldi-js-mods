/**
 * Forum link: https://forum.vivaldi.net/topic/92477/some-javascript-to-automatically-hide-tab-bar-and-address-bar-and-show-them-by-hovering
 * Hides the tab bar and address bar when not hovering
 */
(function checkWebViewForFullscreen() {
    const webView = document.querySelector('#webview-container'),
        hidePanels = true,
        marginLeft = 'var(--edge-like-border-radius) / 2',
        bookmarBarPadding = '3px';

    if (!webView) {
        setTimeout(checkWebViewForFullscreen, 1337);
        return;
    }

    let app = document.querySelector('#app'),
        header = document.querySelector('#header'),
        mainBar = document.querySelector('.mainbar'),
        bookmarkBar = document.querySelector('.bookmark-bar'),
        panelsContainer = document.querySelector('#panels-container'),
        fullscreenEnabled;

    chrome.storage.local.get('fullScreenModEnabled').then((value) => {
        fullscreenEnabled = value.fullScreenModEnabled || value.fullScreenModEnabled == undefined;
        if (fullscreenEnabled) {
            addFullScreenListener();
        }
    });

    vivaldi.tabsPrivate.onKeyboardShortcut.addListener((id, combination) => combination === 'Ctrl+Alt+F' && toggleFullScreen());

    let style = `
        .fullscreen-listener-enabled {
            #header, .mainbar, .bookmark-bar, #panels-container { 
                transition: transform .5s, opacity .5s ease-in-out !important; 
            }

            &.hidden-top {
                #header, .mainbar, .bookmark-bar { 
                    transform: translateY(-${header.offsetHeight + mainBar.offsetHeight + bookmarkBar.offsetHeight}px) !important; 
                    opacity: 0;
                    z-index: 7;
                }
            }

            #header, .mainbar, .bookmark-bar { 
                z-index: 7;
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

    if (bookmarBarPadding) {
        style += `.fullscreen-listener-enabled .bookmark-bar {
            height: auto;
            padding-top: ${bookmarBarPadding};
            padding-bottom: ${bookmarBarPadding};
        }`;
    }

    const styleEl = document.createElement('style');
    styleEl.appendChild(document.createTextNode(style));

    document.head.appendChild(styleEl);

    const hoverDiv = document.createElement('div');
    hoverDiv.style.height = '9px';
    hoverDiv.style.width = '100vw';
    hoverDiv.style.position = 'fixed';
    hoverDiv.style.left = '0';
    hoverDiv.style.top = '0';
    hoverDiv.style.zIndex = '10';
    document.body.insertBefore(hoverDiv, document.body.firstChild);

    const panelHoverDiv = document.createElement('div');
    if (hidePanels) {
        panelHoverDiv.style.height = '100%';
        panelHoverDiv.style.width = '1rem';
        panelHoverDiv.style.position = 'fixed';
        panelHoverDiv.style.left = '0';
        hoverDiv.style.zIndex = '10';
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
        hidePanels && panelHoverDiv.addEventListener('pointerenter', showLeft);
        hide();
    }

    function removeFullScreenListener() {
        app.classList.remove('fullscreen-listener-enabled');
        webView.removeEventListener('pointerenter', hide);
        hoverDiv.removeEventListener('pointerenter', showTop);
        hidePanels && panelHoverDiv.removeEventListener('pointerenter', showLeft);
        show();
    }

    function hide() {
        app.classList.add('hidden-top');

        if (hidePanels) {
            app.classList.add('hidden-panel');
        }
    }

    function show() {
        showTop();
        showLeft();
    }

    function showTop() {
        app.classList.remove('hidden-top');
    }

    function showLeft() {
        if (hidePanels) {
            app.classList.remove('hidden-panel');
        }
    }
})();
