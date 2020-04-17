/*jslint this: true, browser: true, for: true, long: true */
/*global window run */

/**
 * This can be used to validate your configuration. Because the API won't be down..
 * @return {void}
 */
function isApiAlive() {
    // This is just an example on how to check if your config is correct.
    // Token/json is not required - this GET request can be done in a browser window as well.
    // The isalive endpoint is available for all service groups (like port, trade).
    fetch(
        apiUrl + "/ref/isalive",
        {
            "method": "GET"
        }
    ).then(function (response) {
        if (response.ok) {
            response.text().then(function (responseText) {
                console.log(responseText);
            });
        } else {
            processError(response);
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
    let url = "https://sim.logonvalidation.net/authorize" +
        "?client_id=" + document.getElementById("idEdtAppKey").value +
        "&response_type=code" +
        "&state=" + stateString +
        "&redirect_uri=" + encodeURIComponent(document.getElementById("idEdtRedirectUrl").value);
    if (document.getElementById("idCbxCulture").value !== "-") {
        url += "&lang=" + encodeURIComponent(document.getElementById("idCbxCulture").value);
    }
    document.getElementById("idResponse").innerHTML = '<a href="' + url + '">' + url + "</a>";
}

(function () {
    document.getElementById("idBtnIsApiAlive").addEventListener("click", function () {
        run(isApiAlive);
    });
    document.getElementById("idBtnGenerateLink").addEventListener("click", function () {
        run(generateLink);
    });
}());
