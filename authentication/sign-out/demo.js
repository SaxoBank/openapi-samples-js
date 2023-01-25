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
     * If login failed, the error can be found as a query parameter.
     * @return {void}
     */
    function generateLink() {
        const culture = document.getElementById("idCbxCulture").value;
        const redirectUrl = document.getElementById("idEdtRedirectUrl").value;
        let url = demo.logoutUrl + "?signout=true";
        if (culture !== "-") {
            url += "&lang=" + encodeURIComponent(culture);
        }
        if (redirectUrl !== "") {
            url += "&post_logout_redirect_uri=" + encodeURIComponent(redirectUrl);
        }
        document.getElementById("idResponse").innerHTML = "<h2>Follow this link to logoff:</h2><a href=\"" + url + "\">" + url + "</a>";
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnGenerateLink", "func": generateLink, "funcsToDisplay": [generateLink]}
    ]);
}());
