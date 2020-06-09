/*jslint this: true, browser: true, for: true, long: true */
/*global console URLSearchParams */

/*
 * boilerplate v1.05
 *
 * This script contains a set of helper functions for validating the token and populating the account selection.
 * Logging to the console is mirrored to the output in the examples.
 * For demonstration the code which is executed, is shown in the code output.
 * It also handles errors when the fetch fails. See https://saxobank.github.io/openapi-samples-js/error-handling/ for an explanation.
 *
 * The token is stored in the session, so it remains available after a page refresh.
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
    const apiUrl = "https://gateway.saxobank.com/sim/openapi";  // On production this is https://gateway.saxobank.com/openapi
    const user = {};

    /**
     * Determine if the token edit exists.
     * @return {boolean} True if the field exists.
     */
    function tokenInputFieldExists() {
        return settings.hasOwnAttribute("accessTokenElm") && settings.accessTokenElm !== undefined && settings.accessTokenElm !== null;
    }

    /**
     * Shared function to display an unsuccessful response.
     * @param {Object} errorObject The complete error object.
     * @return {void}
     */
    function processError(errorObject) {
        let textToDisplay = "Error with status " + errorObject.status + " " + errorObject.statusText;
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
     * Show a function and run it.
     * @param {Function} functionToRun The function in scope.
     * @param {Function=} secondFunctionToDisplay An optional function to display besides the functionToRun.
     * @return {void}
     */
    function run(functionToRun, secondFunctionToDisplay) {

        function populateAccountSelection(responseJson) {
            let i;
            let option;
            for (i = settings.accountsList.options.length - 1; i >= 0; i -= 1) {
                settings.accountsList.remove(i);
            }
            for (i = 0; i < responseJson.Data.length; i += 1) {
                option = document.createElement("option");
                option.text = responseJson.Data[i].AccountId + " (" + responseJson.Data[i].AccountType + ", " + responseJson.Data[i].Currency + ")";
                option.value = responseJson.Data[i].AccountKey;
                if (option.value === user.accountKey) {
                    option.setAttribute("selected", true);
                }
                settings.accountsList.add(option);
            }
            settings.accountsList.addEventListener("change", function () {
                user.accountKey = settings.accountsList.value;
                console.log("Using account " + user.accountKey);
            });
        }

        function getDataFromApi() {
            const requestTemplate = "--+\r\nContent-Type:application/http; msgtype=request\r\n\r\nGET /sim/openapi/port/v1/{endpoint}/me HTTP/1.1\r\nX-Request-Id:{id}\r\nAccept-Language:en\r\nHost:gateway.saxobank.com\r\n\r\n\r\n";
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
                                    case "1":
                                        user.culture = responseJson.Culture;
                                        user.language = responseJson.Language;
                                        break;
                                    case "2":
                                        user.accountKey = responseJson.DefaultAccountKey;  // Select the default account
                                        user.clientKey = responseJson.ClientKey;
                                        user.name = responseJson.Name;
                                        break;
                                    case "3":
                                        populateAccountSelection(responseJson);
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

    const tokenKey = "saxosimtoken";

    /**
     * Remember token for this session, so it can be reused after a page refresh.
     * @return {void}
     */
    function saveToken(token) {
        if (token.length > 20) {
            try {
                window.sessionStorage.setItem(tokenKey, token);
            } catch (ignore) {
                console.error("Unable to remember token (session storage not supported).");
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
        const urlParams = new URLSearchParams(window.location.hash.replace("#", "?"));
        const urlWithoutParams = location.protocol + "//" + location.host + location.pathname;
        let newAccessToken = urlParams.get("access_token");
        if (newAccessToken === null) {
            // Second, maybe the token is stored before a refresh or in a different sample?
            try {
                newAccessToken = window.sessionStorage.getItem(tokenKey);
            } catch (ignore) {
                console.error("Session storage fails in this browser.");
            }
        } else {
            saveToken(newAccessToken);
        }
        settings.accessTokenElm.value = newAccessToken;
        if (urlWithoutParams.substring(0, 36) === "http://localhost/openapi-samples-js/" || urlWithoutParams.substring(0, 46) === "https://saxobank.github.io/openapi-samples-js/") {
            // We can probably use the Implicit Grant to get a token
            settings.retrieveTokenHref.href = "https://sim.logonvalidation.net/authorize?client_id=e081be34791f4c7eac479b769b96d623&response_type=token&redirect_uri=" + encodeURIComponent(urlWithoutParams);
        }
    }

    mirrorConsoleLog();
    mirrorConsoleError();
    if (tokenInputFieldExists()) {
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
    return {
        "apiUrl": apiUrl,
        "user": user,
        "displayVersion": displayVersion,
        "run": run,
        "processError": processError
    };
}
