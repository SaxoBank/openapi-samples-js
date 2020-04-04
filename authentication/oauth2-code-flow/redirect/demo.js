/*jslint this: true, browser: true, for: true, long: true */
/*global window console run processError */

let code;
let tokenObject;

/**
 * If login failed, the error can be found as a query parameter.
 * @return {void}
 */
function checkErrors() {
    const name = "error";
    const regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
    const results = regex.exec(window.location.href);
    if (results === null) {
        document.getElementById("idResponse").innerText = "No error found";
    } else {
        document.getElementById("idResponse").innerText = "Found error: " + decodeURIComponent(results[1].replace(/\+/g, " "));
        // Get "error_description" to see what the problem was.
    }
}

/**
 * After a successful authentication, the code can be found as query parameter.
 * @return {void}
 */
function getCode() {
    const name = "code";
    const regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
    const results = regex.exec(window.location.href);
    code = (
        results === null
        ? ""
        : decodeURIComponent(results[1].replace(/\+/g, " "))
    );
    document.getElementById("idResponse").innerText = "Found code: " + code;
}

/**
 * After a successful authentication, the code can be exchanged for a token.
 * @return {void}
 */
function getToken() {
    fetch(
        "server-get-token.php",
        {
            "headers": {
                "Content-Type": "application/json; charset=utf-8",
                "Accept": "application/json; charset=utf-8"
            },
            "method": "POST",
            "body": JSON.stringify({
                "code": code
            })
        }
    ).then(function (response) {
        if (response.ok) {
            response.json().then(function (responseJson) {
                tokenObject = responseJson;
                document.getElementById("idResponse").innerText = JSON.stringify(responseJson);
            });
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

/**
 * After a successful authentication, the state entered before authentication is passed as query parameter.
 * @return {void}
 */
function getState() {
    // https://auth0.com/docs/protocols/oauth2/oauth-state
    const name = "state";
    const regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
    const results = regex.exec(window.location.href);
    const stateString = (
        results === null
        ? ""
        : window.atob(results[1].replace(/\+/g, " "))
    );
    try {
        document.getElementById("idResponse").innerText = "Found state: " + JSON.stringify(JSON.parse(stateString), null, 4);
    } catch (ignore) {
        console.error("State returned in the URL parameter is invalid.");
    }
}

/**
 * To prevent expiration of the token, request a new one before "refresh_token_expires_in".
 * @return {void}
 */
function refreshToken() {
    fetch(
        "server-refresh-token.php",
        {
            "headers": {
                "Content-Type": "application/json; charset=utf-8",
                "Accept": "application/json; charset=utf-8"
            },
            "method": "POST",
            "body": JSON.stringify({
                "refresh_token": tokenObject.refresh_token
            })
        }
    ).then(function (response) {
        if (response.ok) {
            response.json().then(function (responseJson) {
                tokenObject = responseJson;
                document.getElementById("idResponse").innerText = JSON.stringify(responseJson);
            });
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

(function () {
    document.getElementById("idBtnCheckErrors").addEventListener("click", function () {
        run(checkErrors);
    });
    document.getElementById("idBtnGetCode").addEventListener("click", function () {
        run(getCode);
    });
    document.getElementById("idBtnGetToken").addEventListener("click", function () {
        run(getToken);
    });
    document.getElementById("idBtnGetState").addEventListener("click", function () {
        run(getState);
    });
    document.getElementById("idBtnRefreshToken").addEventListener("click", function () {
        run(refreshToken);
    });
}());
