/*jslint this: true, browser: true, for: true, long: true */
/*global window console run */

let accessToken;

/**
 * If login failed, the error can be found as a query parameter.
 * @return {void}
 */
function checkErrors() {
    const urlParams = new URLSearchParams(window.location.hash.replace("#", "?"));
    const error = urlParams.get("error");
    if (error === null) {
        document.getElementById("idResponse").innerText = "No error found";
    } else {
        console.error("Found error: " + error + " (" + urlParams.get("error_description") + ")");
    }
}

/**
 * After a successful authentication, the token can be found as query parameter.
 * @return {void}
 */
function getToken() {
    const urlParams = new URLSearchParams(window.location.hash.replace("#", "?"));
    access_token = urlParams.get("access_token");
    document.getElementById("idResponse").innerText = "Found access_token: " + decodeURIComponent(access_token);
}

/**
 * After a successful authentication, the state entered before authentication is passed as query parameter.
 * @return {void}
 */
function getState() {
    // https://auth0.com/docs/protocols/oauth2/oauth-state
    const urlParams = new URLSearchParams(window.location.hash.replace("#", "?"));
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

function getUserData() {
    fetch(
        apiUrl + "/port/v1/users/me",
        {
            "headers": {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": "Bearer " + access_token
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

(function () {
    document.getElementById("idBtnCheckErrors").addEventListener("click", function () {
        run(checkErrors);
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
}());
