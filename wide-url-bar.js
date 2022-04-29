setTimeout(function waitWideUrlBar() {
    const browser = document.getElementById('browser');
    if (browser) {
        createWideUrlBarStyle();
        addUlrBarObserver();
    } else {
        setTimeout(waitWideUrlBar, 300);
    }
}, 300);

function createWideUrlBarStyle() {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`
        .wideUrlBar.UrlBar-AddressField:focus-within {
            width: 40vw !important;
            margin-top: 5px;
            height: 30px;
            /* extends the width of the url bar addressfield while it is focused */
        }
        .maximized .wideUrlBar.UrlBar-AddressField:focus-within{
            margin-top: 0 !important;
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

function addUlrBarObserver() {
    let urlBar = document.querySelector('.UrlBar-AddressField'),
        target = urlBar.querySelector('.observer'),
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