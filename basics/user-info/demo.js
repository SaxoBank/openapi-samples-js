/*jslint this: true, browser: true, for: true, long: true */
/*global window console user run processError apiUrl displayVersion */

/**
 * Request the user information.
 * @return {void}
 */
function getUser() {
    fetch(
        apiUrl + "/port/v1/users/me",
        {
            "method": "GET",
            "headers": {
                "Authorization": "Bearer " + document.getElementById("idBearerToken").value
            }
        }
    ).then(function (response) {
        const req = "\n\nRequest:\nGET " + response.url + " status " + response.status + " " + response.statusText;
        if (response.ok) {
            response.json().then(function (responseJson) {
                // Times are in UTC. Convert them to local time:
                const lastLoginDate = new Date(responseJson.LastLoginTime).toLocaleString();
                const rep = "\n\nResponse: " + JSON.stringify(responseJson, null, 4);
                console.log("Found user with clientKey " + responseJson.ClientKey + " (required for other requests).\nLast login @ " + lastLoginDate + "." + req + rep);
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
            "method": "GET",
            "headers": {
                "Authorization": "Bearer " + document.getElementById("idBearerToken").value
            }
        }
    ).then(function (response) {
        const req = "\n\nRequest:\nGET " + response.url + " status " + response.status + " " + response.statusText;
        if (response.ok) {
            response.json().then(function (responseJson) {
                const rep = "\n\nResponse: " + JSON.stringify(responseJson, null, 4);
                let accountKeys = [];
                let i;
                for (i = 0; i < responseJson.Data.length; i += 1) {
                    // Loop through the data and collect the accountKeys:
                    accountKeys.push(responseJson.Data[i].AccountId + " - " + responseJson.Data[i].AccountKey);
                }
                console.log("Found " + responseJson.Data.length + " account(s) with accountKey(s):\n" + accountKeys.join("\n") + req + rep);
            });
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

/**
 * Request the balance for the selected account.
 * @return {void}
 */
function getBalance() {
    fetch(
        apiUrl + "/port/v1/balances?ClientKey=" + encodeURIComponent(user.clientKey) + "&AccountKey=" + encodeURIComponent(user.accountKey),
        {
            "method": "GET",
            "headers": {
                "Authorization": "Bearer " + document.getElementById("idBearerToken").value
            }
        }
    ).then(function (response) {
        const req = "\n\nRequest:\nGET " + response.url + " status " + response.status + " " + response.statusText;
        if (response.ok) {
            response.json().then(function (responseJson) {
                const rep = "\n\nResponse: " + JSON.stringify(responseJson, null, 4);
                // Show a value in account currency and decimals:
                const cash = responseJson.Currency + " " + responseJson.TotalValue.toFixed(responseJson.CurrencyDecimals);
                console.log("The selected account has a total balance of " + cash + "." + req + rep);
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
    document.getElementById("idBtnGetBalance").addEventListener("click", function () {
        run(getBalance);
    });
    displayVersion("port");
}());
