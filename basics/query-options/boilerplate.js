/*jslint this: true, browser: true, for: true, long: true */
/*global console URLSearchParams */

/*
 * This is a set of helper functions for validating the token and populating the account selection.
 * Logging to the console is mirrored to the output in the examples.
 * For demonstration the code that is executed, is shown in the code output.
 * It also handles errors when the fetch fails. See https://saxobank.github.io/openapi-samples-js/error-handling/ for more details.
 *
 * The token is stored, so it remains available after a page refresh.
 *
 * boilerplate v1.02
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

    function getCulture(header) {
        fetch(apiUrl + "/port/v1/users/me", header).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    user.culture = responseJson.Culture;
                    functionToRun();
                });
            } else {
                processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    function getAllAccounts(header) {
        fetch(apiUrl + "/port/v1/accounts/me", header).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
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
                    getCulture(header);
                });
            } else {
                processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    function getDefaultAccount(header) {
        fetch(apiUrl + "/port/v1/clients/me", header).then(function (response) {
            if (response.ok) {
                accessTokenElm.setCustomValidity("");
                response.json().then(function (responseJson) {
                    user.accountKey = responseJson.DefaultAccountKey;  // Remember the default account
                    user.clientKey = responseJson.ClientKey;
                    user.culture = responseJson.Culture;
                    responseElm.innerText = "The token is valid - hello " + responseJson.Name + "\nClientKey: " + user.clientKey;
                    getAllAccounts(header);
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
                // Retrieve the account key first
                getDefaultAccount({
                    "headers": {
                        "Content-Type": "application/json; charset=utf-8",
                        "Authorization": "Bearer " + accessTokenElm.value
                    },
                    "method": "GET"
                });
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
            // Second, maybe the token is stored in an earlier session?
            newAccessToken = localStorage.getItem("saxotoken");
        }
        accessTokenElm.value = newAccessToken;
        accessTokenElm.addEventListener("change", function () {
            if (accessTokenElm.value.length > 20) {
                // Save the token in local storage, so it can be reused after a page refresh:
                localStorage.setItem("saxotoken", accessTokenElm.value);
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
