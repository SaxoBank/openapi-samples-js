/*jslint this: true, browser: true, for: true, long: true */
/*global console */

let accountKey = "";

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
        document.getElementById("idResponse").innerText = textToDisplay;
    }).catch(function () {
        // Typically 401 (Unauthorized) has an empty response, this generates a SyntaxError.
        document.getElementById("idResponse").innerText = textToDisplay;
    });
}

/**
 * Shared function to display a network error, without response.
 * @param {string} error The complete error message.
 * @return {void}
 */
function processNetworkError(error) {
    console.error(error);
    document.getElementById("idResponse").innerText = error;
}

/**
 * Show a function and run it.
 * @param {Function} functionToRun The function in scope.
 * @return {void}
 */
function run(functionToRun) {
    // Display source used for demonstration:
    document.getElementById("idJavaScript").innerText = functionToRun.toString();
    document.getElementById("idResponse").innerText = "Started function " + functionToRun.name + "()";
    if (document.getElementById("idBearerToken") !== null) {
        if (document.getElementById("idBearerToken").value === "") {
            document.getElementById("idResponse").innerText = "Bearer token is required to do requests.";
        } else {
            if (accountKey === "") {
                // Retrieve the account key first
                fetch(
                    "https://gateway.saxobank.com/sim/openapi/port/v1/accounts/me",
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
                            accountKey = responseJson.Data[0].AccountKey;  // Just get the first account
                            console.log("Using accountKey: " + accountKey);
                            functionToRun();
                        });
                    } else {
                        processError(response);
                    }
                }).catch(function (error) {
                    processError(error);
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
     * Read a cookie.
     * @param {string} key Name of the cookie.
     * @return {string} Value.
     */
    function getCookie(key) {
        const name = key + "=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const cookieArray = decodedCookie.split(";");
        let c;
        for (let i = 0; i < cookieArray.length; i += 1) {
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

    // Show most recent used token:
    const previouslyUsedToken = getCookie("saxotoken");
    if (previouslyUsedToken !== "") {
        document.getElementById("idBearerToken").value = previouslyUsedToken;
    }
    window.addEventListener("beforeunload", function () {
        const tokenElm = document.getElementById("idBearerToken");
        let token;
        if (tokenElm !== null) {
            token = document.getElementById("idBearerToken").value;
            if (token.length > 10) {
                // Save the token so it can be reused:
                setCookie("saxotoken", token);
            }
        }
    });
}());
