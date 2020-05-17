/*jslint this: true, browser: true, for: true, long: true */
/*global console URLSearchParams */

/*
 * boilerplate v1.02
 *
 * This script contains a set of helper functions for validating the token and populating the account selection.
 * Logging to the console is mirrored to the output in the examples.
 * For demonstration the code which is executed, is shown in the code output.
 * It also handles errors when the fetch fails. See https://saxobank.github.io/openapi-samples-js/error-handling/ for an explanation.
 *
 * The token is stored, so it remains available after a page refresh.
 *
 */

const apiUrl = "https://gateway.saxobank.com/sim/openapi";
const user = {
    "clientKey": "",
    "accountKey": "",
    "culture": ""
};
const responseElm = document.getElementById("idResponse");
const accessTokenElm = document.getElementById("idBearerToken");

/**
 * Determine if the token edit exists.
 * @return {boolean} True if the field exists.
 */
function tokenInputFieldExists() {
    return accessTokenElm !== null;
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

    function populateAccounts(responseJson) {
        const cbxAccount = document.getElementById("idCbxAccount");
        let i;
        let option;
        for (i = cbxAccount.options.length - 1; i >= 0; i -= 1) {
            cbxAccount.remove(i);
        }
        for (i = 0; i < responseJson.Data.length; i += 1) {
            option = document.createElement("option");
            option.text = responseJson.Data[i].AccountId + " (" + responseJson.Data[i].AccountType + ", " + responseJson.Data[i].Currency + ")";
            option.value = responseJson.Data[i].AccountKey;
            if (option.value === user.accountKey) {
                option.setAttribute("selected", true);
            }
            cbxAccount.add(option);
        }
        cbxAccount.addEventListener("change", function () {
            user.accountKey = cbxAccount.value;
            console.log("Using account " + user.accountKey);
        });
    }

    function getDataFromApi() {
        const requestTemplate = "--+\r\nContent-Type:application/http; msgtype=request\r\n\r\nGET /sim/openapi/port/v1/{endpoint}/me HTTP/1.1\r\nX-Request-Id:{id}\r\nAccept-Language:en\r\nHost:gateway.saxobank.com\r\n\r\n\r\n";
        const request = requestTemplate.replace("{endpoint}", "users").replace("{id}", "1") + requestTemplate.replace("{endpoint}", "clients").replace("{id}", "2") + requestTemplate.replace("{endpoint}", "accounts").replace("{id}", "3") + "--+--\r\n";
        // This function uses a batch request to do three calls in one. Se the example for more details: https://saxobank.github.io/openapi-samples-js/batch-request/
        fetch(
            apiUrl + "/port/batch",  // Grouping is done per service group, so "/ref" for example, must be in a different batch.
            {
                "headers": {
                    "Content-Type": "multipart/mixed; boundary=\"+\"",
                    "Accept": "*/*",
                    "Accept-Language": "en, *;q=0.5",
                    "Authorization": "Bearer " + accessTokenElm.value,
                    "Cache-Control": "no-cache"
                },
                "body": request,
                "method": "POST"
            }
        ).then(function (response) {
            if (response.ok) {
                accessTokenElm.setCustomValidity("");
                response.text().then(function (responseText) {
                    const responseArray = responseText.split("\n");
                    let lineNumber;
                    let line;
                    let requestId;
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
                                    break;
                                case "2":
                                    user.accountKey = responseJson.DefaultAccountKey;  // Remember the default account
                                    user.clientKey = responseJson.ClientKey;
                                    user.culture = responseJson.Culture;
                                    responseElm.innerText = "The token is valid - hello " + responseJson.Name + "\nClientKey: " + user.clientKey;
                                    break;
                                case "3":
                                    populateAccounts(responseJson);
                                    break;
                                }
                            } catch (error) {
                                console.error(error);
                            }
                        }
                    }
                    functionToRun();
                });
            } else {
                accessTokenElm.setCustomValidity("Invalid access_token.");
                processError(response);
            }
        }).catch(function (error) {
            accessTokenElm.setCustomValidity("Invalid access_token.");
            console.error(error);
        });
    }

    // Display source of function, for demonstration:
    let source = functionToRun.toString();
    if (secondFunctionToDisplay !== undefined) {
        source = secondFunctionToDisplay.toString() + "\n\n" + source;
    }
    document.getElementById("idJavaScript").innerText = source;
    responseElm.removeAttribute("style");  // Remove red background, if any.
    responseElm.innerText = "Started function " + functionToRun.name + "()..";
    if (tokenInputFieldExists()) {
        if (accessTokenElm.value.length < 10) {
            accessTokenElm.setCustomValidity("Bearer token is required for requests.");
            console.error("Bearer token is required for requests.");
        } else {
            if (user.accountKey === "") {
                // Retrieve the account and customer data in a batch
                getDataFromApi();
            } else {
                functionToRun();
            }
        }
    } else {
        functionToRun();
    }
}

/**
 * Call the IsAlive endpoint without authentication, to show the API is up and which version is running.
 * @param {string} serviceGroup Specify service group, because every group has its own versioning.
 * @return {void}
 */
function displayVersion(serviceGroup) {
    fetch(apiUrl + "/" + serviceGroup + "/Isalive", {}).then(function (response) {
        if (response.ok) {
            response.text().then(function (responseText) {
                document.getElementById("idFooter").innerText = responseText;
            });
        }
    });
}

(function () {

    /**
     * When an error is logged to the console, show it in the Response-box as well.
     * @return {void}
     */
    function mirrorConsoleError() {
        console.errorCopy = console.error.bind(console);
        console.error = function (data) {
            responseElm.setAttribute("style", "background-color: #e10c02; color: #ffffff;");
            responseElm.innerText = data;
            this.errorCopy(data);
        };
    }

    /**
     * When something is logged to the console, show it in the Response-box as well.
     * @return {void}
     */
    function mirrorConsoleLog() {
        console.logCopy = console.log.bind(console);
        console.log = function (data) {
            responseElm.removeAttribute("style");  // Remove red background, if any.
            responseElm.innerText = data;
            this.logCopy(data);
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
                newAccessToken = sessionStorage.getItem("saxosimtoken");
            } catch (ignore) {
                console.error("Session storage fails in this browser.");
            }
        }
        accessTokenElm.value = newAccessToken;
        accessTokenElm.addEventListener("change", function () {
            if (accessTokenElm.value.length > 20) {
                // Save the token in session storage, so it can be reused after a page refresh:
                sessionStorage.setItem("saxosimtoken", accessTokenElm.value);
            }
        });
        document.getElementById("idBtnValidate").addEventListener("click", function () {
            user.accountKey = "";
            run(function () {
                console.info("Token is valid!");
            });
        });
        if (urlWithoutParams.substring(0, 36) === "http://localhost/openapi-samples-js/" || urlWithoutParams.substring(0, 46) === "https://saxobank.github.io/openapi-samples-js/") {
            // We can probably use the Implicit Grant to get a token
            document.getElementById("idHrefRetrieveToken").href = "https://sim.logonvalidation.net/authorize?client_id=e081be34791f4c7eac479b769b96d623&response_type=token&redirect_uri=" + encodeURIComponent(urlWithoutParams);
        }
    }
    mirrorConsoleLog();
    mirrorConsoleError();
    if (tokenInputFieldExists()) {
        tryToGetToken();
    }
}());
