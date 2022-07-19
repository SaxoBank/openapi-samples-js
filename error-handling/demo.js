/*jslint this: true, browser: true, for: true, long: true, unordered: true */
/*global window console demonstrationHelper */

(function () {
    // Create a helper function to remove some boilerplate code from the example itself.
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
        const invalidBearerToken = Math.random();
        fetch(
            demo.apiUrl + "/port/v1/orders",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + invalidBearerToken
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
        }).catch(function (error) {
            console.error(error);
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
        }).catch(function (error) {
            console.error(error);
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
            }).catch(function (error) {
                console.error(error);
            });
        }

        doRequest();
    }

    /**
     * Example of handling an error in a batch request.
     * @return {void}
     */
    function triggerErrorInBatchRequest() {
        // Info on batch requests: https://saxobank.github.io/openapi-samples-js/batch-request/
        const host = "gateway.saxobank.com";
        const request = "--+\r\nContent-Type:application/http; msgtype=request\r\n\r\nGET /sim/openapi/ref/v1/instruments?SectorId=Vastgoed&IncludeNonTradable=Ja&CanParticipateInMultiLegOrder=Mag+wel&Uics=N.V.T.&AssetTypes=Aandelen&Tags=Vastgoed&AccountKey=IBAN HTTP/1.1\r\nX-Request-Id:1\r\nAccept-Language:en\r\nHost:" + host + "\r\n\r\n\r\n--+--\r\n";
        fetch(
            demo.apiUrl + "/ref/batch",
            {
                "headers": {
                    "Content-Type": "multipart/mixed; boundary=\"+\"",
                    "Accept": "*/*",
                    "Accept-Language": "en, *;q=0.5",
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                    "Cache-Control": "no-cache"
                },
                "body": request,
                "method": "POST"
            }
        ).then(function (response) {
            if (response.ok) {
                // The request goes probably perfectly well, so we end up here.
                response.text().then(function (responseText) {
                    if (!demo.hasBatchResponseErrors(responseText.split("\n"), response.headers.get("X-Correlation"))) {
                        // This part is not reached..
                        console.log("No errors in response!\n\n" + responseText);
                    }
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnGet404NotFound", "func": trigger404NotFound, "funcsToDisplay": [trigger404NotFound]},
        {"evt": "click", "elmId": "idBtnGet401Unauthorized", "func": trigger401Unauthorized, "funcsToDisplay": [trigger401Unauthorized]},
        {"evt": "click", "elmId": "idBtnGet400BadRequest", "func": trigger400BadRequest, "funcsToDisplay": [trigger400BadRequest, demo.processError]},
        {"evt": "click", "elmId": "idBtnGet429TooManyRequests", "func": trigger429TooManyRequests, "funcsToDisplay": [trigger429TooManyRequests, demo.processError]},
        {"evt": "click", "elmId": "idBtnGetErrorInBatchRequest", "func": triggerErrorInBatchRequest, "funcsToDisplay": [triggerErrorInBatchRequest, demo.hasBatchResponseErrors]}
    ]);
    demo.displayVersion("ref");
}());
