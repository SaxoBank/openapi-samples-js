/*jslint this: true, browser: true, for: true, long: true */
/*global window console accountKey run processError apiUrl */

/**
 * Request the user information.
 * @return {void}
 */
function getUser() {
    fetch(
        apiUrl + "/port/v1/users/me",
        {
            "headers": {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": "Bearer " + document.getElementById("idBearerToken").value
            },
            "method": "GET"
        }
    ).then(function (response) {
        if (response.ok) {
            response.json().then(function (responseJson) {
                console.log("Found user info:\n\n" + JSON.stringify(responseJson, null, 4));
            });
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

/**
 * Request the accounts of this user.
 * @return {void}
 */
function getAccounts() {
    fetch(
        apiUrl + "/port/v1/accounts/me",
        {
            "headers": {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": "Bearer " + document.getElementById("idBearerToken").value
            },
            "method": "GET"
        }
    ).then(function (response) {
        if (response.ok) {
            response.json().then(function (responseJson) {
                console.log("Found " + responseJson.Data.length + " accounts for clientId " + clientId + ":\n\n" + JSON.stringify(responseJson, null, 4));
            });
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

(function () {
    document.getElementById("idBtnGetUser").addEventListener("click", function () {
        run(getUser);
    });
    document.getElementById("idBtnGetAccounts").addEventListener("click", function () {
        run(getAccounts);
    });
    document.getElementById("idBtnGetAccount").addEventListener("click", function () {
        run(getAccounts);
    });
    displayVersion("port");
}());
