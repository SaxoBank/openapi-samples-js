/*jslint this: true, browser: true, for: true, long: true */
/*global window console demonstrationHelper */

(function () {
    // Create a helper function to remove some boilerplate code from the example itself.
    const demo = demonstrationHelper({
        "responseElm": document.getElementById("idResponse"),
        "javaScriptElm": document.getElementById("idJavaScript"),
        "footerElm": document.getElementById("idFooter")
    });

    function generateLoginLink() {
        // State contains a unique number, which must be stored in the client and compared with the incoming state after authentication
        // It is passed as base64 encoded string
        // https://auth0.com/docs/protocols/oauth2/oauth-state
        const stateString = window.btoa(JSON.stringify({
            // Token is a random number - other data can be added as well
            "csrfToken": Math.random(),
            "state": document.getElementById("idEdtState").value
        }));
        let url = "https://sim.logonvalidation.net/authorize" +
            "?client_id=" + document.getElementById("idEdtAppKey").value +
            "&response_type=token" +
            "&state=" + stateString +
            "&redirect_uri=" + encodeURIComponent(document.getElementById("idEdtRedirectUrl").value);
        if (document.getElementById("idCbxCulture").value !== "-") {
            url += "&lang=" + encodeURIComponent(document.getElementById("idCbxCulture").value);
        }
        document.getElementById("idResponse").innerHTML = "<h2>Follow this link to continue with step 2:</h2><a href=\"" + url + "\">" + url + "</a>";
    }

    document.getElementById("idBtnGenerateLink").addEventListener("click", function () {
        demo.run(generateLoginLink);
    });
}());
