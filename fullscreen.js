/**
 * Forum link: https://forum.vivaldi.net/topic/92477/some-javascript-to-automatically-hide-tab-bar-and-address-bar-and-show-them-by-hovering
 * Hides the tab bar and address bar when not hovering
 */
let fullScreenInterval = setInterval(() => {
  const webView = document.querySelector("#webview-container");
  const header = document.querySelector("#header");
  const browser = document.querySelector("#browser");

  if (webView) {
    clearInterval(fullScreenInterval);
    let fullscreenEnabled;

    chrome.storage.local.get("fullScreenModEnabled").then((value) => {
      fullscreenEnabled = value.fullScreenModEnabled || value.fullScreenModEnabled == undefined;
      if (fullscreenEnabled) {
        addFullScreenListener();
      }
    });

    vivaldi.tabsPrivate.onKeyboardShortcut.addListener(
      (id, combination) => combination === "Ctrl+Alt+F" && toggleFullScreen()
    );

    const style = document.createElement("style");
    style.appendChild(
      document.createTextNode("[hidden] { display: none !important; }")
    );
    document.head.appendChild(style);

    const hoverDiv = document.createElement("div");
    hoverDiv.style.height = "9px";
    hoverDiv.style.width = "100vw";
    hoverDiv.style.position = "fixed";
    hoverDiv.style.left = "0";
    hoverDiv.style.top = "0";
    hoverDiv.style.zIndex = 1;
    document.body.insertBefore(hoverDiv, document.body.firstChild);

    function toggleFullScreen() {
      fullscreenEnabled = !fullscreenEnabled;
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
      [...document.querySelectorAll(".tabbar-wrapper")].forEach(
        (item) => (item.hidden = true)
      );
      document.querySelector(".mainbar").hidden = true;
      document.querySelector(".bookmark-bar").hidden = true;
    }

    function show() {
      header.hidden = false;
      [...document.querySelectorAll(".tabbar-wrapper")].forEach(
        (item) => (item.hidden = false)
      );
      document.querySelector(".mainbar").hidden = false;
      document.querySelector(".bookmark-bar").hidden = false;
      browser.classList.remove("address-top-off");
      browser.classList.add("address-top");
    }
  }
}, 1111);
