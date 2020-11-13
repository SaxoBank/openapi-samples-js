/*jslint this: true, browser: true, for: true, long: true */
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
    let requestCount = 0;
    let requestQueue = [];
    let instrumentIds = [];

    function processContractOptionSpace(assetType, responseJson) {
        responseJson.OptionSpace.forEach(function (optionSerie) {
            optionSerie.SpecificOptions.forEach(function (specificOption) {
                instrumentIds.push(specificOption.Uic + "/" + assetType);
            });
        });
        document.getElementById("idInstruments").value = instrumentIds.join(",");
        console.debug("Added " + responseJson.OptionSpace.length + " instruments type " + assetType + ". Total " + instrumentIds.length + " instruments..");
    }

    function processDetailsListResponse(assetType, responseJson) {
        if (responseJson.hasOwnProperty("__next")) {
            // Recursively get next bulk
            console.debug("Found '__next': " + responseJson.__next);
            requestQueue.push({
                "assetType": assetType,
                "url": responseJson.__next,
                "callback": processDetailsListResponse
            });
        }
        // We have the Uic - collect the details
        responseJson.Data.forEach(function (instrument) {
            instrumentIds.push(instrument.Uic + "/" + instrument.AssetType);
        });
        document.getElementById("idInstruments").value = instrumentIds.join(",");
        console.debug("Found " + responseJson.Data.length + " instruments in the response. Total " + instrumentIds.length + " instruments found..");
    }

    function processOptionSearchResponse(assetType, responseJson) {
        console.debug("Found " + responseJson.Data.length + " instruments");
        // We have the Uic - collect the details
        responseJson.Data.forEach(function (instrument) {
            // We found an OptionRoot - this must be converted to Uic
            requestQueue.push({
                "assetType": assetType,
                "url": demo.apiUrl + "/ref/v1/instruments/contractoptionspaces/" + instrument.Identifier + "?OptionSpaceSegment=AllDates",
                "callback": processContractOptionSpace
            });
        });
        if (responseJson.hasOwnProperty("__next")) {
            // Recursively get next bulk
            console.debug("Found '__next': " + responseJson.__next);
            requestQueue.push({
                "assetType": assetType,
                "url": responseJson.__next,
                "callback": processOptionSearchResponse
            });
        }
    }

    /**
     * This is an example of getting all instruments.
     * @return {void}
     */
    function start() {
        // Get all available LegalAssetTypes first
        fetch(
            demo.apiUrl + "/port/v1/users/me",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    responseJson.LegalAssetTypes.forEach(function (legalAssetType) {
                        const unsupportedAssetTypes = [
                            "CfdStockOption",
                            "CfdFutureOption",
                            "WarrantDoubleKnockOut",
                            "CertificateUncappedCapitalProtection",
                            "CertificateCappedCapitalProtected",
                            "CertificateDiscount",
                            "CertificateCappedOutperformance",
                            "CertificateExpress",
                            "CertificateUncappedOutperformance",
                            "SrdOnEtf",
                            "IpoOnStock",
                            "FuturesStrategy",
                            "FuturesOption"
                        ];
                        if (legalAssetType === "StockOption" || legalAssetType === "StockIndexOption") {
                            requestQueue.push({
                                "assetType": legalAssetType,
                                "url": demo.apiUrl + "/ref/v1/instruments?AssetTypes=" + legalAssetType + "&IncludeNonTradable=false&$top=1000&AccountKey=" + encodeURIComponent(demo.user.accountKey),
                                "callback": processOptionSearchResponse
                            });
                        } else if (unsupportedAssetTypes.indexOf(legalAssetType) === -1) {
                            requestQueue.push({
                                "assetType": legalAssetType,
                                "url": demo.apiUrl + "/ref/v1/instruments/details?$top=400&FieldGroups=" + encodeURIComponent("OrderSetting,TradingSessions") + "&AssetTypes=" + legalAssetType,
                                "callback": processDetailsListResponse
                            });
                        } else {
                            console.debug("Ignoring AssetType " + legalAssetType);
                        }
                    });
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    function runJobFromQueue() {
        let job;
        if (requestQueue.length > 0) {
            job = requestQueue.shift();
            console.log("Processing job for AssetType " + job.assetType + ":\r\n" + job.url + "\r\nRequests: " + requestCount + "\r\nJobs in queue: " + requestQueue.length);
            fetch(
                job.url,
                {
                    "method": "GET",
                    "headers": {
                        "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                    }
                }
            ).then(function (response) {
                if (response.ok) {
                    response.json().then(function (responseJson) {
                        job.callback(job.assetType, responseJson);
                    });
                } else {
                    demo.processError(response);
                }
            }).catch(function (error) {
                console.error(error);
            });
            requestCount += 1;
        }
    }

    const refLimitPerMinute = 60;
    setInterval(runJobFromQueue, (refLimitPerMinute / 60 * 1000) + 25);  // A little more, to prevent risk of 429 TooManyRequests
    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnStart", "func": start, "funcsToDisplay": [start, runJobFromQueue]}
    ]);
    demo.displayVersion("ref");
}());
