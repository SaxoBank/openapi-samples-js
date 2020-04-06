/*jslint this: true, browser: true, for: true, long: true */
/*global console */

const apiUrl = "https://gateway.saxobank.com/sim/openapi";
let accountKey = "";
let clientKey = "";
const responseElm = document.getElementById("idResponse");

/**
 * Determine if the token edit exists.
 * @return {boolean} True if the field exists.
 */
function tokenInputFieldExists() {
    return document.getElementById("idBearerToken") !== null;
}

/**
 * Shared function to display an unsuccessful response.
 * @param {Object} errorObject The complete error object.
 * @return {void}
 */
function processError(errorObject) {
    let textToDisplay = "Error with status " + errorObject.status + " " + errorObject.statusText;
    console.error(textToDisplay + " " + errorObject.url);
    // Some errors have a JSON-response, containing explanation of what went wrong.
    errorObject.json().then(function (errorObjectJson) {
        if (errorObjectJson.hasOwnProperty("ErrorInfo")) {
            // Order error object is wrapped in ErrorInfo
            errorObjectJson = errorObjectJson.ErrorInfo;
        }
        // Order preview error object not..
        if (errorObjectJson.hasOwnProperty("ErrorCode")) {
            textToDisplay += " - " + errorObjectJson.ErrorCode + " (" + errorObjectJson.Message + ")";
        }
        console.error(textToDisplay);
    }).catch(function () {
        // Typically 401 (Unauthorized) has an empty response, this generates a SyntaxError.
        console.error(textToDisplay);
    });
}

/**
 * Show a function and run it.
 * @param {Function} functionToRun The function in scope.
 * @return {void}
 */
function run(functionToRun) {

    function getAllAccounts(header) {
        fetch(apiUrl + "/port/v1/accounts/me", header).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const cbxAccount = document.getElementById("idCbxAccount");
                    let i;
                    let option;
                    cbxAccount.remove(0);
                    for (i = 0; i < responseJson.Data.length; i += 1) {
                        option = document.createElement("option");
                        option.text = responseJson.Data[i].AccountId + " (" + responseJson.Data[i].AccountType + ", " + responseJson.Data[i].Currency + ")";
                        option.value = responseJson.Data[i].AccountKey;
                        if (option.value === accountKey) {
                            option.setAttribute("selected", true);
                        }
                        cbxAccount.add(option);
                    }
                    cbxAccount.addEventListener("change", function () {
                        accountKey = cbxAccount.value;
                        responseElm.innerText = "Using account " + accountKey;
                    });
                    functionToRun();
                });
            } else {
                processError(response);
            }
        }).catch(function (error) {
            processError(error);
        });
    }

    function getDefaultAccount(header) {
        fetch(apiUrl + "/port/v1/clients/me", header).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    accountKey = responseJson.DefaultAccountKey;  // Remember the default account
                    clientKey = responseJson.ClientKey;
                    console.log("Using accountKey " + accountKey + " of clientKey " + clientKey);
                    responseElm.innerText = "The token is valid - hello " + responseJson.Name;
                    getAllAccounts(header);
                });
            } else {
                processError(response);
            }
        }).catch(function (error) {
            processError(error);
        });
    }

    // Display source of function, for demonstration:
    document.getElementById("idJavaScript").innerText = functionToRun.toString();
    responseElm.removeAttribute("style");
    responseElm.innerText = "Started function " + functionToRun.name + "()..";
    if (tokenInputFieldExists()) {
        if (document.getElementById("idBearerToken").value === "") {
            responseElm.innerText = "Bearer token is required to do requests.";
        } else {
            if (accountKey === "") {
                // Retrieve the account key first
                getDefaultAccount({
                    "headers": {
                        "Content-Type": "application/json; charset=utf-8",
                        "Authorization": "Bearer " + document.getElementById("idBearerToken").value
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
     * Read a cookie.
     * @param {string} key Name of the cookie.
     * @return {string} Value.
     */
    function getCookie(key) {
        const name = key + "=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const cookieArray = decodedCookie.split(";");
        let c;
        let i;
        for (i = 0; i < cookieArray.length; i += 1) {
            c = cookieArray[i];
            while (c.charAt(0) === " ") {
                c = c.substring(1);
            }
            if (c.indexOf(name) === 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }

    /**
     * Insert a cookie. In order to delete it, make value empty.
     * @param {string} key Name of the cookie.
     * @param {string} value Value to store.
     * @return {void}
     */
    function setCookie(key, value) {
        const expires = new Date();
        // Cookie is valid for 360 days.
        expires.setTime(expires.getTime() + 360 * 24 * 60 * 60 * 1000);
        document.cookie = key + "=" + value + ";expires=" + expires.toUTCString();
    }

    mirrorConsoleError();

    // Show most recent used token:
    const previouslyUsedToken = getCookie("saxotoken");
    if (previouslyUsedToken !== "") {
        document.getElementById("idBearerToken").value = previouslyUsedToken;
    }
    window.addEventListener("beforeunload", function () {
        let token;
        if (tokenInputFieldExists()) {
            token = document.getElementById("idBearerToken").value;
            if (token.length > 10) {
                // Save the token so it can be reused:
                setCookie("saxotoken", token);
            }
        }
    });
    if (tokenInputFieldExists()) {
        document.getElementById("idBtnValidate").addEventListener("click", function () {
            run(function () {
                console.log("Valid!");
            });
        });
    }

}());
