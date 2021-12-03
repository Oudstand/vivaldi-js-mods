/**
 * Forum link: https://forum.vivaldi.net/topic/33122/custom-keyboard-shortcuts-mod
 * Keyboard Machine, a Mod for Vivaldi
 * Make custom shortcuts that do stuff™ and use them in the vivaldi UI
 * Based on "button machine". NO COPYRIGHT RESERVED. lonm.vivaldi.net
 * Version 1.0.0
 */
(function keyboardMachine() {
    /**
     * Add custom commands here
     * key: String of what keys to press - written in the form (Ctrl+Shift+Alt+Key)
     * value: A function describing what to do when the key is pressed
     */
    const SHORTCUTS = {
        "Shift+F4": () => { /* close the active panel */
            let panelsSwitch = document.getElementById('panels-container');
            panelsSwitch.style.display = panelsSwitch.style.display ? '' : 'none';
        }
    };
    /* remember last active panel */
    let lastActivePanel;
    /**
     * Handle a potential keyboard shortcut
     * @param {String} combination written in the form (CTRL+SHIFT+ALT+KEY)
     * @param {boolean} extras I don't know what this does, but it's an extra argument
     */
    function keyCombo(combination, extras) {
        const customShortcut = SHORTCUTS[combination];
        if (customShortcut) {
            customShortcut();
        }
    }
    /**
     * Check that the browser is loaded up properly, and init the mod
     */
    function initMod() {
        if (document.querySelector("#browser")) {
            vivaldi.tabsPrivate.onKeyboardShortcut.addListener(keyCombo);
        } else {
            setTimeout(initMod, 500);
        }
    }
    initMod();
})();