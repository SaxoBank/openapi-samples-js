/*jslint this: true, browser: true, for: true, long: true, unordered: true */
/*global window console URLSearchParams history demonstrationHelper */

(function () {
    // Create a helper function to remove some boilerplate code from the example itself.
    const demo = demonstrationHelper({
        "responseElm": document.getElementById("idResponse"),
        "javaScriptElm": document.getElementById("idJavaScript"),
        "footerElm": document.getElementById("idFooter")
    });
    let pageDisplayTime = new Date();
    let accessToken;
    let iFrameForTokenRefresh = null;

    /**
     * If login failed, the error can be found as a bookmark.
     * @param {string} hash The hash part of the URL containing the auth result.
     * @return {void}
     */
    function hasErrors(hash) {
        const urlParams = new URLSearchParams(hash);
        const error = urlParams.get("error");
        if (error === null) {
            console.log("No error found.");
            return false;
        }
        console.error("Found error: " + error + " (" + urlParams.get("error_description") + ")");
        // The error "login_required" can mean the authentication cookie is expired, or, in case of Firefox, "Enhanced Tracking Protection" was set to "Strict".
        // The solution is to change this for the affected page: https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop?as=u#w_what-to-do-if-a-site-seems-broken
        // This must be done by the customer.
        return true;
    }

    /**
     * See if errors are returned by looking at the url.
     * @return {void}
     */
    function checkErrors() {
        hasErrors(window.location.hash.replace("#", "?"));
    }

    /**
     * After a successful authentication, the token can be found as bookmark.
     * @param {string} hash The hash part of the URL containing the auth result.
     * @return {void}
     */
    function processToken(hash) {
        // A bookmark (or anchor) is used, because the access_token doesn't leave the browser this way, so it doesn't end up in logfiles.
        const urlParams = new URLSearchParams(hash);
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
     * See if a token is returned by looking at the url.
     * @return {void}
     */
    function getToken() {
        processToken(window.location.hash.replace("#", "?"));
    }

    /**
     * It is a good practice to remove the token from the URL, to prevent people sharing the link and the app looks better without token.
     * @return {void}
     */
    function hideTokenFromUrl() {
        history.pushState(
            {},  // state
            "",  // unused
            window.location.pathname  // url
        );
        console.log("See the URL. The achor tag is hidden now.");
    }

    /**
     * After a successful authentication, the csrf token in the state must be the expected one.
     * @param {string} hash The hash part of the URL containing the auth result.
     * @return {Object} The object with the state.
     */
    function getStateObject(hash) {
        // https://auth0.com/docs/protocols/oauth2/oauth-state
        const urlParams = new URLSearchParams(hash);
        const state = urlParams.get("state");
        let stateUnencoded;
        let stateObject = null;
        if (state === null) {
            console.error("No state found - don't try to get the token, but redirect the user back to the authentication.");
        } else {
            try {
                stateUnencoded = window.atob(state);
                stateObject = JSON.parse(stateUnencoded);
            } catch (ignore) {
                console.error("State returned in the URL parameter is invalid.");
            }
        }
        return stateObject;
    }

    /**
     * After a successful authentication, the state entered before authentication is passed as bookmark.
     * @return {void}
     */
    function getState() {
        const stateObject = getStateObject(window.location.hash.replace("#", "?"));
        if (stateObject !== null) {
            console.log("Found state: " + JSON.stringify(stateObject, null, 4));
        }
    }

    /**
     * Compare the expected with retrieved CSRF token.
     * @param {string} hash The hash part of the URL containing the auth result.
     * @return {boolean} True when the CSRF token is expected.
     */
    function isCsrfTokenOk(hash) {
        const receivedStateObject = getStateObject(hash);
        const expectedCsrfToken = window.localStorage.getItem("csrfToken");
        if (expectedCsrfToken === null || receivedStateObject === null) {
            console.error("Something messed with the input data, because the csrfToken can't be verified.");
        } else if (receivedStateObject.csrfToken !== expectedCsrfToken) {
            console.error("The generated csrfToken (" + expectedCsrfToken + ") differs from the csrfToken in the response (" + receivedStateObject.csrfToken + ").\nThis can indicate a malicious request. Stop further processing and redirect back to the authentication.");
        } else {
            // All fine!
            console.log("This looks good. The csrfToken supplied in the response is the expected one.");
            return true;
        }
        return false;
    }

    /**
     * A CSRF (Cross Site Request Forgery) Token is a secret, unique and unpredictable value an application generates in order to protect CSRF vulnerable resources.
     * @return {void}
     */
    function verifyCsrfToken() {
        // On page load the token is retrieved from local storage. When creating it, it was saved there.
        isCsrfTokenOk(window.location.hash.replace("#", "?"));
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

    /**
     * Demonstrate how to refresh the token within the session time.
     * @return {void}
     */
    function refreshToken() {

        /**
         * Listen to messages broadcasted by the iframe.
         * @return {void}
         */
        function setupMessageReceiver() {
            window.addEventListener("message", function (event) {
                const expectedOrigin = window.location.protocol + "//" + window.location.host;
                if (event.origin !== expectedOrigin) {
                    console.error("Received a message from an unexpected origin: " + event.origin + " - expected: " + expectedOrigin);
                    return;
                }
                console.log("Incoming message from expected iframe: " + event.data);
                // If you are using Firefox with "Enhanced Tracking Protection" set to "Strict" then you get an error "login_required".
                // The solution is to change this for the affected page: https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop?as=u#w_what-to-do-if-a-site-seems-broken
                // This must be done by the customer.
                if (!hasErrors(event.data) && isCsrfTokenOk(event.data)) {
                    // No errors found. Is there a token?
                    processToken(event.data);
                }
            }, false);
        }

        /**
         * Create a hidden iframe which loads the refresh page and broadcasts the url hash.
         * @return {void}
         */
        function createIframe() {
            // Create an iframe which loads the token and broadcasts this to this page - but only once:
            iFrameForTokenRefresh = document.createElement("iframe");
            iFrameForTokenRefresh.style.display = "none";
            document.body.appendChild(iFrameForTokenRefresh);
        }

        /**
         * The redirect URL is on the same host, but the name is "refresh.html".
         * @return {Object} The object with the state.
         */
        function getRedirectUrl() {
            let result = window.location.href;
            const posOfHash = result.indexOf("#");
            if (posOfHash > -1) {
                result = result.substr(0, posOfHash);
            }
            return result.replace("redirect.html", "refresh.html");
        }

        /**
         * Create a link to the OAuth2 server, including the client_id of the app, a state and the flow.
         * @return {void}
         */
        function generateRefreshLink() {
            // State contains a unique number, which must be stored in the client and compared with the incoming state after authentication
            // It is passed as base64 encoded string
            // https://auth0.com/docs/protocols/oauth2/oauth-state
            const csrfToken = Math.random() + "-refresh";
            const stateString = window.btoa(JSON.stringify({
                // Token is a random number - other data can be added as well
                "csrfToken": csrfToken,
                "state": "MyRefreshExample"
            }));
            window.localStorage.setItem("csrfToken", csrfToken);  // Save it for verification..
            let url = demo.authUrl +
                "?client_id=1a6eb56ced7c4e04b1467e7e9be9bff7" +
                "&response_type=token" +
                "&prompt=none" +  // This token prevents putting an x-frame-options header to "deny" by the server, so it can be loaded into a frame
                "&state=" + stateString +
                "&redirect_uri=" + encodeURIComponent(getRedirectUrl());
            return url;
        }

        if (iFrameForTokenRefresh === null) {
            setupMessageReceiver();
            createIframe();
        }
        iFrameForTokenRefresh.setAttribute("src", generateRefreshLink());
        pageDisplayTime = new Date();
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnCheckErrors", "func": checkErrors, "funcsToDisplay": [checkErrors, hasErrors]},
        {"evt": "click", "elmId": "idBtnGetState", "func": getState, "funcsToDisplay": [getState, getStateObject]},
        {"evt": "click", "elmId": "idBtnVerifyCsrfToken", "func": verifyCsrfToken, "funcsToDisplay": [verifyCsrfToken]},
        {"evt": "click", "elmId": "idBtnGetToken", "func": getToken, "funcsToDisplay": [getToken, processToken]},
        {"evt": "click", "elmId": "idBtnHideToken", "func": hideTokenFromUrl, "funcsToDisplay": [hideTokenFromUrl]},
        {"evt": "click", "elmId": "idBtnGetUserData", "func": getUserData, "funcsToDisplay": [getUserData]},
        {"evt": "click", "elmId": "idBtnRefreshToken", "func": refreshToken, "funcsToDisplay": [refreshToken]}
    ]);
    demo.displayVersion("cs");
}());
