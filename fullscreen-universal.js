/**
 * Forum link: https://forum.vivaldi.net/topic/92477/some-javascript-to-automatically-hide-tab-bar-and-address-bar-and-show-them-by-hovering
 * Hides the tab bar and address bar when not hovering
 */
(function checkWebViewForFullscreen() {
    const webView = document.querySelector('#webview-container'),
        bookmarkBarPadding = '6px', // set to '0px' to remove the padding around the bookmark bar
        showDelay = 125, // set to 0 to remove the delay
        hideDelay = 250, // set to 0 to remove the delay
        alwaysShowAddressBar = false, // always shows the address bar - set to true to enable the feature
        showAddressBarOnFocus = true, // shows the address bar on a new tab or if in focus - set to false to disable the feature
        showAddressBarPadding = 15, // moves the address bar on a new tab or if in focus to - positive and negative values are allowed
        updateHoverDivSize = false, // decreases the size for the hover divs in fullscreen mode - set ti false to disable the feature
        hidePanels = true, // set to false to not hide the panels
        hideTabs = true, // set to false to not hide the tabs - currently only works with vertical tabs
        useTwoLevelTabStack = false; // set to true if you use two level tab stack to recalculate height

    if (!webView) {
        setTimeout(checkWebViewForFullscreen, 1337);
        return;
    }

    const positions = ['top', 'bottom', 'left', 'right'],
        app = document.querySelector('#app'),
        browser = document.querySelector('#browser'),
        header = document.querySelector('#header'),
        mainBar = document.querySelector('.mainbar'),
        bookmarkBar = document.querySelector('.bookmark-bar'),
        panelsContainer = document.querySelector('#panels-container'),
        tabBarContainer = document.querySelector('#tabs-tabbar-container'),
        panelsLeft = document.querySelector('#panels-container').classList.contains('left'),
        tabBarPosition = positions.find(cls => tabBarContainer.classList.contains(cls)),
        addressBarTop = browser.classList.contains('address-top'),
        bookmarksTop = browser.classList.contains('bookmark-bar-top'),
        footer = document.querySelector('#footer');

    let fullscreenEnabled,
        showTopTimeout,
        showLeftTimeout,
        showRightTimeout,
        showBottomTimeout,
        hideTimeout,
        subcontainerObserver,
        heightsRAF = null;

    chrome.storage.local.get('fullScreenModEnabled').then((value) => {
        fullscreenEnabled = value.fullScreenModEnabled || value.fullScreenModEnabled == undefined;
        if (fullscreenEnabled) {
            addFullScreenListener();
        }
    });

    vivaldi.tabsPrivate.onKeyboardShortcut.addListener((id, combination) => combination === 'F11' && id === vivaldiWindowId && toggleFullScreen());

    let style = `
        .fullscreen-listener-enabled {
            ${generalCSS()}
            ${topCSS()}
            ${leftCSS()}
            ${rightCSS()}
            ${bottomCSS()}
        }

        #app:not(.fullscreen-listener-enabled) .hover-div {
            visibility: hidden;
        }
    `;

    if (bookmarkBarPadding) {
        style += `
            .fullscreen-listener-enabled .bookmark-bar {
                height: calc(30px + ${bookmarkBarPadding} + ${bookmarkBarPadding} / 2) !important;
                padding-top: ${bookmarkBarPadding};
                padding-bottom: calc(${bookmarkBarPadding} / 2);
            }
        `;
    }

    const styleEl = document.createElement('style');
    styleEl.appendChild(document.createTextNode(style));

    document.head.appendChild(styleEl);

    const hoverDivTop = createHorizontalHoverDiv('top'),
        hoverDivLeft = (hidePanels && panelsLeft) || tabBarPosition === 'left' ? createVerticalHoverDiv('left') : undefined,
        hoverDivRight = (hidePanels && !panelsLeft) || tabBarPosition === 'right' ? createVerticalHoverDiv('right') : undefined,
        hoverDivBottom = !addressBarTop || tabBarPosition === 'bottom' || !bookmarksTop || document.querySelector('#footer').childNodes.length ? createHorizontalHoverDiv('bottom') : undefined;

    function toggleFullScreen() {
        fullscreenEnabled = !fullscreenEnabled;
        fullscreenEnabled ? addFullScreenListener() : removeFullScreenListener();
        chrome.storage.local.set({fullScreenModEnabled: fullscreenEnabled});
    }

    function addFullScreenListener() {
        app.classList.add('fullscreen-listener-enabled');
        webView.addEventListener('pointerenter', hide);

        if (hideDelay) {
            webView.addEventListener('pointerleave', clearHideTimeout);
        }

        hoverDivTop.addEventListener('pointerenter', showTop);
        hoverDivTop.addEventListener('pointerleave', clearTimeouts);

        if (hoverDivLeft) {
            hoverDivLeft.addEventListener('pointerenter', showLeft);
            hoverDivLeft.addEventListener('pointerleave', clearTimeouts);
        }

        if (hoverDivRight) {
            hoverDivRight.addEventListener('pointerenter', showRight);
            hoverDivRight.addEventListener('pointerleave', clearTimeouts);
        }

        if (hoverDivBottom) {
            hoverDivBottom.addEventListener('pointerenter', showBottom);
            hoverDivBottom.addEventListener('pointerleave', clearTimeouts);
        }

        if (updateHoverDivSize) addEventListener('resize', updateHoverDivs);

        startSubcontainerObserver();
        scheduleHeights();
        hide();
    }

    function removeFullScreenListener() {
        app.classList.remove('fullscreen-listener-enabled');
        webView.removeEventListener('pointerenter', hide);

        if (hideDelay) {
            webView.removeEventListener('pointerleave', clearHideTimeout);
        }

        hoverDivTop.removeEventListener('pointerenter', showTop);
        hoverDivTop.removeEventListener('pointerleave', clearTimeouts);

        if (hoverDivLeft) {
            hoverDivLeft.removeEventListener('pointerenter', showLeft);
            hoverDivLeft.removeEventListener('pointerleave', clearTimeouts);
        }

        if (hoverDivRight) {
            hoverDivRight.removeEventListener('pointerenter', showRight);
            hoverDivRight.removeEventListener('pointerleave', clearTimeouts);
        }

        if (hoverDivBottom) {
            hoverDivBottom.removeEventListener('pointerenter', showBottom);
            hoverDivBottom.removeEventListener('pointerleave', clearTimeouts);
        }

        if (updateHoverDivSize) removeEventListener('resize', updateHoverDivs);

        stopSubcontainerObserver();
        show();
    }

    function clearTimeouts() {
        if (showTopTimeout) clearTimeout(showTopTimeout);
        if (showLeftTimeout) clearTimeout(showLeftTimeout);
        if (showRightTimeout) clearTimeout(showRightTimeout);
        if (showBottomTimeout) clearTimeout(showBottomTimeout);
    }

    function clearHideTimeout() {
        if (hideTimeout) clearTimeout(hideTimeout);
    }

    function hide() {
        hideTimeout = setTimeout(() => {
            app.classList.add('hidden-top');
            if (hoverDivLeft) app.classList.add('hidden-left');
            if (hoverDivRight) app.classList.add('hidden-right');
            if (hoverDivBottom) app.classList.add('hidden-bottom');
        }, hideDelay);
    }

    function show() {
        showTop();
        showLeft();
        showRight();
        showBottom();
    }

    function showTop() {
        showTopTimeout = setTimeout(() => app.classList.remove('hidden-top'), showDelay);
    }

    function showLeft() {
        if (hoverDivLeft) {
            showLeftTimeout = setTimeout(() => app.classList.remove('hidden-left'), showDelay);
        }
    }

    function showRight() {
        if (hoverDivRight) {
            showRightTimeout = setTimeout(() => app.classList.remove('hidden-right'), showDelay);
        }
    }

    function showBottom() {
        if (hoverDivBottom) {
            showBottomTimeout = setTimeout(() => app.classList.remove('hidden-bottom'), showDelay);
        }
    }

    function isWindowMaximized() {
        return browser.classList.contains('maximized');
    }

    function setHorizontalHoverDivHeight(hoverDiv) {
        hoverDiv.style.height = updateHoverDivSize && isWindowMaximized() ? '1px' : '1.5rem';
    }

    function setVerticalHoverDivWidth(hoverDiv) {
        hoverDiv.style.width = updateHoverDivSize && isWindowMaximized() ? '1px' : '1.5rem'
    }

    function updateHoverDivs() {
        setTimeout(() => {
            setHorizontalHoverDivHeight(hoverDivTop);
            if (hoverDivLeft) setVerticalHoverDivWidth(hoverDivLeft);
            if (hoverDivRight) setVerticalHoverDivWidth(hoverDivRight);
            if (hoverDivBottom) setHorizontalHoverDivHeight(hoverDivBottom);
        }, 150);
    }

    function createHorizontalHoverDiv(position) {
        const hoverDiv = document.createElement('div');
        setHorizontalHoverDivHeight(hoverDiv);
        hoverDiv.style.width = '100vw';
        hoverDiv.style.position = 'fixed';
        hoverDiv.style.left = '0';
        hoverDiv.style.zIndex = '10';
        hoverDiv.style[position] = '0';
        hoverDiv.className = 'hover-div';
        hoverDiv.classList.add(position);
        document.querySelector('#app').appendChild(hoverDiv);
        return hoverDiv;
    }

    function createVerticalHoverDiv(position) {
        const hoverDiv = document.createElement('div');
        hoverDiv.style.height = '100%';
        setVerticalHoverDivWidth(hoverDiv);
        hoverDiv.style.position = 'fixed';
        hoverDiv.style.top = '0';
        hoverDiv.style.zIndex = '10';
        hoverDiv.style[position] = '0';
        hoverDiv.className = 'hover-div';
        hoverDiv.classList.add(position);
        document.querySelector('#app').appendChild(hoverDiv);
        return hoverDiv;
    }

    function startSubcontainerObserver() {
        if (!useTwoLevelTabStack || !tabBarContainer) return;

        subcontainerObserver = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                const hit = [...mutation.addedNodes, ...mutation.removedNodes].some(node => node.nodeType === Node.ELEMENT_NODE && node.id === 'tabs-subcontainer');

                if (hit) {
                    scheduleHeights();
                    break;
                }
            }
        });

        subcontainerObserver.observe(tabBarContainer, {childList: true});
        addEventListener('resize', scheduleHeights, {passive: true});
    }

    function stopSubcontainerObserver() {
        if (subcontainerObserver) {
            subcontainerObserver.disconnect();
            subcontainerObserver = null;
        }
        if (heightsRAF) {
            cancelAnimationFrame(heightsRAF);
            heightsRAF = null;
        }
    }

    function scheduleHeights() {
        if (heightsRAF) return;
        heightsRAF = requestAnimationFrame(() => {
            heightsRAF = null;
            calculateHeights();
        });
    }

    function calculateHeights() {
        let topOffset = 0;
        let bottomOffset = 0;

        const headerHeight = getHeight(header);
        const mainBarHeight = getHeight(mainBar);
        const bookmarkBarHeight = getHeight(bookmarkBar);
        const footerHeight = getHeight(footer);

        // Top
        if (tabBarPosition === 'top' || !addressBarTop) topOffset += headerHeight;
        if (addressBarTop) topOffset += mainBarHeight;
        if (bookmarksTop && bookmarkBar) topOffset += bookmarkBarHeight;

        // Bottom
        if (footer.childNodes.length) bottomOffset += footerHeight;
        if (!addressBarTop) bottomOffset += mainBarHeight;
        if (!bookmarksTop && bookmarkBar) bottomOffset += bookmarkBarHeight;

        app.style.setProperty('--fs-top-offset', topOffset + 'px');
        app.style.setProperty('--fs-bottom-offset', bottomOffset + 'px');
        app.style.setProperty('--fs-header-height', headerHeight + 'px');
        app.style.setProperty('--fs-main-bar-height', mainBarHeight + 'px');
        app.style.setProperty('--fs-bookmark-bar-height', bookmarkBarHeight + 'px');
        app.style.setProperty('--fs-footer-height', footerHeight + 'px');
    }

    function generalCSS() {
        let css = `
            #header, .mainbar, .bookmark-bar, #panels-container {
                transition: transform .5s, opacity .5s ease-in-out, visibility .5s ease-in-out !important;
            }

            #header, .mainbar {
                z-index: 8;
            }
            
            .mainbar {
                position: absolute;
                width: 100%;
            }

            .bookmark-bar  {
                position: absolute;
                left: 0;
                right: 0;
                z-index: 7;
            }

            #header .vivaldi {
                margin-top: 3px;
            }

            #main {
                padding-top: 0 !important;
                position: absolute;
                top: 0;
                bottom: 0;
                left: 0;
                right: 0;

                .inner {
                    position: unset;                  
                }
            }

            .extensionIconPopupMenu, .button-popup {
                z-index: 8;
            }

            footer {
                margin-top: auto !important;
            }

            .hover-div {
                transition: visibility 0.5s ease-in-out;
            }
        `;

        if (hidePanels) {
            css += `
            #panels-container {
                position: absolute !important;
            }
            `;
        }

        return css;
    }

    function topCSS() {
        const topElements = [];

        if (tabBarPosition === 'top' || !addressBarTop) topElements.push('#header');
        if (addressBarTop) topElements.push('.mainbar');
        if (bookmarksTop && bookmarkBar) topElements.push('.bookmark-bar');

        if (topElements.length === 0) return '';

        const topElementsSelector = topElements.join(', ');

        let css = `
            &.hidden-top {
                ${topElementsSelector} {
                    transform: translateY(calc(var(--fs-top-offset) * -1));
                    opacity: 0;
                }
            }

            &:not(.hidden-top) .hover-div.top {
                visibility: hidden;
            }
        `;

        if (addressBarTop) {
            if (alwaysShowAddressBar || showAddressBarOnFocus) {
                css += `
                &.hidden-top {
                    ${!alwaysShowAddressBar ? '#browser:has(.internal-page .startpage .SpeedDialView), #browser:has(.internal-page .startpage .Dashboard), #browser:has(.UrlBar-AddressField:focus-within) {' : ''}
                        .mainbar {
                            opacity: 1;

                            .UrlBar-AddressField {
                                position: absolute;
                                top: calc(var(--fs-top-offset) + ${showAddressBarPadding}px);
                                left: 25vw;
                                right: 25vw;
                                width: 50vw !important;
                            }
                        }
                    ${!alwaysShowAddressBar ? '}' : ''}
                }
            `;
            }

            if (bookmarksTop) {
                css += `
                    .bookmark-bar-top-off .mainbar {
                        padding-bottom: 5px;
                        background: var(--colorAccentBg);
                    }
                `;
            }

            if (tabBarPosition === 'top') {
                css += `
                    .mainbar {
                        margin-top: var(--fs-header-height);
                    }
                `;
            }
        }

        if (bookmarksTop) {
            css += `
                .bookmark-bar {
                    top: 0;
                    margin-top: calc(var(--fs-top-offset) - var(--fs-bookmark-bar-height));
                }
            `;
        }

        return css;
    }

    function leftCSS() {
        const leftElements = [];
        let css = '',
            width = 0,
            tabbarWrapper;

        if (hideTabs && tabBarPosition === 'left') {
            leftElements.push('.tabbar-wrapper');
            tabbarWrapper = document.querySelector('.tabbar-wrapper');
            width += tabbarWrapper.offsetWidth;
        }

        if (hidePanels && panelsLeft) {
            leftElements.push('#panels-container');
            width += panelsContainer.offsetWidth;
        }

        if (leftElements.length === 0) {
            return '';
        }

        css += `
            &.hidden-left {
                ${leftElements.join(', ')} {
                    transform: translateX(-${width}px);
                    opacity: 0;
                    visibility: hidden;
                }
            }

            &:not(.hidden-left) .hover-div.left {
                visibility: hidden;
            }
        `;

        if (tabBarPosition === 'left') {
            css += `
                .tabbar-wrapper {
                    position: absolute;
                    top: 0;
                    left: ${panelsLeft ? panelsContainer.offsetWidth : 0}px;
                    z-index: 1;
                    transition: transform .5s, opacity .5s ease-in-out !important;

                    &  > .tabbar-wrapper {
                        position: static;
                    }
                }
            `;
        }

        return css;
    }

    function rightCSS() {
        const rightElements = [];
        let width = 0,
            tabbarWrapper;

        if (hideTabs && tabBarPosition === 'right') {
            rightElements.push('.tabbar-wrapper');
            tabbarWrapper = document.querySelector('.tabbar-wrapper');
            width += tabbarWrapper.offsetWidth;
        }

        if (hidePanels && !panelsLeft) {
            rightElements.push('#panels-container');
            width += panelsContainer.offsetWidth;
        }

        if (rightElements.length === 0) {
            return '';
        }

        let css = `
            &.hidden-right {
                ${rightElements.join(', ')} {
                    transform: translateX(${width}px);
                    opacity: 0;
                    visibility: hidden;
                }
            }

            &:not(.hidden-right) .hover-div.right {
                visibility: hidden;
            }
        `;

        if (tabBarPosition === 'right') {
            css += `
                .tabbar-wrapper {
                    position: absolute;
                    top: 0;
                    right: ${!panelsLeft ? panelsContainer.offsetWidth : 0}px;
                    z-index: 1;
                    transition: transform .5s, opacity .5s ease-in-out !important;

                    &  > .tabbar-wrapper {
                        position: static;
                    }
                }
            `;
        }

        return css;
    }

    function bottomCSS() {
        const bottomElements = [];

        if (footer.childNodes.length) bottomElements.push('#footer');
        if (!addressBarTop) bottomElements.push('.mainbar');
        if (!bookmarksTop && bookmarkBar) bottomElements.push('.bookmark-bar');

        if (bottomElements.length === 0) return '';

        let css = `
            &.hidden-bottom {
                ${bottomElements.join(', ')} {
                    transform: translateY(var(--fs-bottom-offset));
                    opacity: 0;
                }
            }

            &:not(.hidden-bottom) .hover-div.bottom {
                visibility: hidden;
            }
        `;

        if (tabBarPosition === 'bottom') {
            css += `
                #footer {
                    transition: transform .5s, opacity .5s ease-in-out !important;
                }
            `;
        }

        if (!addressBarTop) {
            css += `
                .mainbar {
                    margin-bottom: var(--fs-footer-height);
                }
            `;

            if (alwaysShowAddressBar || showAddressBarOnFocus) {
                css += `
                &.hidden-bottom {
                   ${!alwaysShowAddressBar ? '#browser:has(.internal-page .startpage), #browser:has(.UrlBar-AddressField:focus-within) {' : ''}
                        .mainbar {
                            opacity: 1;

                            .UrlBar-AddressField {
                                position: absolute;
                                bottom: calc(var(--fs-main-bar-height) + 10px + ${showAddressBarPadding}px);
                                left: 25vw;
                                right: 25vw;
                                width: 50vw !important;
                            }
                        }
                   ${!alwaysShowAddressBar ? '}' : ''}
                }
            `;
            }

            if (!bookmarksTop) {
                css += `
                    .bookmark-bar-bottom-off .mainbar {
                        padding-bottom: -5px;
                        background: var(--colorAccentBg);
                    }
                `;
            }
        }

        if (!bookmarksTop) {
            css += `
                .bookmark-bar {
                    bottom: calc(var(--fs-footer-height) + ${(!addressBarTop ? 'var(--fs-main-bar-height)' : '0px')});
                    margin-bottom: 0;
                }
            `;
        }

        return css;
    }

    function getHeight(el) {
        return el?.offsetHeight || 0;
    }
})();
