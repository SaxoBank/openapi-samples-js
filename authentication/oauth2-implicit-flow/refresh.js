/*jslint this: true, browser: true, for: true, long: true */
/*global window console */

(function () {

    function broadcastRefreshToken() {
        const targetOrigin = window.location.protocol + "//" + window.location.host;  // Same site
        const hash = window.location.hash.replace("#", "?");
        console.log("Broadcasting result of auth: " + hash);
        window.parent.postMessage(hash, targetOrigin);
    }

    broadcastRefreshToken();

}());
