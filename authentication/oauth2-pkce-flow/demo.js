/*jslint this: true, browser: true, for: true, long: true, unordered: true */
/*global window console demonstrationHelper CryptoJS */

(function () {
    // Create a helper function to remove some boilerplate code from the example itself.
    const demo = demonstrationHelper({
        "responseElm": document.getElementById("idResponse"),
        "javaScriptElm": document.getElementById("idJavaScript"),
        "footerElm": document.getElementById("idFooter")
    });
    let codeVerifier;
    let codeChallenge;

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
     * Generate a verifier.
     * @return {void}
     */
    function generateCodeVerifier() {

        function base64UrlEncode(str) {
            return str.toString(CryptoJS.enc.Base64).replace(/\+/g, "-").replace(/\//g, "_").replace(/\=/g, "");
        }

        const allowedChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let i;
        codeVerifier = "";
        for (i = 0; i < 32; i += 1) {
            codeVerifier += allowedChars.charAt(Math.floor(Math.random() * allowedChars.length));
        }
        codeVerifier = base64UrlEncode(codeVerifier);
        codeChallenge = base64UrlEncode(CryptoJS.SHA256(codeVerifier));
        console.log("Verifier: " + codeVerifier + "\nChallenge: " + codeChallenge);
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
            "csrfToken": Math.random(),
            "state": document.getElementById("idEdtState").value
        }));
        const culture = document.getElementById("idCbxCulture").value;
        let url = demo.authUrl +
            "?client_id=" + encodeURIComponent(document.getElementById("idEdtAppKey").value) +
            "&response_type=code" +
            "&code_challenge=" + codeChallenge +
            "&code_challenge_method=S256" +
            "&state=" + encodeURIComponent(stateString) +
            "&redirect_uri=" + encodeURIComponent(document.getElementById("idEdtRedirectUrl").value);
        if (culture !== "-") {
            url += "&lang=" + encodeURIComponent(culture);
        }
        document.getElementById("idResponse").innerHTML = "<h2>Follow this link to continue with step 2:</h2><a href=\"" + url + "\" target=\"_blank\">" + url + "</a><br /><br />Remember the verifier: " + codeVerifier;
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnTestRedirectUrl", "func": testRedirectUrl, "funcsToDisplay": [testRedirectUrl]},
        {"evt": "click", "elmId": "idBtnGenerateCodeVerifier", "func": generateCodeVerifier, "funcsToDisplay": [generateCodeVerifier]},
        {"evt": "click", "elmId": "idBtnGenerateLink", "func": generateLink, "funcsToDisplay": [generateLink]}
    ]);
}());
