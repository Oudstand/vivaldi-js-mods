function addTabbarObserver(tabbar) {
    const toolbar = document.querySelector('.mainbar .toolbar-mainbar:last-of-type'),
        config = {attributes: true},
        observer = new MutationObserver(moveTabbar.bind(this, tabbar));
    observer.observe(toolbar, config);
}

function moveTabbar(tabbar) {
    let visibleToolbar = document.querySelector('.toolbar-mainbar.toolbar-visible'),
        target = visibleToolbar.querySelector('.UrlBar-AddressField') ?? visibleToolbar.childNodes[visibleToolbar.childNodes.length - 1];

    console.log('callback');
    target.after(tabbar);
}

setTimeout(function waitMergeTabbar() {
    const browser = document.getElementById('browser'),
        tabbar = document.querySelector('#tabs-tabbar-container');
    if (browser) {
        moveTabbar(tabbar);
        addTabbarObserver(tabbar);
    } else {
        setTimeout(waitMergeTabbar, 300);
    }
}, 300);