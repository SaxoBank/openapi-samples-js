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
     * This can be used to validate your redirect configuration.
     * @return {void}
     */
    function testRedirectUrl() {
        const redirectUrl = document.getElementById("idEdtRedirectUrl").value;
        fetch(
            redirectUrl,
            {
                "method": "GET",
                "mode": "no-cors",
                "cache": "reload"
            }
        ).then(function () {
            console.log("Nice! The redirect page " + redirectUrl + " is available.");
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This can be used to validate your configuration. Because the API won't be down..
     * @return {void}
     */
    function testOpenApi() {
        // This is just an example on how to check if your config is correct.
        // Token/json is not required - this GET request can be done in a browser window as well.
        // The isalive endpoint is available for all service groups (like port, trade).
        fetch(
            demo.apiUrl + "/ref/isalive",
            {
                "method": "GET"
            }
        ).then(function (response) {
            if (response.ok) {
                response.text().then(function (responseText) {
                    console.log("The Api is available with message:\n" + responseText);
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

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
     * If login failed, the error can be found as a query parameter.
     * @return {void}
     */
    function generateLink() {
        // State contains a unique number, which must be stored in the client and compared with the incoming state after authentication
        // It is passed as base64 encoded string
        // https://auth0.com/docs/protocols/oauth2/oauth-state
        const stateString = window.btoa(JSON.stringify({
            // Token is a random number - other data can be added as well
            "csrfToken": createCsrfToken(),
            "state": document.getElementById("idEdtState").value
        }));
        const culture = document.getElementById("idCbxCulture").value;
        let url = demo.authUrl +
            "?client_id=" + encodeURIComponent(document.getElementById("idEdtAppKey").value) +
            "&response_type=code" +
            "&state=" + encodeURIComponent(stateString) +
            "&redirect_uri=" + encodeURIComponent(document.getElementById("idEdtRedirectUrl").value);
        if (culture !== "-") {
            url += "&lang=" + encodeURIComponent(culture);
        }
        document.getElementById("idResponse").innerHTML = "<h2>Follow this link to continue with step 2:</h2><a href=\"" + url + "\">" + url + "</a>";
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnTestRedirectUrl", "func": testRedirectUrl, "funcsToDisplay": [testRedirectUrl]},
        {"evt": "click", "elmId": "idBtnTestOpenApi", "func": testOpenApi, "funcsToDisplay": [testOpenApi]},
        {"evt": "click", "elmId": "idBtnGenerateLink", "func": generateLink, "funcsToDisplay": [generateLink]}
    ]);
}());
