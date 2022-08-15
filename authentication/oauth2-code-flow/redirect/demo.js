/*jslint this: true, browser: true, for: true, long: true, unordered: true */
/*global window console demonstrationHelper */

(function () {
    // Create a helper function to remove some boilerplate code from the example itself.
    const demo = demonstrationHelper({
        "responseElm": document.getElementById("idResponse"),
        "javaScriptElm": document.getElementById("idJavaScript"),
        "footerElm": document.getElementById("idFooter")
    });
    let code;
    let tokenObject;

    /**
     * If login failed, the error can be found as a query parameter.
     * @return {void}
     */
    function checkErrors() {
        const urlParams = new window.URLSearchParams(window.location.search);
        const error = urlParams.get("error");
        // Example: ?error=access_denied&error_description=Disclaimers+not+accepted+during+login.&state=eyJjc3Jm
        if (error === null) {
            console.log("No error found.");
        } else {
            console.error("Found error: " + error + " (" + urlParams.get("error_description") + ")");
        }
    }

    /**
     * After a successful authentication, the code can be found as query parameter.
     * @return {void}
     */
    function getCode() {
        const urlParams = new window.URLSearchParams(window.location.search);
        code = urlParams.get("code");
        if (code === null) {
            console.error("No code found!");
        } else {
            console.log("Found code: " + decodeURIComponent(code));
        }
    }

    /**
     * After a successful authentication, the csrf token in the state must be the expected one.
     * @return {Object} The object with the state.
     */
    function getStateObject() {
        // https://auth0.com/docs/protocols/oauth2/oauth-state
        const urlParams = new window.URLSearchParams(window.location.search);
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
     * After a successful authentication, the state entered before authentication is passed as query parameter.
     * @return {void}
     */
    function getState() {
        const stateObject = getStateObject();
        if (stateObject !== null) {
            console.log("Found state: " + JSON.stringify(stateObject, null, 4));
        }
    }

    /**
     * A CSRF (Cross Site Request Forgery) Token is a secret, unique and unpredictable value an application generates in order to protect CSRF vulnerable resources.
     * @return {void}
     */
    function verifyCsrfToken() {
        const receivedStateObject = getStateObject();
        const expectedCsrfToken = window.localStorage.getItem("csrfToken");
        if (expectedCsrfToken === null || receivedStateObject === null) {
            console.error("Something messed with the input data, because the csrfToken can't be verified.");
        } else if (receivedStateObject.csrfToken !== expectedCsrfToken) {
            console.error("The generated csrfToken (" + expectedCsrfToken + ") differs from the csrfToken in the response (" + receivedStateObject.csrfToken + ").\nThis can indicate a malicious request. Stop further processing and redirect back to the authentication.");
        } else {
            // All fine!
            console.log("This looks good. The csrfToken supplied in the response is the expected one.");
        }
    }

    /**
     * After a successful authentication, the code can be exchanged for a token. PHP is used in this example.
     * @return {void}
     */
    function getTokenPhp() {
        if (code === undefined) {
            console.error("Get a code first..");
            return;
        }
        fetch(
            "backend-php/server-get-token.php",
            {
                "method": "POST",
                "headers": {
                    "Content-Type": "application/json; charset=utf-8",
                    "Accept": "application/json; charset=utf-8"
                },
                "body": JSON.stringify({
                    "code": code
                })
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const accessTokenExpirationTime = new Date();
                    const refreshTokenExpirationTime = new Date();
                    tokenObject = responseJson;
                    accessTokenExpirationTime.setSeconds(accessTokenExpirationTime.getSeconds() + tokenObject.expires_in);
                    refreshTokenExpirationTime.setSeconds(refreshTokenExpirationTime.getSeconds() + tokenObject.refresh_token_expires_in);
                    // When you are late with exchanging the code for a token, the expires_in can be negative.
                    // This might not be an issue, the refresh_token is valid longer.
                    console.log("Found access_token (valid until " + accessTokenExpirationTime.toLocaleString() + ") and refresh_token (valid until " + refreshTokenExpirationTime.toLocaleString() + "): " + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * After a successful authentication, the code can be exchanged for a token. Node JS is used in this example.
     * @return {void}
     */
    function getTokenNodeJs() {
        if (code === undefined) {
            console.error("Get a code first..");
            return;
        }
        fetch(
            "server",
            {
                "method": "POST",
                "headers": {
                    "Content-Type": "application/json; charset=utf-8",
                    "Accept": "application/json; charset=utf-8"
                },
                "body": JSON.stringify({
                    "code": code
                })
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const accessTokenExpirationTime = new Date();
                    const refreshTokenExpirationTime = new Date();
                    tokenObject = responseJson;
                    accessTokenExpirationTime.setSeconds(accessTokenExpirationTime.getSeconds() + tokenObject.expires_in);
                    refreshTokenExpirationTime.setSeconds(refreshTokenExpirationTime.getSeconds() + tokenObject.refresh_token_expires_in);
                    // When you are late with exchanging the code for a token, the expires_in can be negative.
                    // This might not be an issue, the refresh_token is valid longer.
                    console.log("Found access_token (valid until " + accessTokenExpirationTime.toLocaleString() + ") and refresh_token (valid until " + refreshTokenExpirationTime.toLocaleString() + "): " + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * It is a good practice to remove the used code from the URL, to prevent (1) people sharing the link and (2) the app looks better without.
     * @return {void}
     */
    function hideCodeFromUrl() {
        window.history.replaceState(
            {},  // state
            "",  // unused
            window.location.pathname  // url
        );
        console.log("See URL. Removed the code flow parameters there.");
    }

    /**
     * Demonstrate a basic request to the Api, to show the token is valid.
     * @return {void}
     */
    function getUserData() {
        fetch(
            demo.apiUrl + "/port/v1/users/me",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + tokenObject.access_token
                }
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
     * To prevent expiration of the token, request a new one before "refresh_token_expires_in". PHP is used in this example.
     * @return {void}
     */
    function refreshTokenPhp() {
        if (tokenObject === undefined) {
            console.error("Get a token first..");
            return;
        }
        fetch(
            "backend-php/server-refresh-token.php",
            {
                "method": "POST",
                "headers": {
                    "Content-Type": "application/json; charset=utf-8",
                    "Accept": "application/json; charset=utf-8"
                },
                "body": JSON.stringify({
                    "refresh_token": tokenObject.refresh_token
                })
            }
        ).then(function (response) {
            const accessTokenExpirationTime = new Date();
            if (response.ok) {
                response.json().then(function (responseJson) {
                    tokenObject = responseJson;
                    accessTokenExpirationTime.setSeconds(accessTokenExpirationTime.getSeconds() + tokenObject.expires_in);
                    console.log("Found access_token (valid until " + accessTokenExpirationTime.toLocaleString() + "): " + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * To prevent expiration of the token, request a new one before "refresh_token_expires_in". Node JS is used in this example.
     * @return {void}
     */
    function refreshTokenNodeJs() {
        fetch(
            "server",
            {
                "method": "POST",
                "headers": {
                    "Content-Type": "application/json; charset=utf-8",
                    "Accept": "application/json; charset=utf-8"
                },
                "body": JSON.stringify({
                    "refresh_token": tokenObject.refresh_token
                })
            }
        ).then(function (response) {
            const accessTokenExpirationTime = new Date();
            if (response.ok) {
                response.json().then(function (responseJson) {
                    tokenObject = responseJson;
                    accessTokenExpirationTime.setSeconds(accessTokenExpirationTime.getSeconds() + tokenObject.expires_in);
                    console.log("Found access_token (valid until " + accessTokenExpirationTime.toLocaleString() + "): " + JSON.stringify(responseJson, null, 4));
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
        {"evt": "click", "elmId": "idBtnGetCode", "func": getCode, "funcsToDisplay": [getCode]},
        {"evt": "click", "elmId": "idBtnGetState", "func": getState, "funcsToDisplay": [getState, getStateObject]},
        {"evt": "click", "elmId": "idBtnVerifyCsrfToken", "func": verifyCsrfToken, "funcsToDisplay": [verifyCsrfToken]},
        {"evt": "click", "elmId": "idBtnGetTokenPhp", "func": getTokenPhp, "funcsToDisplay": [getTokenPhp]},
        {"evt": "click", "elmId": "idBtnGetTokenNodeJs", "func": getTokenNodeJs, "funcsToDisplay": [getTokenNodeJs]},
        {"evt": "click", "elmId": "idBtnHideCode", "func": hideCodeFromUrl, "funcsToDisplay": [hideCodeFromUrl]},
        {"evt": "click", "elmId": "idBtnGetUserData", "func": getUserData, "funcsToDisplay": [getUserData]},
        {"evt": "click", "elmId": "idBtnRefreshTokenPhp", "func": refreshTokenPhp, "funcsToDisplay": [refreshTokenPhp]},
        {"evt": "click", "elmId": "idBtnRefreshTokenNodeJs", "func": refreshTokenNodeJs, "funcsToDisplay": [refreshTokenNodeJs]}
    ]);
    demo.displayVersion("cs");
}());
