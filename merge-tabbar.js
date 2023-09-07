
function addTabbarObserver(tabbar){
    const toolbar = document.querySelector('.mainbar .toolbar-mainbar:last-of-type');
    const config = {attributes: true};


    // const mainbar = document.querySelector('.mainbar');
    // const tabbar = document.querySelector('#tabs-tabbar-container');

    // if(!mainbar || !tabbar) {
    //     setTimeout(() => addTabbarObserver(), 300);
    //     console.log('nope');
    //     return;
    // }

    //const config = {
      //  childList: true,
        //subtree: true
    //};


    const observer = new MutationObserver(moveTabbar.bind(this, tabbar));
    observer.observe(toolbar, config);

    // urlBar = document.querySelector('.UrlBar-AddressField');
    // tabs = document.querySelector('#tabs-tabbar-container');
    // urlBar.after(tabs);
}

function moveTabbar(tabbar) {
    let visibleToolbar = document.querySelector('.toolbar-mainbar.toolbar-visible');
    let target = visibleToolbar.querySelector('.UrlBar-AddressField') ?? visibleToolbar.childNodes[visibleToolbar.childNodes.length - 1];
    // let tabbar = document.querySelector('#tabs-tabbar-container');

    console.log('callback');
    target.after(tabbar);
};

setTimeout(function waitMergeTabbar() {
    const browser = document.getElementById('browser');
    const tabbar = document.querySelector('#tabs-tabbar-container');
    if (browser) {
        moveTabbar(tabbar);
        addTabbarObserver(tabbar);
    } else {
        setTimeout(waitMergeTabbar, 300);
    }
}, 300);
