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
     * This function generates a cryptographically strong random value.
     * https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues
     * @return {string} A 'real' random value
     */
    function getRandomValue() {
        const randomValues = new Uint32Array(1);
        window.crypto.getRandomValues(randomValues);
        return randomValues[0].toString();
    }

    /**
     * A CSRF (Cross Site Request Forgery) Token is a secret, unique and unpredictable value an application generates in order to protect CSRF vulnerable resources.
     * @return {string} The CSRF token
     */
    function createCsrfToken() {
        const csrfToken = getRandomValue();
        // Save the token to local storage, so after authentication this can be compared with the incoming token:
        try {
            window.localStorage.setItem("csrfToken", csrfToken);
        } catch (ignore) {
            console.error("Unable to remember token (LocalStorage not supported).");  // As an alternative, a cookie can be used
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
        const culture = document.getElementById("idCbxCulture").value;
        let url = demo.authUrl +
            "?client_id=" + encodeURIComponent(document.getElementById("idEdtAppKey").value) +
            "&response_type=token" +
            "&state=" + encodeURIComponent(stateString) +
            "&redirect_uri=" + encodeURIComponent(document.getElementById("idEdtRedirectUrl").value);
        if (culture !== "-") {
            url += "&lang=" + encodeURIComponent(culture);
        }
        document.getElementById("idResponse").innerHTML = "<h2>Follow this link to continue with step 2:</h2><a href=\"" + url + "\">" + url + "</a>";
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnGenerateLink", "func": generateLoginLink, "funcsToDisplay": [generateLoginLink]}
    ]);
}());
