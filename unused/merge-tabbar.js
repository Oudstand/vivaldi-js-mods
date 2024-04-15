setTimeout(function waitMergeTabbar() {
    const browser = document.getElementById('browser')
    if (browser) {
        moveMainbar();
        addStyle();
    } else {
        setTimeout(waitMergeTabbar, 300);
    }
}, 300);

function moveMainbar() {
    let mainbar = document.querySelector('.mainbar'),
        extensions = document.querySelector('.toolbar-extensions'),
        tabsContainer = document.querySelector('#tabs-container'),
        tabs = document.querySelector('.resize'),
        vivaldi = document.querySelector('.vivaldi');

    tabsContainer.before(mainbar);
    mainbar.before(vivaldi);
    tabs.after(extensions);
}

function addStyle() {
    const style = document.createElement('style');
    style.innerHTML = STYLE;
    document.querySelector('head').appendChild(style);
}

const STYLE = `
    #header {
        min-height: unset !important;
    }

    #tabs-tabbar-container {
        flex-direction: row !important;
        background-color: var(--colorAccentBg) !important;
    }

    .mainbar {
        flex: 2;
    }

    .mainbar:has(.UrlBar-AddressField:focus-within) {
        flex: 3;
    }

    .mainbar, #tabs-container {
        transition: flex .5s ease-in-out
    }

    #tabs-container {
        flex: 3;
    }

    .tab.active {
        background: var(--colorTabBar, transparent) !important;
    }
    
    .tab.active:before, .tab.active:after {
        display: none !important;
    }
    
    .tab-indicator.active {
        background-color: var(--colorHighlightFgAlpha) !important;
        border-bottom-width: 3px !important;
    }
    
    .tab-indicator {
        background-color: var(--colorHighlightFgAlphaHeavy) !important;
    }
    
    .UrlBar-AddressField {    
        background-color: var(--colorBgLightIntense);
    }

    .vivaldi {
        position: relative;
        margin: 0 0 0 2px;
    }

    .extensionPopupIcons svg {
        width: 100%;
        height: 100%;
    }
`;