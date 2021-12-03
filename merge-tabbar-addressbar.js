/*
    adjusts the padding of the tabs container to the extensions if the number of visible extension changes
*/
setTimeout(function waitMergeTabbar() {
    const browser = document.getElementById('browser');
    if (browser) {
        observeExtensionsWidth();
    } else {
        setTimeout(waitMergeTabbar, 300);
    }
}, 300);

function observeExtensionsWidth() {
    let toolbarExtensions = document.querySelector('.toolbar-extensions');
    if (!toolbarExtensions) {
        setTimeout(observeExtensionsWidth, 300);
        return;
    }
    let tabsContainer = document.querySelector('#tabs-container.top'),
        resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                tabsContainer.style.paddingRight = (entry.target.offsetWidth + 137) + 'px';
            }
        });
    resizeObserver.observe(toolbarExtensions);
}