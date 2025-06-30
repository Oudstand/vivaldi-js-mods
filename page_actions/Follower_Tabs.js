/**
 * Opens links in a follower tab
 * Forum Link: https://forum.vivaldi.net/topic/31169/follower-tabs
 * Place at Vivaldi\Application\*version number*\resources\vivaldi\user_files
 */
function FollowerTab() {
    navigation.onnavigate = event => {
        event.preventDefault();
        window.open(event.destination.url, "followertab");
    }
    var linksArr=document.getElementsByTagName("a");
    for (i=0;i<linksArr.length;i++) {
        linksArr[i].setAttribute("target", "followertab");
    }
}
if (document.readyState==='complete') {
    FollowerTab();
} else {
    document.addEventListener('DOMContentLoaded', function() {
        FollowerTab();
    });
}