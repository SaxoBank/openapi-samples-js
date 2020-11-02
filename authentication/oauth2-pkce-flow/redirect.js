/*jslint this: true, browser: true, for: true, long: true */
/*global window console URLSearchParams demonstrationHelper */

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
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get("error");
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
        const urlParams = new URLSearchParams(window.location.search);
        code = urlParams.get("code");
        if (code === null) {
            console.error("No code found!");
        } else {
            console.log("Found code: " + decodeURIComponent(code));
        }
    }

    /**
     * After a successful authentication, the state entered before authentication is passed as query parameter.
     * @return {void}
     */
    function getState() {
        // https://auth0.com/docs/protocols/oauth2/oauth-state
        const urlParams = new URLSearchParams(window.location.search);
        const state = urlParams.get("state");
        let stateUnencoded;
        if (state === null) {
            console.log("No state found");
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
     * After a successful authentication, the code can be exchanged for a token.
     * @return {void}
     */
    function getToken() {
        window.alert("This flow is for desktop apps and only here for demonstration purposes..\n\nTurn on F12 tools. Watch the token being send over the network (tab: Network - Response).\nHowever, due to CORS the token cannot be read via JavaScript.");
        fetch(
            "https://sim.logonvalidation.net/token",
            {
                "headers": {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json; charset=utf-8"
                },
                "method": "POST",
                "body": new URLSearchParams("grant_type=authorization_code&client_id=51cf2a12e7c048328158b0b1f171f9a7&code_verifier=" + document.getElementById("idCodeVerifier").value + "&code=" + code + "&redirect_uri=" + location.protocol + "//" + location.host + location.pathname)
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
        }).catch(function () {
            console.error("Due to CORS the response cannot be read with JavaScript. This flow is for desktop apps.");
        });
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnCheckErrors", "func": checkErrors, "funcsToDisplay": [checkErrors]},
        {"evt": "click", "elmId": "idBtnGetCode", "func": getCode, "funcsToDisplay": [getCode]},
        {"evt": "click", "elmId": "idBtnGetState", "func": getState, "funcsToDisplay": [getState]},
        {"evt": "click", "elmId": "idBtnGetToken", "func": getToken, "funcsToDisplay": [getToken]}
    ]);
    demo.displayVersion("cs");
}());
