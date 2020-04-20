/*jslint this: true, browser: true, for: true, long: true */
/*global window console accountKey run processError apiUrl */

/**
 * Example of handling a 404 error.
 * @return {void}
 */
function trigger404NotFound() {
    fetch(
        apiUrl + "/port/invalid",
        {
            "headers": {
                "Content-Type": "application/json; charset=utf-8"
            },
            "method": "GET"
        }
    ).catch(function (error) {
        // This will end in a CORS issue on the OPTIONS preflight:
        console.error(error);
    });
}

/**
 * Example of handling a 401 error.
 * @return {void}
 */
function trigger401Unauthorized() {
    fetch(
        apiUrl + "/port/v1/orders",
        {
            "headers": {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": "Bearer is.invalid.here"
            },
            "method": "GET"
        }
    ).then(function (response) {
        let textToDisplay;
        if (!response.ok) {
            textToDisplay = "Error with status " + response.status + " " + response.statusText;
            // The 401 error has an empty response, so no need to parse the response as JSON message.
            // Always log the correlation header, so Saxo can trace this id in the logging.
            textToDisplay += "\n\nX-Correlation header (for troubleshooting with Saxo): " + response.headers.get("X-Correlation");
        } else {
            // We don't end up here..
            textToDisplay = "Successful request.";
        }
        console.error(textToDisplay);
    });
}

/**
 * Example of handling a 400 error.
 * @return {void}
 */
function trigger400BadRequest() {
    fetch(
        apiUrl + "/ref/v1/instruments?SectorId=Vastgoed&IncludeNonTradable=Ja&CanParticipateInMultiLegOrder=Mag+wel&Uics=N.V.T.&AssetTypes=Aandelen&Tags=Vastgoed&AccountKey=IBAN",
        {
            "headers": {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": "Bearer " + document.getElementById("idBearerToken").value
            },
            "method": "GET"
        }
    ).then(function (response) {
        if (!response.ok) {
            processError(response);
        } else {
            // We don't end up here..
            console.log("Successful request.");
        }
    });
}

/**
 * Example of handling a 429 error.
 * @return {void}
 */
function trigger429TooManyRequests() {
    let i = 0;

    // The remaining "RefLimit" is returned in the response headers
    // X-RateLimit-AppDay-* & X-RateLimit-RefDataInstrumentsMinute-*.
    // JavaScript has no access, but you can find them using F12 developer tools.

    function doRequest() {
        fetch(
            apiUrl + "/ref/v1/instruments?$top=1&$skip=0&Keywords=aex",
            {
                "headers": {
                    "Content-Type": "application/json; charset=utf-8",
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                },
                "method": "GET"
            }
        ).then(function (response) {
            if (response.ok) {
                console.log("Successful request #" + i);
                i += 1;
                if (i < 250) {
                    doRequest();  // Repeat this request until we are blocked with an HTTP 429.
                }
            } else {
                processError(response);
            }
        });
    }

    doRequest();
}

(function () {
    document.getElementById("idBtnGet404NotFound").addEventListener("click", function () {
        run(trigger404NotFound);
    });
    document.getElementById("idBtnGet401Unauthorized").addEventListener("click", function () {
        run(trigger401Unauthorized);
    });
    document.getElementById("idBtnGet400BadRequest").addEventListener("click", function () {
        run(trigger400BadRequest, processError);
    });
    document.getElementById("idBtnGet429TooManyRequests").addEventListener("click", function () {
        run(trigger429TooManyRequests, processError);
    });
}());
