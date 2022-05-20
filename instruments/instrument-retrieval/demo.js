/*jslint browser: true, long: true, unordered: true */
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
        "assetTypesList": document.getElementById("idCbxAssetType"),  // Optional
        "selectedAssetType": "-",  // Is required when assetTypesList is available - don't select one by default
        "footerElm": document.getElementById("idFooter")
    });
    let requestCount = 0;
    let requestQueue = [];
    let instrumentIds = [];

    /**
     * This is an example of getting all exchanges.
     * @return {void}
     */
    function getExchanges() {
        const cbxExchange = document.getElementById("idCbxExchange");
        cbxExchange.options.length = 1;  // Remove all, except the first
        fetch(
            demo.apiUrl + "/ref/v1/exchanges?$top=1000",  // Get the first 1.000 (actually there are around 225 exchanges available)
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    responseJson.Data.sort(function (a, b) {
                        const nameA = a.Name.toUpperCase();
                        const nameB = b.Name.toUpperCase();
                        if (nameA < nameB) {
                            return -1;
                        }
                        if (nameA > nameB) {
                            return 1;
                        }
                        return 0;
                    });
                    responseJson.Data.forEach(function (exchange) {
                        const option = document.createElement("option");
                        option.text = exchange.Name + " (code " + exchange.ExchangeId + ", mic " + exchange.Mic + ")";
                        option.value = exchange.ExchangeId;
                        cbxExchange.add(option);
                    });
                    console.log("Found " + responseJson.Data.length + " exchanges:\n\n" + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    function processContractOptionSpace(assetType, responseJson) {
        responseJson.OptionSpace.forEach(function (optionSerie) {
            optionSerie.SpecificOptions.forEach(function (specificOption) {
                instrumentIds.push(assetType + "," + specificOption.Uic + ",\"" + responseJson.Exchange.ExchangeId + "\",\"" + responseJson.Description.trim() + " " + optionSerie.DisplayExpiry + " " + specificOption.StrikePrice + " " + specificOption.PutCall + "\"");
            });
        });
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
            const filterOnExchangeId = document.getElementById("idCbxExchange").value;
            if (filterOnExchangeId === "-" || filterOnExchangeId === instrument.Exchange.ExchangeId) {
                instrumentIds.push(instrument.AssetType + "," + instrument.Uic + "," + instrument.Exchange.ExchangeId + ",\"" + instrument.Description.trim() + "\"");
            }
        });
    }

    function processOptionSearchResponse(assetType, responseJson) {
        console.debug("Found " + responseJson.Data.length + " instruments");
        // We have the Uic - collect the details
        responseJson.Data.forEach(function (instrument) {
            const filterOnExchangeId = document.getElementById("idCbxExchange").value;
            // We found an OptionRoot - this must be converted to Uic
            if (filterOnExchangeId === "-" || filterOnExchangeId === instrument.ExchangeId) {
                requestQueue.push({
                    "assetType": assetType,
                    "url": demo.apiUrl + "/ref/v1/instruments/contractoptionspaces/" + instrument.Identifier + "?OptionSpaceSegment=AllDates",
                    "callback": processContractOptionSpace
                });
            }
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
                    document.getElementById("idInstruments").value = "Collecting instruments of LegalAssetTypes:\n" + responseJson.LegalAssetTypes.join("\n");
                    responseJson.LegalAssetTypes.forEach(function (legalAssetType) {
                        const unsupportedAssetTypes = [
                            "Cash"
                        ];
                        const optionAssetTypes = [
                            "StockOption",
                            "StockIndexOption",
                            "FuturesOption",
                            "CfdStockOption",
                            "CfdFutureOption"
                        ];
                        const filterOnAssetType = document.getElementById("idCbxAssetType").value;
                        if (filterOnAssetType === "-" || filterOnAssetType === legalAssetType) {
                            if (optionAssetTypes.indexOf(legalAssetType) !== -1) {
                                // For options, the collection is different - an option root must be found first.
                                requestQueue.push({
                                    "assetType": legalAssetType,
                                    "url": demo.apiUrl + "/ref/v1/instruments?AssetTypes=" + legalAssetType + "&IncludeNonTradable=false&$top=1000&AccountKey=" + encodeURIComponent(demo.user.accountKey),
                                    "callback": processOptionSearchResponse
                                });
                            } else if (unsupportedAssetTypes.indexOf(legalAssetType) === -1) {
                                // Only collect supported AssetTypes.
                                requestQueue.push({
                                    "assetType": legalAssetType,
                                    "url": demo.apiUrl + "/ref/v1/instruments/details?$top=400&FieldGroups=" + encodeURIComponent("OrderSetting,TradingSessions") + "&AssetTypes=" + legalAssetType,
                                    "callback": processDetailsListResponse
                                });
                            } else {
                                console.debug("Ignoring AssetType " + legalAssetType + " (not supported)");
                            }
                        } else {
                            console.debug("Ignoring AssetType " + legalAssetType + " (not in filter)");
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
            console.log("Processing job for AssetType " + job.assetType + ":\r\n" + job.url + "\r\nFound " + instrumentIds.length + " instruments with " + requestCount + " requests.\r\nPending jobs in queue: " + requestQueue.length + "..");
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
    window.setInterval(runJobFromQueue, (refLimitPerMinute / 60 * 1000) + 25);  // A little more, to prevent risk of 429 TooManyRequests
    // Update textarea every 20 seconds.
    window.setInterval(function () {
        document.getElementById("idInstruments").value = instrumentIds.join("\n");
        console.debug("Showing " + instrumentIds.length + " instruments..");
    }, 1000 * 20);

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnGetExchanges", "func": getExchanges, "funcsToDisplay": [getExchanges]},
        {"evt": "click", "elmId": "idBtnStart", "func": start, "funcsToDisplay": [start, runJobFromQueue]}
    ]);
    demo.displayVersion("ref");
}());
