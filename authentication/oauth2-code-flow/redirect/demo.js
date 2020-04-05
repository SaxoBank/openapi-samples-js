/*jslint this: true, browser: true, for: true, long: true */
/*global window console URLSearchParams run processError apiUrl */

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
        document.getElementById("idResponse").innerText = "No error found";
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
        document.getElementById("idResponse").innerText = "Found code: " + decodeURIComponent(code);
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
        document.getElementById("idResponse").innerText = "No state found";
    } else {
        stateUnencoded = window.atob(state);
        try {
            document.getElementById("idResponse").innerText = "Found state: " + JSON.stringify(JSON.parse(stateUnencoded), null, 4);
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
        const accessTokenExpirationTime = new Date();
        if (response.ok) {
            response.json().then(function (responseJson) {
                tokenObject = responseJson;
                accessTokenExpirationTime.setSeconds(accessTokenExpirationTime.getSeconds() + tokenObject.expires_in);
                document.getElementById("idResponse").innerText = "Found access_token (valid until " + accessTokenExpirationTime.toLocaleString() + "): " + JSON.stringify(responseJson, null, 4);
            });
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

/**
 * Demonstrate a basic request to the Api, to show the token is valid.
 * @return {void}
 */
function getUserData() {
    fetch(
        apiUrl + "/port/v1/users/me",
        {
            "headers": {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": "Bearer " + tokenObject.access_token
            },
            "method": "GET"
        }
    ).then(function (response) {
        if (response.ok) {
            response.json().then(function (responseJson) {
                document.getElementById("idResponse").innerText = "Connection to API created, hello " + responseJson.Name;
            });
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
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
        const accessTokenExpirationTime = new Date();
        if (response.ok) {
            response.json().then(function (responseJson) {
                tokenObject = responseJson;
                accessTokenExpirationTime.setSeconds(accessTokenExpirationTime.getSeconds() + tokenObject.expires_in);
                document.getElementById("idResponse").innerText = "Found access_token (valid until " + accessTokenExpirationTime.toLocaleString() + "): " + JSON.stringify(responseJson, null, 4);
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
    document.getElementById("idBtnGetUserData").addEventListener("click", function () {
        run(getUserData);
    });
    document.getElementById("idBtnRefreshToken").addEventListener("click", function () {
        run(refreshToken);
    });
}());
