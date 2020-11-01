/*jslint this: true, browser: true, for: true, long: true */
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
        let url = demo.authUrl +
            "?client_id=" + document.getElementById("idEdtAppKey").value +
            "&response_type=code" +
            "&state=" + stateString +
            "&redirect_uri=" + encodeURIComponent(document.getElementById("idEdtRedirectUrl").value);
        if (document.getElementById("idCbxCulture").value !== "-") {
            url += "&lang=" + encodeURIComponent(document.getElementById("idCbxCulture").value);
        }
        document.getElementById("idResponse").innerHTML = "<h2>Follow this link to continue with step 2:</h2><a href=\"" + url + "\">" + url + "</a>";
    }

    document.getElementById("idBtnTestRedirectUrl").addEventListener("click", function () {
        demo.run([testRedirectUrl]);
    });
    document.getElementById("idBtnTestOpenApi").addEventListener("click", function () {
        demo.run([testOpenApi]);
    });
    document.getElementById("idBtnGenerateLink").addEventListener("click", function () {
        demo.run([generateLink]);
    });
}());
