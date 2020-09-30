/*jslint this: true, browser: true, for: true, long: true */
/*global console */

/*
 * boilerplate v1.16
 *
 * This script contains a set of helper functions for validating the token and populating the account selection.
 * Logging to the console is mirrored to the output in the examples.
 * For demonstration the code which is executed, is shown in the code output.
 * It also handles errors when the fetch fails. See https://saxobank.github.io/openapi-samples-js/error-handling/ for an explanation.
 *
 * The token is stored in the localeStorage, so it remains available after a page refresh.
 *
 * Suggestions? Comments? Reach us via Github or openapisupport@saxobank.com
 *
 */

/**
 * Init demo and return config and helper functions.
 * @param {Object} settings The required elements in the website.
 * @return {Object} Object with config, user object and helper functions.
 */
function demonstrationHelper(settings) {
    const apiHost = "gateway.saxobank.com";  // Shouldn't be changed. On Saxo internal dev environments this can be something like "stgo-tst216.cf.saxo"
    const apiPath = "/sim/openapi";  // On production this is "/openapi"
    const apiUrl = "https://" + apiHost + apiPath;
    const authUrl = "https://sim.logonvalidation.net/authorize";  // On production this is https://live.logonvalidation.net/authorize
    const implicitAppKeyDefaultAssetTypes = "e081be34791f4c7eac479b769b96d623";  // No need to create your own app, unless you want to test on a different environment than SIM
    const implicitAppKeyExtendedAssetTypes = "877130df4a954b60860088dc00d56bda";  // This app has Extended AssetTypes enabled - more info: https://saxobank.github.io/openapi-samples-js/instruments/extended-assettypes/
    const user = {};

    /**
     * Determine if the token edit exists.
     * @return {boolean} True if the field exists.
     */
    function tokenInputFieldExists() {
        return settings.hasOwnProperty("accessTokenElm") && settings.accessTokenElm !== undefined && settings.accessTokenElm !== null;
    }

    /**
     * Shared function to display an unsuccessful response.
     * @param {Response} errorObject The complete error object.
     * @param {string=} extraMessageToShow An optional extra message to display.
     * @return {void}
     */
    function processError(errorObject, extraMessageToShow) {
        let textToDisplay = "Error with status " + errorObject.status + " " + errorObject.statusText + (
            extraMessageToShow === undefined
            ? ""
            : "\n" + extraMessageToShow
        );
        // Some errors have a JSON-response, containing explanation of what went wrong.
        errorObject.json().then(function (errorObjectJson) {
            if (errorObjectJson.hasOwnProperty("ErrorInfo")) {
                // The 400 for orders might be wrapped in an ErrorInfo object (test an order placement without ManualOrder property)
                errorObjectJson = errorObjectJson.ErrorInfo;
            }
            if (errorObjectJson.hasOwnProperty("ErrorCode")) {
                textToDisplay += "\n" + errorObjectJson.ErrorCode + ": " + errorObjectJson.Message;
                if (errorObjectJson.hasOwnProperty("ModelState")) {
                    // Not all ErrorCodes contain a ModelState. See for the list:
                    // https://www.developer.saxo/openapi/learn/openapi-request-response
                    Object.keys(errorObjectJson.ModelState).forEach(function (key) {
                        textToDisplay += "\n" + key + ":\n - " + errorObjectJson.ModelState[key].join("\n - ");
                    });
                }
            }
            // Always log the correlation header, so Saxo can trace this id in the logging.
            textToDisplay += "\n\nX-Correlation header (for troubleshooting with Saxo): " + errorObject.headers.get("X-Correlation");
            console.error(textToDisplay);
        }).catch(function () {
            textToDisplay += "\n\nX-Correlation header (for troubleshooting with Saxo): " + errorObject.headers.get("X-Correlation");
            // Typically 401 (Unauthorized) has an empty response, this generates a SyntaxError.
            console.error(textToDisplay);
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
     * Show a function and run it.
     * @param {Function} functionToRun The function in scope.
     * @param {Function=} secondFunctionToDisplay An optional function to display besides the functionToRun.
     * @return {void}
     */
    function run(functionToRun, secondFunctionToDisplay) {

        /**
         * Add all allowed asset types for the default account to the selection.
         * @param {Array} legalAssetTypes The allowed asset types.
         * @return {void}
         */
        function populateAssetTypeSelection(legalAssetTypes) {
            let i;
            let option;
            if (settings.hasOwnProperty("assetTypesList") && settings.assetTypesList !== null) {
                // Select the asset types enabled for the default account
                for (i = settings.assetTypesList.options.length - 1; i >= 0; i -= 1) {
                    settings.assetTypesList.remove(i);
                }
                legalAssetTypes.sort();
                for (i = 0; i < legalAssetTypes.length; i += 1) {
                    option = document.createElement("option");
                    option.text = legalAssetTypes[i];
                    option.value = legalAssetTypes[i];
                    if (option.value === settings.selectedAssetType) {
                        option.setAttribute("selected", true);
                    }
                    settings.assetTypesList.add(option);
                }
            }
        }

        /**
         * Add all accounts of this client to the selection and activate an onChange handler.
         * @param {Array} accountsResponseData The list with accounts.
         * @return {void}
         */
        function populateAccountSelection(accountsResponseData) {
            const existingOptionGroups = settings.accountsList.getElementsByTagName("optgroup");
            let i;
            let account;
            let option;
            let optionGroup;
            let currentAccountGroupName = "";
            for (i = existingOptionGroups.length - 1; i >= 0; i -= 1) {
                settings.accountsList.removeChild(existingOptionGroups[i]);  // Remove optgroups, if any
            }
            for (i = settings.accountsList.options.length - 1; i >= 0; i -= 1) {
                settings.accountsList.remove(i);  // Remove options, if any
            }
            user.accountGroupKeys = [];
            groupAndSortAccountList(accountsResponseData);
            for (i = 0; i < accountsResponseData.length; i += 1) {
                account = accountsResponseData[i];
                // Inactive accounts are probably not in the response, but since this flag is served, we must consider it a possibility
                if (account.Active) {
                    option = document.createElement("option");
                    option.text = (
                        account.hasOwnProperty("DisplayName")
                        ? account.DisplayName + " "
                        : ""
                    ) + account.AccountId + " " + account.Currency;
                    option.value = account.AccountKey;
                    if (option.value === user.accountKey) {
                        option.setAttribute("selected", true);
                        populateAssetTypeSelection(account.LegalAssetTypes);
                    }
                    // If there are account groups, show the accounts in the right group(s)
                    if (account.hasOwnProperty("AccountGroupName") && account.AccountGroupName !== currentAccountGroupName) {
                        currentAccountGroupName = account.AccountGroupName;
                        optionGroup = document.createElement("optgroup");
                        optionGroup.label = currentAccountGroupName;
                        settings.accountsList.add(optionGroup);
                    }
                    settings.accountsList.add(option);
                    // Populate the account groups array as well
                    if (user.accountGroupKeys.indexOf(account.AccountGroupKey) === -1) {
                        user.accountGroupKeys.push(account.AccountGroupKey);
                    }
                }
            }
            settings.accountsList.dispatchEvent(new Event("change"));
            settings.accountsList.addEventListener("change", function () {
                user.accountKey = settings.accountsList.value;
                console.log("Using account " + user.accountKey);
            });
        }

        /**
         * Request the basic data from the Api using a batch request.
         * @return {void}
         */
        function getDataFromApi() {
            const requestTemplate = "--+\r\nContent-Type:application/http; msgtype=request\r\n\r\nGET " + apiPath + "/port/v1/{endpoint}/me HTTP/1.1\r\nX-Request-Id:{id}\r\nAccept-Language:en\r\nHost:" + apiHost + "\r\n\r\n\r\n";
            const request = requestTemplate.replace("{endpoint}", "users").replace("{id}", "1") + requestTemplate.replace("{endpoint}", "clients").replace("{id}", "2") + requestTemplate.replace("{endpoint}", "accounts").replace("{id}", "3") + "--+--\r\n";
            // This function uses a batch request to do three requests in one. See the example for more details: https://saxobank.github.io/openapi-samples-js/batch-request/
            fetch(
                apiUrl + "/port/batch",  // Grouping is done per service group, so "/ref" for example, goes in a different batch.
                {
                    "headers": {
                        "Content-Type": "multipart/mixed; boundary=\"+\"",
                        "Accept": "*/*",
                        "Accept-Language": "en, *;q=0.5",
                        "Authorization": "Bearer " + settings.accessTokenElm.value,
                        "Cache-Control": "no-cache"
                    },
                    "body": request,
                    "method": "POST"
                }
            ).then(function (response) {
                if (response.ok) {
                    settings.accessTokenElm.setCustomValidity("");
                    response.text().then(function (responseText) {
                        const responseArray = responseText.split("\n");
                        let lineNumber;
                        let line;
                        let requestId = "";
                        let responseJson;
                        for (lineNumber = 0; lineNumber < responseArray.length; lineNumber += 1) {
                            line = responseArray[lineNumber].trim();
                            if (line.substr(0, 13) === "X-Request-Id:") {
                                requestId = line.substr(13).trim();
                            } else if (line.charAt(0) === "{") {
                                try {
                                    responseJson = JSON.parse(line);
                                    switch (requestId) {
                                    case "1":  // Response of GET /users/me
                                        user.culture = responseJson.Culture;
                                        user.language = responseJson.Language;
                                        break;
                                    case "2":  // Response of GET /clients/me
                                        user.accountKey = responseJson.DefaultAccountKey;  // Select the default account
                                        user.clientKey = responseJson.ClientKey;
                                        user.name = responseJson.Name;
                                        break;
                                    case "3":  // Response of GET /accounts/me
                                        populateAccountSelection(responseJson.Data);
                                        break;
                                    }
                                } catch (error) {
                                    console.error(error);
                                }
                            }
                        }
                        settings.responseElm.innerText = "The token is valid - hello " + user.name + "\nClientKey: " + user.clientKey;
                        functionToRun();
                    });
                } else {
                    settings.accessTokenElm.setCustomValidity("Invalid access_token.");  // Indicate something is wrong with this input
                    processError(response);
                }
            }).catch(function (error) {
                settings.accessTokenElm.setCustomValidity("Invalid access_token.");
                console.error(error);
            });
        }

        // Display source of function, for demonstration:
        let source = functionToRun.toString();
        if (secondFunctionToDisplay !== undefined && secondFunctionToDisplay !== null) {
            source = secondFunctionToDisplay.toString() + "\n\n" + source;
        }
        settings.javaScriptElm.innerText = source;
        settings.responseElm.removeAttribute("style");  // Remove red background, if any.
        settings.responseElm.innerText = "Started function " + functionToRun.name + "()..";
        if (tokenInputFieldExists()) {
            if (settings.accessTokenElm.value.length < 10) {
                settings.accessTokenElm.setCustomValidity("Bearer token is required for requests.");
                console.error("Bearer token is required for requests.");
            } else {
                if (user.hasOwnProperty("accountKey")) {
                    functionToRun();
                } else {
                    // Not initialized yet. Request customer data in a batch.
                    getDataFromApi();
                }
            }
        } else {
            functionToRun();
        }
    }

    /**
     * Call the IsAlive endpoint without authentication, to show the API is up and which version is running.
     * @param {string} serviceGroup Specify service group, because every group has its own version.
     * @return {void}
     */
    function displayVersion(serviceGroup) {
        fetch(apiUrl + "/" + serviceGroup + "/Isalive", {}).then(function (response) {
            if (response.ok) {
                response.text().then(function (responseText) {
                    settings.footerElm.innerText = responseText;
                });
            }
        });
    }

    const tokenKey = "saxoBearerToken";

    function getSecondsUntilExpiry(token) {
        const now = new Date();
        let payload;
        try {
            // The JWT contains an header, payload and checksum
            // Payload is a base64 encoded JSON string
            payload = JSON.parse(window.atob(token.split(".")[1]));
            // An example about the different claims can be found here: authentication/token-explained/
            return Math.floor((payload.exp * 1000 - now.getTime()) / 1000);
        } catch (ignore) {
            return 0;
        }
    }

    /**
     * Remember token, so it can be reused after a page refresh.
     * @param {string} token The token to be saved.
     * @return {void}
     */
    function saveToken(token) {
        if (getSecondsUntilExpiry(token) > 0) {
            try {
                window.localStorage.setItem(tokenKey, token);
            } catch (ignore) {
                console.error("Unable to remember token (locale storage not supported).");
            }
        }
    }

    /**
     * When an error is logged to the console, show it in the Response-box as well.
     * @return {void}
     */
    function mirrorConsoleError() {
        console.errorCopy = console.error.bind(console);
        console.error = function (data) {
            settings.responseElm.setAttribute("style", "background-color: #e10c02; color: #ffffff;");
            settings.responseElm.innerText = data;
            console.errorCopy(data);  // ..and show message in the console as well.
        };
    }

    /**
     * When something is logged to the console, show it in the Response-box as well.
     * @return {void}
     */
    function mirrorConsoleLog() {
        console.logCopy = console.log.bind(console);
        console.log = function (data) {
            settings.responseElm.removeAttribute("style");  // Remove red background, if any.
            settings.responseElm.innerText = data;
            console.logCopy(data);  // ..and show message in the console as well.
        };
    }

    /**
     * Try to hunt down a previously used access_token, so a page refresh is less a hassle.
     * @return {void}
     */
    function tryToGetToken() {
        // First, maybe the token is supplied in the URL?
        const urlParams = new window.URLSearchParams(window.location.hash.replace("#", "?"));
        let urlWithoutParams = window.location.protocol + "//" + window.location.host + window.location.pathname;
        let newAccessToken = urlParams.get("access_token");
        let secondsUntilExpiry;
        if (newAccessToken === null) {
            // Second, maybe the token is stored before a refresh, or in a different sample?
            try {
                newAccessToken = window.localStorage.getItem(tokenKey);
            } catch (ignore) {
                if (window.location.protocol !== "file:") {
                    console.error("Locale storage (used to remember the token) fails in this browser.");
                }
            }
        } else {
            saveToken(newAccessToken);
        }
        secondsUntilExpiry = getSecondsUntilExpiry(newAccessToken);
        if (secondsUntilExpiry > 0) {
            settings.accessTokenElm.value = newAccessToken;
            console.debug("Bearer Token is valid for another " + secondsUntilExpiry + " seconds.");
        }
        if (urlWithoutParams.substring(0, 36) === "http://localhost/openapi-samples-js/" || urlWithoutParams.substring(0, 46) === "https://saxobank.github.io/openapi-samples-js/") {
            // We can probably use the Implicit Grant to get a token
            // Change the URL, to give the option to use Extended AssetTypes
            urlWithoutParams = authUrl + "?response_type=token&state=" + window.btoa(window.location.pathname) + "&redirect_uri=" + encodeURIComponent(window.location.protocol + "//" + window.location.host + "/openapi-samples-js/assets/html/redirect.html");
            if (settings.hasOwnProperty("isExtendedAssetTypesRequired") && settings.isExtendedAssetTypesRequired === true) {
                settings.retrieveTokenHref.parentElement.innerHTML = "Add token from <a href=\"" + urlWithoutParams + "&client_id=" + implicitAppKeyDefaultAssetTypes + "\" title=\"This app has default (soon legacy) asset types.\">default app</a> or <a href=\"" + urlWithoutParams + "&client_id=" + implicitAppKeyExtendedAssetTypes + "\" title=\"This app is configured to have extended asset types, like ETF and ETN.\">app with Extended AssetTypes</a> to the box below:";
            } else {
                settings.retrieveTokenHref.href = urlWithoutParams + "&client_id=" + implicitAppKeyDefaultAssetTypes;
                settings.retrieveTokenHref.target = "_self";  // Back to default
            }
        }
    }

    mirrorConsoleLog();
    mirrorConsoleError();
    if (tokenInputFieldExists() && Boolean(window.URLSearchParams)) {
        tryToGetToken();
        settings.accessTokenElm.addEventListener("change", function () {
            saveToken(settings.accessTokenElm.value);
        });
        settings.tokenValidateButton.addEventListener("click", function () {
            delete user.accountKey;
            run(function () {
                console.info("Token is valid!");
            });
        });
    }
    return Object.freeze({
        apiUrl,
        authUrl,
        user,
        displayVersion,
        run,
        processError,
        groupAndSortAccountList
    });
}
