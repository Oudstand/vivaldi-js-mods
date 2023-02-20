// https://forum.vivaldi.net/topic/28413/open-panels-on-mouse-over/22?_=1593504963587
function panelMouseOver(autoHide, delay_show, delay_change, delay_hide) {
    var buttons = document.getElementById('switch').getElementsByTagName('button');
    buttons = [...buttons].filter(button => !['Divider', 'Spacer', 'FlexibleSpacer', 'Settings', 'PanelWeb'].includes(button.name));
    var show_token = null;
    var activeButton = null;
    /* Stop timer if mouse exits screen */
    document.addEventListener("mouseout", function(e) {
        clearTimeout(show_token);
    });
    /* Do auto-hide if applicable */
    if (autoHide) {
        var content = document.getElementById("webview-container").onmouseover = function() {
            if (!document.getElementById("panels-container").getAttribute('class').includes("icons")) {
                clearTimeout(show_token);
                setTimeout(function() {
                    vivaldi.prefs.get('vivaldi.panels.as_overlay.enabled', function(isEnabled) {
                        hidePanel(isEnabled);
                    });
                }, delay_hide);
            }
        };
    }

    function activeButtonIndex() {
        for (let i = 0; i < buttons.length; i++) {
            if (buttons[i].parentElement.getAttribute('class').includes('active')) {
                return i;
            }
        }
        return -1;
    }

    function getActiveButton() {
        if (buttons[activeButtonIndex()]) {
            return buttons[activeButtonIndex()];
        }
        return null;
    }

    function setActive(index, doDelay) {
        clearTimeout(show_token);
        var delay = 0;
        if (doDelay) {
            delay = (activeButtonIndex() < 0) ? delay_show : delay_change;
        }
        show_token = setTimeout(function() {
            var newButton = buttons[index];
            if (!['active', 'add', 'webpanel-suggestion', 'addwebpanel'].some(cls => newButton.classList.contains(cls))) {
                activeButton = newButton;
                activeButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
                activeButton.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
                panel = index;
            }
        }, delay);
    }

    function setListeners() {
        for (let index = 0; index < buttons.length; index++) {
            buttons[index].onmouseover = function() {
                setActive(index, true);
            };
            buttons[index].onmouseout = function() {
                clearTimeout(show_token);
            };
            buttons[index].ondragover = function() {
                setActive(index, false);
            };
        }
    }
    setListeners();

    function hidePanel(isFloating) {
        if (isFloating) {
            activeButton = activeButton ? activeButton : getActiveButton();
            if (activeButton && (activeButton.parentElement.getAttribute('class').includes("active"))) {
                activeButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
                activeButton.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
                activeButton = null;
            }
        }
    }
}

function addObserver() {
    const switchPanel = document.getElementById('switch');
    const config = {
        childList: true,
        subtree: true
    };
    const callback = function(mutationList, observer) {
        for (let mutation of mutationList) {
            if (mutation.type === 'childList') {
                panelMouseOver(true, 100, 50, 250);
            }
        }
    };
    const observer = new MutationObserver(callback);
    observer.observe(switchPanel, config);
};

setTimeout(function waitMouseOver() {
    const browser = document.getElementById('browser');
    if (browser) {
        panelMouseOver(true, 100, 50, 250);
        addObserver();
    } else {
        setTimeout(waitMouseOver, 300);
    }
}, 300);