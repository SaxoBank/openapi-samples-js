/*jslint this: true, browser: true, for: true, long: true */
/*global window console demonstrationHelper */

(function () {
    // Create a helper function to remove some boilerplate code from the example itself.
    const demo = demonstrationHelper({
        "isExtendedAssetTypesRequired": true,  // Adds link to app with Extended AssetTypes
        "responseElm": document.getElementById("idResponse"),
        "javaScriptElm": document.getElementById("idJavaScript"),
        "accessTokenElm": document.getElementById("idBearerToken"),
        "retrieveTokenHref": document.getElementById("idHrefRetrieveToken"),
        "tokenValidateButton": document.getElementById("idBtnValidate"),
        "accountsList": document.getElementById("idCbxAccount"),
        "footerElm": document.getElementById("idFooter")
    });

    /**
     * Request the user information.
     * @return {void}
     */
    function getUser() {
        fetch(
            demo.apiUrl + "/port/v1/users/me",
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
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Request the client information.
     * @return {void}
     */
    function getClient() {
        fetch(
            demo.apiUrl + "/port/v1/clients/me",
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
                    // The default account can be used for the initial population of the screen.
                    console.log("Found client with default accountKey " + responseJson.DefaultAccountKey + "." + req + rep);
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * For a good display, the list of accounts must be grouped by type, and sorted by valuta.
     * @param {Array} accounts The account list from the response.
     * @return {void}
     */
    function groupAndSortAccountList(accounts) {
        accounts.sort(function (x, y) {

            function getAccountGroupDisplayNameForSorting(account) {
                let result = (
                    account.AccountType === "Normal"
                    ? "1"  // Normal account before special ones like TaxFavoredAccount
                    : "2"
                );
                if (account.hasOwnProperty("AccountGroupName")) {  // Group by AccountGroupName
                    result += account.AccountGroupName;
                }
                if (account.hasOwnProperty("DisplayName")) {  // Sort by DisplayName, or AccountId if DisplayName is not available
                    result += account.DisplayName + account.Currency;
                }
                return result + account.AccountId;  // This one is always there
            }

            const descX = getAccountGroupDisplayNameForSorting(x);
            const descY = getAccountGroupDisplayNameForSorting(y);
            if (descX < descY) {
                return -1;
            }
            if (descX > descY) {
                return 1;
            }
            return 0;
        });
    }

    /**
     * Request the accounts of this user.
     * @return {void}
     */
    function getAccounts() {
        fetch(
            demo.apiUrl + "/port/v1/accounts/me",
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
                    let textToDisplay = "";
                    let currentAccountGroupName = "";
                    let account;
                    let i;
                    groupAndSortAccountList(responseJson.Data);
                    for (i = 0; i < responseJson.Data.length; i += 1) {
                        account = responseJson.Data[i];
                        // Loop through the data and collect the accountKeys:
                        if (account.hasOwnProperty("AccountGroupName") && account.AccountGroupName !== currentAccountGroupName) {
                            currentAccountGroupName = account.AccountGroupName;
                            textToDisplay += currentAccountGroupName + ":\n";
                        }
                        textToDisplay += (
                            account.AccountKey === demo.user.accountKey  // Make the default account bold or something..
                            ? "** "
                            : " - "
                        );
                        if (account.hasOwnProperty("DisplayName")) {
                            textToDisplay += account.DisplayName + " " + account.Currency;
                        } else {
                            textToDisplay += account.AccountId;
                        }
                        textToDisplay += " - " + account.AccountKey + " (" + account.AccountType + ")\n";
                    }
                    console.log("Found " + responseJson.Data.length + " account(s) with accountKey(s):\n" + textToDisplay + req + rep);
                });
            } else {
                demo.processError(response);
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
            demo.apiUrl + "/port/v1/balances?ClientKey=" + encodeURIComponent(demo.user.clientKey) + "&AccountKey=" + encodeURIComponent(demo.user.accountKey),
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
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    document.getElementById("idBtnGetUser").addEventListener("click", function () {
        demo.run(getUser);
    });
    document.getElementById("idBtnGetClient").addEventListener("click", function () {
        demo.run(getClient);
    });
    document.getElementById("idBtnGetAccounts").addEventListener("click", function () {
        demo.run(getAccounts, groupAndSortAccountList);
    });
    document.getElementById("idBtnGetBalance").addEventListener("click", function () {
        demo.run(getBalance);
    });
    demo.displayVersion("port");
}());
