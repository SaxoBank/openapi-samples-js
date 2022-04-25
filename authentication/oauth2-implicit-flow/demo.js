/*jslint this: true, browser: true, for: true, long: true, unordered: true */
/*global window console demonstrationHelper */

(function () {
    // Create a helper function to remove some boilerplate code from the example itself.
    const demo = demonstrationHelper({
        "responseElm": document.getElementById("idResponse"),
        "javaScriptElm": document.getElementById("idJavaScript"),
        "footerElm": document.getElementById("idFooter")
    });

    /**
     * A CSRF (Cross Site Request Forgery) Token is a secret, unique and unpredictable value an application generates in order to protect CSRF vulnerable resources.
     * @return {string} The CSRF token
     */
    function createCsrfToken() {
        const csrfToken = Math.random() + "-sample";
        // Save the token to local storage, so after authentication this can be compared with the incoming token:
        try {
            window.localStorage.setItem("csrfToken", csrfToken);
        } catch (ignore) {
            console.error("Unable to remember token (LocalStorage not supported).");
        }
        return csrfToken;
    }

    /**
     * Create a link to the OAuth2 server, including the client_id of the app, a state and the flow.
     * @return {void}
     */
    function generateLoginLink() {
        // State contains a unique number, which must be stored by the client and compared with the incoming state after authentication
        // It is passed as base64 encoded string
        // https://auth0.com/docs/protocols/oauth2/oauth-state
        const csrfToken = createCsrfToken();
        const stateString = window.btoa(JSON.stringify({
            // Token is a random number - other data can be added as well
            "csrfToken": csrfToken,
            "state": document.getElementById("idEdtState").value
        }));
        let url = demo.authUrl +
            "?client_id=" + document.getElementById("idEdtAppKey").value +
            "&response_type=token" +
            "&state=" + stateString +
            "&redirect_uri=" + encodeURIComponent(document.getElementById("idEdtRedirectUrl").value);
        if (document.getElementById("idCbxCulture").value !== "-") {
            url += "&lang=" + encodeURIComponent(document.getElementById("idCbxCulture").value);
        }
        document.getElementById("idResponse").innerHTML = "<h2>Follow this link to continue with step 2:</h2><a href=\"" + url + "\">" + url + "</a>";
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnGenerateLink", "func": generateLoginLink, "funcsToDisplay": [generateLoginLink]}
    ]);
}());
