/*jslint this: true, browser: true, for: true, long: true */
/*global window console demonstrationHelper */

(function () {
    const demo = demonstrationHelper({
        "responseElm": document.getElementById("idResponse"),
        "javaScriptElm": document.getElementById("idJavaScript"),
        "accessTokenElm": document.getElementById("idBearerToken"),
        "retrieveTokenHref": document.getElementById("idHrefRetrieveToken"),
        "tokenValidateButton": document.getElementById("idBtnValidate"),
        "accountsList": document.getElementById("idCbxAccount"),
        "footerElm": document.getElementById("idFooter")
    });

    /**
     * Example of handling a 404 error.
     * @return {void}
     */
    function trigger404NotFound() {
        fetch(
            demo.apiUrl + "/port/invalid",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
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
            demo.apiUrl + "/port/v1/orders",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer is.invalid.here"
                }
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
            demo.apiUrl + "/ref/v1/instruments?SectorId=Vastgoed&IncludeNonTradable=Ja&CanParticipateInMultiLegOrder=Mag+wel&Uics=N.V.T.&AssetTypes=Aandelen&Tags=Vastgoed&AccountKey=IBAN",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (!response.ok) {
                demo.processError(response);
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
                demo.apiUrl + "/ref/v1/instruments?$top=1&$skip=0&Keywords=aex",
                {
                    "method": "GET",
                    "headers": {
                        "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                    }
                }
            ).then(function (response) {
                if (response.ok) {
                    console.log("Successful request #" + i);
                    i += 1;
                    if (i < 250) {
                        doRequest();  // Repeat this request until we are blocked with an HTTP 429.
                    }
                } else {
                    demo.processError(response);
                }
            });
        }

        doRequest();
    }

    document.getElementById("idBtnGet404NotFound").addEventListener("click", function () {
        demo.run(trigger404NotFound);
    });
    document.getElementById("idBtnGet401Unauthorized").addEventListener("click", function () {
        demo.run(trigger401Unauthorized);
    });
    document.getElementById("idBtnGet400BadRequest").addEventListener("click", function () {
        demo.run(trigger400BadRequest, demo.processError);
    });
    document.getElementById("idBtnGet429TooManyRequests").addEventListener("click", function () {
        demo.run(trigger429TooManyRequests, demo.processError);
    });
    demo.displayVersion("ref");
}());
