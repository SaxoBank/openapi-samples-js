/*jslint this: true, browser: true, for: true, long: true */
/*global window console URLSearchParams demonstrationHelper */

(function () {
    // Create a helper function to remove some boilerplate code from the example itself.
    const demo = demonstrationHelper({
        "responseElm": document.getElementById("idResponse"),
        "javaScriptElm": document.getElementById("idJavaScript"),
        "footerElm": document.getElementById("idFooter")
    });
    let accessToken;
    const pageDisplayTime = new Date();

    /**
     * If login failed, the error can be found as a bookmark.
     * @return {void}
     */
    function checkErrors() {
        const urlParams = new URLSearchParams(window.location.hash.replace("#", "?"));
        const error = urlParams.get("error");
        if (error === null) {
            console.log("No error found.");
        } else {
            console.error("Found error: " + error + " (" + urlParams.get("error_description") + ")");
        }
    }

    /**
     * After a successful authentication, the token can be found as bookmark.
     * @return {void}
     */
    function getToken() {
        // A bookmark (or anchor) is used, because the access_token doesn't leave the browser this way, so it doesn't end up in logfiles.
        const urlParams = new URLSearchParams(window.location.hash.replace("#", "?"));
        const expiresInSeconds = urlParams.get("expires_in");  // Note that this doesn't work when the page is refreshed. To be sure, use a cookie, or sessionStorage
        const accessTokenExpirationTime = new Date(pageDisplayTime.getTime() + expiresInSeconds * 1000);
        accessToken = urlParams.get("access_token");
        if (accessToken === null) {
            console.error("Not a valid token supplied via the query parameters of the URL.");
        } else {
            console.log("Found access_token (valid until " + accessTokenExpirationTime.toLocaleString() + ").\nOnly use this token for API requests, don't send it to a backend, for security reasons:\n" + decodeURIComponent(accessToken));
        }
    }

    /**
     * After a successful authentication, the state entered before authentication is passed as bookmark.
     * @return {void}
     */
    function getState() {
        // https://auth0.com/docs/protocols/oauth2/oauth-state
        const urlParams = new URLSearchParams(window.location.hash.replace("#", "?"));
        const state = urlParams.get("state");
        let stateUnencoded;
        if (state === null) {
            console.log("No state found.");
        } else {
            stateUnencoded = window.atob(state);
            try {
                console.log("Found state: " + JSON.stringify(JSON.parse(stateUnencoded), null, 4));
            } catch (ignore) {
                console.error("State returned in the URL parameter is invalid.");
            }
        }
    }

    /**
     * Demonstrate a basic request to the Api, to show the token is valid.
     * @return {void}
     */
    function getUserData() {
        fetch(
            demo.apiUrl + "/port/v1/users/me",
            {
                "headers": {
                    "Content-Type": "application/json; charset=utf-8",
                    "Authorization": "Bearer " + accessToken
                },
                "method": "GET"
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    console.log("Connection to API created, hello " + responseJson.Name);
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnCheckErrors", "func": checkErrors, "funcsToDisplay": [checkErrors]},
        {"evt": "click", "elmId": "idBtnGetToken", "func": getToken, "funcsToDisplay": [getToken]},
        {"evt": "click", "elmId": "idBtnGetState", "func": getState, "funcsToDisplay": [getState]},
        {"evt": "click", "elmId": "idBtnGetUserData", "func": getUserData, "funcsToDisplay": [getUserData]}
    ]);
    demo.displayVersion("cs");
}());
