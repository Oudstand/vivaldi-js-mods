setTimeout(function waitWideUrlBar() {
    const browser = document.getElementById('browser'),
        urlBar = document.querySelector('.UrlBar-AddressField');
    if (browser && urlBar) {
        createWideUrlBarStyle();
        addUlrBarObserver(urlBar);
    } else {
        setTimeout(waitWideUrlBar, 300);
    }
}, 300);

function createWideUrlBarStyle() {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`
        .wideUrlBar.UrlBar-AddressField:focus-within {
            width: 40vw !important;
            height: 30px;
            /* extends the width of the url bar addressfield while it is focused */
        }
        .UrlBar-AddressField {
            transition: .2s ease-in-out !important;
            /* added animation for extending and reducing the width */
        }
        .wideUrlBar .OmniDropdown {
            margin-top: -3px;
        }
    `);
    document.adoptedStyleSheets = [sheet];
}

function addUlrBarObserver(urlBar) {
    let target = urlBar.querySelector('.observer'),
        observer = new MutationObserver(mutation => {
            if (target.querySelector('.OmniDropdown') !== null) {
                urlBar.classList.add('wideUrlBar');
            } else {
                urlBar.classList.remove('wideUrlBar');
            }
        });
    observer.observe(target, {
        childList: true
    });
}