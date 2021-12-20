/*jslint browser: true, for: true, long: true, unordered: true */
/*global console */

/*
 * boilerplate v1.28
 *
 * This script contains a set of helper functions for validating the token and populating the account selection.
 * Logging to the console is mirrored to the output in the examples.
 * The source code which is executed, is listed in the code output.
 * It also handles errors when the fetch fails. See https://saxobank.github.io/openapi-samples-js/error-handling/ for an explanation.
 *
 * This page can be downloaded and loaded via http://localhost/openapi-samples-js/basics/user-info/ or file:///C:/Repos/openapi-samples-js/basics/user-info/index.html
 * Running on production is done by adding the query parameter ?env=live (Use at Your Own Risk!).
 *
 * The token is stored in the localStorage, so it remains available after a page refresh.
 *
 * Suggestions? Comments? Reach us via Github or OpenApiSupport@saxobank.com
 *
 */

/**
 * Init demo and return config and helper functions.
 * @param {Object} settings The required elements in the website.
 * @return {Object} Object with config, user object and helper functions.
 */
function demonstrationHelper(settings) {
    // https://www.developer.saxo/openapi/learn/environments
    const configSim = {
        "grantType": "token",  // Implicit Flow. With some changes the Authorization Code Flow (grantType code) can be used
        "env": "sim",  // The SaxoTraderGO app for Simulation can be found here: https://www.saxotrader.com/sim/ (Developer Portal https://www.developer.saxo/openapi/ and https://developer.saxobank.com/openapi/ from China)
        "authUrl": "https://sim.logonvalidation.net/authorize",
        "redirectUrl": window.location.protocol + "//" + window.location.host + "/openapi-samples-js/assets/html/redirect.html",
        "apiHost": "gateway.saxobank.com",
        "apiPath": "/sim/openapi",  // SIM - Change to "/openapi" when using a Live token
        "streamerUrl": "wss://streaming.saxobank.com/sim/openapi/streamingws/connect",
        // App management: https://www.developer.saxo/openapi/appmanagement#/
        "appKey": "1a6eb56ced7c4e04b1467e7e9be9bff7"  // This is the OAuth2 client_id - no need to create your own app, unless you want to use a different redirect URL
        // "appKey": "7194692c30db42efb2c675c6c0fb2a67"  // This app is on Legacy AssetTypes, the default before November 2021 - more info: https://saxobank.github.io/openapi-samples-js/instruments/extended-assettypes/
        // "appKey": "67625f8ca809446aa10b08d6eae2c7ab"  // This app has no trading rights - use this to test how it behaves when ordering
    };
    const configLive = {
        // Using "Live" for testing the samples is a risk. Use it with care!
        "grantType": "token",  // Implicit Flow. With some changes the Authorization Code Flow (grantType code) can be used
        "env": "live",  // The SaxoTraderGO app for Live can be found here: https://www.saxotrader.com/
        "authUrl": "https://live.logonvalidation.net/authorize",
        "redirectUrl": window.location.protocol + "//" + window.location.host + "/openapi-samples-js/assets/html/redirect.html",
        "apiHost": "gateway.saxobank.com",
        "apiPath": "/openapi",
        "streamerUrl": "wss://streaming.saxobank.com/openapi/streamingws/connect",
        "appKey": "4995383fd4b344e588eb784a7c666835"  // This is the OAuth2 client_id - no need to create your own app, unless you want to use a different redirect URL
        // "appKey": "ae84ff08844e40d9a7e546bb1c4bdeb7"  // This app is on Legacy AssetTypes, the default before November 2021 - more info: https://saxobank.github.io/openapi-samples-js/instruments/extended-assettypes/
    };
    const configDte231 = {
        "grantType": "token",  // Implicit Flow. With some changes the Authorization Code Flow (grantType code) can be used
        "env": "dte231",  // The SaxoTraderGO app for this DTE environment can be found here: https://stgo-tst231.cf.saxo/ (Developer Portal https://developerportal-tst231.cf.saxo/openapi/)
        "authUrl": "https://sso-tst231.cf.saxo/authorize",
        "redirectUrl": window.location.protocol + "//" + window.location.host + "/openapi-samples-js/assets/html/redirect.html",
        "apiHost": "stgo-tst231.cf.saxo",
        "apiPath": "/openapi",
        "streamerUrl": "wss://stgo-tst231.cf.saxo/openapi/streamingws/connect",  // On staging this is wss://blue.openapi.sys.dom/openapi/streamingws/connect
        "appKey": "9f07eb9eaf5447469509a03260830990"  // This is the OAuth2 client_id - no need to create your own app, unless you want to use a different redirect URL
        // "appKey": "91250b8fdceb4713b0bb54b0f0eeae56"  // This app is on Legacy AssetTypes, the default before November 2021 - more info: https://saxobank.github.io/openapi-samples-js/instruments/extended-assettypes/
        // "appKey": "8ef6e513003e46618d501eec0e213221"  // This app has no trading rights - use this to test how it behaves when ordering
    };
    const configDte211 = {
        "grantType": "token",  // Implicit Flow. With some changes the Authorization Code Flow (grantType code) can be used
        "env": "dte211",  // The SaxoTraderGO app for this DTE environment can be found here: https://stgo-tst211.cf.saxo/ (Developer Portal https://developerportal-tst211.cf.saxo/openapi/)
        "authUrl": "https://sso-tst211.cf.saxo/authorize",
        "redirectUrl": window.location.protocol + "//" + window.location.host + "/openapi-samples-js/assets/html/redirect.html",
        "apiHost": "stgo-tst211.cf.saxo",
        "apiPath": "/openapi",
        "streamerUrl": "wss://stgo-tst211.cf.saxo/openapi/streamingws/connect",  // On staging this is wss://blue.openapi.sys.dom/openapi/streamingws/connect
        "appKey": "31eba2b4020c4185a93372a434373cb7"  // This is the OAuth2 client_id - no need to create your own app, unless you want to use a different redirect URL
        // "appKey": "1c66f4c529ec49cab9303371636fe3d8"  // This app is on Legacy AssetTypes, the default before November 2021 - more info: https://saxobank.github.io/openapi-samples-js/instruments/extended-assettypes/
        // "appKey": "2c6e16c31a5b404190bc2c90b3bc75bc"  // This app has no trading rights - use this to test how it behaves when ordering
    };
    const user = {};
    const tokenKey = "saxoBearerToken";
    let tokenExpirationTimer;

    /**
     * Determine if the token edit exists.
     * @return {boolean} True if the field exists.
     */
    function tokenInputFieldExists() {
        return settings.hasOwnProperty("accessTokenElm") && settings.accessTokenElm !== undefined && settings.accessTokenElm !== null;
    }

    /**
     * The response contains an error message. Return the parsed message.
     * @param {Object} errorInfo The error.
     * @return {string} The message to add to the error text.
     */
    function processErrorInfo(errorInfo) {
        // Be aware that the errorObject.Message might contain line breaks, escaped like "\r\n"!
        let result = "\n" + (
            errorInfo.hasOwnProperty("ErrorCode")
            ? errorInfo.ErrorCode + ": "
            : ""
        ) + errorInfo.Message;
        if (errorInfo.hasOwnProperty("ModelState")) {
            // Not all ErrorCodes contain a ModelState. See for the list:
            // https://www.developer.saxo/openapi/learn/openapi-request-response
            Object.keys(errorInfo.ModelState).forEach(function (key) {
                result += "\n" + key + ":\n - " + errorInfo.ModelState[key].join("\n - ");
            });
        }
        return result;
    }

    /**
     * Shared function to display an unsuccessful response.
     * @param {Response} errorObject The complete error object.
     * @param {string=} extraMessageToShow An optional extra message to display.
     * @return {void}
     */
    function processError(errorObject, extraMessageToShow) {
        // Always log the correlation header, so Saxo can trace this id in the logging:
        const correlationInfo = "\n\nX-Correlation header (for troubleshooting with Saxo): " + errorObject.headers.get("X-Correlation");
        let textToDisplay = "Error with status " + errorObject.status + " " + errorObject.statusText + (
            extraMessageToShow === undefined
            ? ""
            : "\n" + extraMessageToShow
        );
        // Some errors have a JSON-response, containing explanation of what went wrong.
        errorObject.json().then(function (errorObjectJson) {
            if (errorObjectJson.hasOwnProperty("ErrorInfo")) {
                // The 400 for single orders might be wrapped in an ErrorInfo object (verify this with an order where ManualOrder property is missing).
                errorObjectJson = errorObjectJson.ErrorInfo;
            }
            if (errorObjectJson.hasOwnProperty("Message")) {
                textToDisplay += processErrorInfo(errorObjectJson);
            } else if (errorObjectJson.hasOwnProperty("Orders")) {
                // This response is returned when there is a 400, or 404 on related order requests.
                // Example: {"Orders":[{"ExternalReference":"MyOcoOrderCorrelationId1","OrderId":"113319549"},{"ErrorInfo":{"ErrorCode":"OnWrongSideOfMarket","Message":"Price is on wrong side of market"},"ExternalReference":"MyOcoOrderCorrelationId2"}]}
                errorObjectJson.Orders.forEach(function (orderError) {
                    // It might be that not all related orders have an issue
                    if (orderError.hasOwnProperty("ErrorInfo")) {
                        textToDisplay += processErrorInfo(orderError.ErrorInfo);
                    }
                });
            }
            console.error(textToDisplay + correlationInfo);
        }).catch(function () {
            // Typically 401 (Unauthorized) has an empty response, this generates a SyntaxError.
            console.error(textToDisplay + correlationInfo);
        });
    }

    /**
     * Parse the batch response to see if there are errors.
     * @param {Array} responseTextArray The complete text response of the batch request.
     * @param {string} correlationId The X-Correlation header of the response, for trouble shooting with Saxo.
     * @return {boolean} True is there are one or more failed requests.
     */
    function hasBatchResponseErrors(responseTextArray, correlationId) {

        /**
         * Shared function to display an unsuccessful response.
         * @param {string} httpError The line with the error.
         * @param {string} response The body with extra error information.
         * @param {string} correlationId The correlation header from the batch response. Might be overruled by the specific correlationIds.
         * @param {string=} extraMessageToShow An optional extra message to display.
         * @return {void}
         */
        function processBatchError(httpError, response, correlationId, extraMessageToShow) {
            const correlationInfo = "\n\nX-Correlation header (for troubleshooting with Saxo): " + correlationId;
            let textToDisplay = "Error with status " + httpError + (
                extraMessageToShow === undefined
                ? ""
                : "\n" + extraMessageToShow
            );
            let errorObjectJson;
            // Some errors have a JSON-response, containing explanation of what went wrong.
            try {
                errorObjectJson = JSON.parse(response);
                if (errorObjectJson.hasOwnProperty("ErrorInfo")) {
                    // The 400 for single orders might be wrapped in an ErrorInfo object (verify this with an order where ManualOrder property is missing).
                    errorObjectJson = errorObjectJson.ErrorInfo;
                }
                if (errorObjectJson.hasOwnProperty("Message")) {
                    textToDisplay += processErrorInfo(errorObjectJson);
                } else if (errorObjectJson.hasOwnProperty("Orders")) {
                    // This response is returned when there is a 400 on related order requests:
                    errorObjectJson.Orders.forEach(function (orderError) {
                        textToDisplay += processErrorInfo(orderError.ErrorInfo);
                    });
                }
                console.error(textToDisplay + correlationInfo);
            } catch (ignore) {
                // Typically 401 (Unauthorized) has an empty response, this generates a SyntaxError.
                console.error(textToDisplay + correlationInfo);
            }
        }

        let positionInResponse = 0;
        let hasErrors = false;
        let body = "";
        let httpStatus = "";
        let correlationIdOfRequest = correlationId;
        responseTextArray.forEach(function (line, lineNumber) {
            const correlationIdMarker = "X-Correlation:";
            if (line.substr(0, 2) === "--" && lineNumber !== 0 && httpStatus.charAt(0) !== "2") {
                hasErrors = true;
                processBatchError(httpStatus, body, correlationIdOfRequest);
                positionInResponse = 0;
                body = "";
                correlationIdOfRequest = correlationId;
            } else if (positionInResponse === 3) {
                httpStatus = line.substring(line.indexOf(" ") + 1);
            } else if (line.substr(0, correlationIdMarker.length) === correlationIdMarker) {
                correlationIdOfRequest = line.substr(correlationIdMarker.length).trim();
            } else if (line.charAt(0) === "{") {
                body = line;
            }
            positionInResponse += 1;
        });
        return hasErrors;
    }

    /**
     * For a good display, the list of accounts must be grouped by type, and sorted by valuta.
     * @param {Array<Object>} accounts The account list from the response.
     * @return {void}
     */
    function groupAndSortAccountList(accounts) {
        accounts.sort(function (x, y) {

            /**
             * Convert the account object to a string so it can alphabetically sorted on importancy.
             * @param {Object} account The account.
             * @return {string} The sortable string representaion of the account.
             */
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
     * Get the configuration for SIM or Live, depending on the '?env=' query parameter.
     * @return {Object} Object with config.
     */
    function getConfig() {
        let urlParams;
        let env;
        let envParam = "sim";  // By default, SIM is used as environment. If you want to experiment on Live (BE CAREFUL!), you can add a query param '?env=live' (or dte231, for Saxo devs)
        if (window.URLSearchParams) {
            urlParams = new window.URLSearchParams(
                window.location.hash === ""
                ? window.location.search
                : window.location.hash.replace("#", "?")
            );
            envParam = urlParams.get("env");
            if (envParam) {
                env = envParam.toLowerCase();
            } else if (urlParams.get("state") !== null) {
                try {
                    env = JSON.parse(window.atob(urlParams.get("state"))).env;
                } catch (ignore) {
                    console.error("Something went wrong unpacking the state parameter..");
                }
            }
        }
        switch (env) {
        case "live":
            return configLive;
        case "dte231":
            return configDte231;
        case "dte211":
            return configDte211;
        default:
            return configSim;
        }
    }

    /**
     * Run a function, but only after the token is valid.
     * @param {Function} functionToRun The function to run.
     * @return {void}
     */
    function run(functionToRun) {

        /**
         * Add all allowed asset types for the default account to the selection.
         * @param {string} accountKey The account key.
         * @param {Array} legalAssetTypesPerAccount The available AssetTypes per account key.
         * @return {void}
         */
        function populateAssetTypeSelection(accountKey, legalAssetTypesPerAccount) {
            let legalAssetTypes;
            // Select the asset types enabled for the default account
            settings.assetTypesList.options.length = 0;
            legalAssetTypesPerAccount.forEach(function (legalAssetTypesElement) {
                if (legalAssetTypesElement.accountKey === accountKey) {
                    legalAssetTypes = legalAssetTypesElement.legalAssetTypes;
                }
            });
            // Give the option to add "-" to the list of LegalAssetTypes.
            if (settings.selectedAssetType === "-") {
                legalAssetTypes.unshift(settings.selectedAssetType);
            }
            legalAssetTypes.forEach(function (legalAssetType) {
                const option = document.createElement("option");
                option.text = (
                    legalAssetType === "-"
                    ? "No filter on AssetType"
                    : legalAssetType
                );
                option.value = legalAssetType;
                if (option.value === settings.selectedAssetType) {
                    option.setAttribute("selected", true);
                }
                settings.assetTypesList.add(option);
            });
        }

        /**
         * Add all accounts of this client to the selection and activate an onChange handler.
         * @param {Array} accountsResponseData The list with accounts.
         * @return {void}
         */
        function populateAccountSelection(accountsResponseData) {
            const existingOptionGroups = settings.accountsList.getElementsByTagName("optgroup");
            const legalAssetTypesPerAccount = [];
            let i;
            let optionGroup;
            let currentAccountGroupName = "";
            for (i = existingOptionGroups.length - 1; i >= 0; i -= 1) {
                settings.accountsList.removeChild(existingOptionGroups[i]);  // Remove optgroups, if any
            }
            settings.accountsList.options.length = 0;  // Remove options, if any
            user.accountGroupKeys = [];
            user.accounts = [];
            groupAndSortAccountList(accountsResponseData);
            accountsResponseData.forEach(function (account) {
                // Inactive accounts are probably not in the response, but since this flag is served, we must consider it a possibility
                if (account.Active) {
                    const option = document.createElement("option");
                    option.text = (
                        account.hasOwnProperty("DisplayName")
                        ? account.DisplayName + " "
                        : ""
                    ) + account.AccountId + " " + account.Currency;
                    option.value = account.AccountKey;
                    // Remember the LegalAssetTypes for every account, so the dropdown can be populated after switching accounts
                    account.LegalAssetTypes.sort();
                    legalAssetTypesPerAccount.push({
                        "accountKey": account.AccountKey,
                        "legalAssetTypes": account.LegalAssetTypes
                    });
                    // Used to map accountIds with accountKeys:
                    user.accounts.push({
                        "accountId": account.AccountId,
                        "accountKey": account.AccountKey
                    });
                    if (account.AccountKey === user.accountKey) {
                        option.setAttribute("selected", true);
                        if (settings.hasOwnProperty("assetTypesList") && settings.assetTypesList !== null) {
                            populateAssetTypeSelection(account.AccountKey, legalAssetTypesPerAccount);
                        }
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
            });
            settings.accountsList.addEventListener("change", function () {
                user.accountKey = settings.accountsList.value;
                if (settings.hasOwnProperty("assetTypesList") && settings.assetTypesList !== null) {
                    populateAssetTypeSelection(user.accountKey, legalAssetTypesPerAccount);
                }
                console.log("Using account " + user.accountKey);
            });
        }

        /**
         * Request the basic data from the Api using a batch request.
         * @return {void}
         */
        function getDataFromApi() {

            function processBatchResponse(responseArray) {
                const requestIdMarker = "X-Request-Id:";
                let requestId = "";
                let responseJson;
                let userId;
                let clientId;
                responseArray.forEach(function (line) {
                    line = line.trim();
                    if (line.substr(0, requestIdMarker.length) === requestIdMarker) {
                        requestId = line.substr(requestIdMarker.length).trim();
                    } else if (line.charAt(0) === "{") {
                        try {
                            responseJson = JSON.parse(line);
                            switch (requestId) {
                            case "1":  // Response of GET /users/me
                                user.culture = responseJson.Culture;
                                user.language = responseJson.Language;  // Sometimes this can be culture (fr-BE) as well. See GET /ref/v1/languages for all languages.
                                userId = responseJson.UserId;
                                if (!responseJson.MarketDataViaOpenApiTermsAccepted) {
                                    // This is only an issue for Live - SIM supports only FX prices.
                                    console.error("User didn't accept the terms for market data via the OpenApi. This is required for instrument prices on Live.");
                                }
                                break;
                            case "2":  // Response of GET /clients/me
                                user.accountKey = responseJson.DefaultAccountKey;  // Select the default account
                                user.clientKey = responseJson.ClientKey;
                                user.name = responseJson.Name;
                                clientId = responseJson.ClientId;
                                break;
                            case "3":  // Response of GET /accounts/me
                                populateAccountSelection(responseJson.Data);
                                break;
                            }
                        } catch (error) {
                            console.error(error);
                        }
                    }
                });
                console.log("The token is valid - hello " + user.name + "\nUserId: " + userId + "\nClientId: " + clientId);
                functionToRun();  // Run the function
            }

            const config = getConfig();
            const requestTemplate = "--+\r\nContent-Type:application/http; msgtype=request\r\n\r\nGET " + config.apiPath + "/port/v1/{endpoint}/me HTTP/1.1\r\nX-Request-Id:{id}\r\nAccept-Language:en\r\nHost:" + config.apiHost + "\r\n\r\n\r\n";
            const request = requestTemplate.replace("{endpoint}", "users").replace("{id}", "1") + requestTemplate.replace("{endpoint}", "clients").replace("{id}", "2") + requestTemplate.replace("{endpoint}", "accounts").replace("{id}", "3") + "--+--\r\n";
            // This function uses a batch request to do three requests in one. See the example for more details: https://saxobank.github.io/openapi-samples-js/batch-request/
            fetch(
                "https://" + config.apiHost + config.apiPath + "/port/batch",  // Grouping is done per service group, so "/ref" for example, goes in a different batch.
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
                        const responseTextArray = responseText.split("\n");
                        if (!hasBatchResponseErrors(responseTextArray, response.headers.get("X-Correlation"))) {
                            processBatchResponse(responseTextArray);
                        }
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
     * Display the source code of one or more functions.
     * @param {Array<Function>} functions The function to run.
     * @return {void}
     */
    function displaySourceCode(functions) {
        let sourceCode = "";
        functions.forEach(function (functionToDisplay) {
            sourceCode = functionToDisplay.toString() + "\n\n" + sourceCode;
        });
        settings.javaScriptElm.innerText = sourceCode;
    }

    /**
     * Setup the functions to run after clicking a button or changing a dropdown.
     * @param {Array<Object>} events The configuration per event.
     * @return {void}
     */
    function setupEvents(events) {

        /**
         * Create the event listener.
         * @param {Object} eventToSetup The event configuration.
         * @return {void}
         */
        function setupEvent(eventToSetup) {
            document.getElementById(eventToSetup.elmId).addEventListener(eventToSetup.evt, function () {
                run(eventToSetup.func);
                displaySourceCode(eventToSetup.funcsToDisplay);
            });
        }

        events.forEach(function (eventToSetup) {
            if (eventToSetup.hasOwnProperty("isDelayedRun") && eventToSetup.isDelayedRun === true) {
                // Give boilerplate event priority to set correct account (useCapture is broken in some browsers)
                window.setTimeout(function () {
                    setupEvent(eventToSetup);
                }, 10);
            } else {
                setupEvent(eventToSetup);
            }
        });
    }

    /**
     * Call the IsAlive endpoint without authentication, to show the API is up and which version is running.
     * @param {string} serviceGroup Specify service group, because every group has its own version.
     * @return {void}
     */
    function displayVersion(serviceGroup) {
        const config = getConfig();
        fetch("https://" + config.apiHost + config.apiPath + "/" + serviceGroup + "/Isalive", {}).then(function (response) {
            if (response.ok) {
                response.text().then(function (responseText) {
                    settings.footerElm.innerText = responseText;
                });
            }
        });
    }

    /**
     * Examinate the token body, to see if it is not expired.
     * @param {string} token The token to be checked.
     * @return {number} The seconds until expiration.
     */
    function getSecondsUntilTokenExpiry(token) {
        const now = new Date();
        const tokenArray = String(token).split(".");
        let payload;
        if (tokenArray.length !== 3) {
            return 0;  // Header, payload and checksum must be available, separated by dots. If not, token is invalid.
        }
        try {
            // The JWT contains an header, payload and checksum
            // Payload is a base64 encoded JSON string
            payload = JSON.parse(window.atob(tokenArray[1]));
            // An example about the different claims can be found here: authentication/token-explained/
            return Math.floor((payload.exp * 1000 - now.getTime()) / 1000);
        } catch (error) {
            console.error("Error getting expiration time of token: " + token);
            console.error(error);
            return 0;
        }
    }

    /**
     * Notify about token expiration in 10 seconds.
     * @param {string} token The token to be checked.
     * @return {void}
     */
    function activateTokenExpirationWarning(token) {
        const secondsBeforeWarning = 10;
        let secondsUntilTokenExpiry;
        let secondsUntilTokenExpiryWarning;
        if (token !== "") {
            secondsUntilTokenExpiry = getSecondsUntilTokenExpiry(token);
            secondsUntilTokenExpiryWarning = secondsUntilTokenExpiry - secondsBeforeWarning;
            if (secondsUntilTokenExpiryWarning > 0) {
                window.clearTimeout(tokenExpirationTimer);
                tokenExpirationTimer = window.setTimeout(function () {
                    console.error("The access token expires in " + secondsBeforeWarning + " seconds. The app might need to refresh the token. And update the websocket subscription.");
                }, secondsUntilTokenExpiryWarning * 1000);
            }
        }
    }

    /**
     * Remember token, so it can be reused after a page refresh.
     * @param {string} token The token to be saved.
     * @return {void}
     */
    function saveAccessToken(token) {
        const secondsUntilExpiry = getSecondsUntilTokenExpiry(token);
        if (secondsUntilExpiry > 0) {
            try {
                window.localStorage.setItem(tokenKey, token);
            } catch (ignore) {
                console.error("Unable to remember token (LocalStorage not supported).");
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

        /**
         * Try to get the token from localStorage.
         * @return {null|string} The token - null if not found.
         */
        function loadAccessTokenFromLocalStorage() {
            try {
                return window.localStorage.getItem(tokenKey);
            } catch (ignore) {
                console.error("LocalStorage (used to remember the token) fails in this browser.");
                return null;
            }
        }

        /**
         * Display and store the token, if valid.
         * @param {string} token The access token.
         * @return {void}
         */
        function saveAndShowToken(token) {
            const secondsUntilExpiry = getSecondsUntilTokenExpiry(token);
            if (secondsUntilExpiry > 0) {
                saveAccessToken(token);
                settings.accessTokenElm.value = token;
                console.debug("Token is valid for another " + secondsUntilExpiry + " seconds.");
            }
        }

        /**
         * After a redirect with successfull authentication, there is a code supplied which can be used to trade for a token.
         * @param {string} page The page to be requested.
         * @param {Object} body The body object to post to the page.
         * @return {void}
         */
        function requestCodeFlowToken(page, body) {
            fetch(
                "https://www.your.server/app/saxo/" + page,
                {
                    "method": "POST",
                    "headers": {
                        "Content-Type": "application/json; charset=utf-8",
                        "Accept": "application/json; charset=utf-8"
                    },
                    "body": JSON.stringify(body)
                }
            ).then(function (response) {
                if (response.ok) {
                    response.json().then(function (responseJson) {
                        const refreshTime = Math.max(0, (responseJson.expires_in - 5) * 1000);  // Prevent negative values https://stackoverflow.com/questions/8430966/is-calling-settimeout-with-a-negative-delay-ok
                        // Make sure the token will be refreshed before expiration.
                        // When you are late with exchanging the code for a token, the expires_in can be negative.
                        // This is not an issue, the refresh_token is valid much longer.
                        window.setTimeout(function () {
                            console.log("Requesting token using the refresh token..");
                            requestCodeFlowToken("server-refresh-token.php", {
                                "refresh_token": responseJson.refresh_token
                            });
                        }, refreshTime);
                        if (settings.hasOwnProperty("newTokenCallback") && settings.newTokenCallback !== undefined && settings.newTokenCallback !== null) {
                            settings.newTokenCallback(responseJson.access_token);
                        }
                        saveAndShowToken(responseJson.access_token);
                        console.log("Access token successfully retrieved.");
                    });
                } else {
                    processError(response);
                }
            }).catch(function (error) {
                console.error(error);
            });
        }

        /**
         * Use the OAuth2 Code Flow to request a token via a code from the URL.
         * @param {string} appServerUrl The host+path of the application backend.
         * @param {string} code The code from the URL.
         * @return {void}
         */
        function getTokenViaCodeFlow(appServerUrl, code) {
            let newAccessToken;
            // First, maybe there is a code in the URL, supplied when being redirected after authententication using Implicit Flow?
            if (code === null) {
                // Second, maybe the token is stored before a refresh, or in a different sample?
                newAccessToken = loadAccessTokenFromLocalStorage();
                if (newAccessToken !== null) {
                    saveAndShowToken(newAccessToken);
                }
            } else {
                console.log("Requesting token using the code from the URL..");
                requestCodeFlowToken(appServerUrl, "server-get-token.php", {
                    "code": code
                });
            }
        }

        /**
         * Use the OAuth2 Implicit Flow to read a token from the URL.
         * @param {string} newAccessToken The token from the URL.
         * @return {void}
         */
        function getTokenViaImplicitFlow(newAccessToken) {
            if (newAccessToken === null) {
                // Second, maybe the token is stored before a refresh, or in a different sample?
                newAccessToken = loadAccessTokenFromLocalStorage();
            }
            if (newAccessToken !== null) {
                saveAndShowToken(newAccessToken);
            }
        }

        const config = getConfig();
        let urlParams;
        if (window.URLSearchParams) {
            urlParams = new window.URLSearchParams(
                config.grantType === "code"
                ? window.location.search
                : window.location.hash.replace("#", "?")  // A bookmark/anchor is used, because the access_token doesn't leave the browser this way, so it doesn't end up in logfiles.
            );
            const errorDescription = urlParams.get("error_description");
            if (errorDescription !== null) {
                // Something went wrong..
                console.error("Error getting token: " + errorDescription);
            } else if (config.grantType === "code") {
                getTokenViaCodeFlow(config.appServerUrl, urlParams.get("code"));
            } else {
                getTokenViaImplicitFlow(urlParams.get("access_token"));
            }
        }
    }

    /**
     * Create link with preconfigured redirect (run from https://saxobank.github.io or http://localhost) and store Csrf token.
     * @return {void}
     */
    function prepareLoginLink() {

        /**
         * Store the CSRF token in localStorage or cookie.
         * @param {string} token The random code to be checked after authentication (see /assets/html/redirect.html).
         * @return {void}
         */
        function saveCsrfToken(token) {
            const csrfTokenKey = "csrfToken";
            try {
                window.localStorage.setItem(csrfTokenKey, token);
                console.debug("CSRF token " + token + " saved to localStorage.");
            } catch (ignore) {
                console.error("LocalStorage (used to store the CSRF token) fails in this browser.");
            }
        }

        const config = getConfig();
        const stateObject = {
            "redirect": window.location.pathname,  // https://auth0.com/docs/protocols/state-parameters#redirect-users
            "csrfToken": Math.random().toString(),  // https://auth0.com/docs/protocols/state-parameters#csrf-attacks
            "env": config.env
        };
        let warningMessage = (
            config.env === "sim" ? "" : "You are testing against " + config.env + "!<br />"
        );
        let urlWithoutParams = window.location.protocol + "//" + window.location.host + window.location.pathname;
        settings.retrieveTokenHref.parentElement.innerHTML = warningMessage + settings.retrieveTokenHref.parentElement.innerHTML;
        if (urlWithoutParams.substring(0, 36) === "http://localhost/openapi-samples-js/" || urlWithoutParams.substring(0, 46) === "https://saxobank.github.io/openapi-samples-js/") {
            // We can probably use the Implicit/Code Flow Grant to get a token
            // Change the URL, to give the option to use Extended AssetTypes
            urlWithoutParams = config.authUrl + "?response_type=" + config.grantType + "&state=" + window.btoa(JSON.stringify(stateObject)) + "&redirect_uri=" + encodeURIComponent(config.redirectUrl);
            settings.retrieveTokenHref.href = urlWithoutParams + "&client_id=" + config.appKey;
            settings.retrieveTokenHref.target = "_self";  // Back to default
            saveCsrfToken(stateObject.csrfToken);  // Save CsrfToken for new authentication.
        }
    }

    /**
     * Setup and return settings to be used on demo.js.
     * @return {Object} Object with config, user object and helper functions.
     */
    function setupDemo() {
        const config = getConfig();
        const apiUrl = "https://" + config.apiHost + config.apiPath;
        const streamerUrl = config.streamerUrl;
        const authUrl = config.authUrl;
        mirrorConsoleLog();
        mirrorConsoleError();
        if (tokenInputFieldExists() && Boolean(window.URLSearchParams)) {
            tryToGetToken();
            prepareLoginLink();
            activateTokenExpirationWarning(settings.accessTokenElm.value);
            settings.accessTokenElm.addEventListener("change", function () {
                saveAccessToken(settings.accessTokenElm.value);
                activateTokenExpirationWarning(settings.accessTokenElm.value);
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
            streamerUrl,
            user,
            displayVersion,
            displaySourceCode,
            setupEvents,
            processError,
            hasBatchResponseErrors,
            groupAndSortAccountList,
            getSecondsUntilTokenExpiry
        });
    }

    return setupDemo();
}
