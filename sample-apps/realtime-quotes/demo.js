/*jslint this: true, browser: true, long: true, bitwise: true, unordered: true */
/*global window console demonstrationHelper ParserProtobuf protobuf priceSubscriptionHelper InstrumentRow */

/**
 * Follows WebSocket behaviour defined by spec:
 * https://html.spec.whatwg.org/multipage/web-sockets.html
 */

(function () {
    // Create a helper function to remove some boilerplate code from the example itself.
    const demo = demonstrationHelper({
        "isExtendedAssetTypesRequired": true,  // Adds link to app with Extended AssetTypes
        "responseElm": document.getElementById("idResponse"),
        "javaScriptElm": document.getElementById("idJavaScript"),
        "accessTokenElm": document.getElementById("idBearerToken"),
        "retrieveTokenHref": document.getElementById("idHrefRetrieveToken"),
        "tokenValidateButton": document.getElementById("idBtnValidate"),
        "accountsList": document.getElementById("idCbxAccount"),
        "assetTypesList": document.getElementById("idCbxAssetType"),  // Optional
        "selectedAssetType": "FxSpot",  // Only FX has realtime prices, if Live account is not linked
        "footerElm": document.getElementById("idFooter"),
        "newTokenCallback": function (accessToken) {
            // This doesn't work with the Implicit Flow, used in this sample!
            priceSubscription.extendSubscription(accessToken);
        }
    });
    const priceSubscription = priceSubscriptionHelper(demo);

    /**
     * Find futures by FutureSpaceId.
     * @param {number} futureSpaceId ID from the search.
     * @return {void}
     */
    function findFutureContracts(futureSpaceId) {
        fetch(
            demo.apiUrl + "/ref/v1/instruments/futuresspaces/" + futureSpaceId,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const instrumentList = [];
                    responseJson.Elements.forEach(function (futureContract) {
                        instrumentList.push(futureContract.Uic);
                    });
                    priceSubscription.subscribeToList(instrumentList, document.getElementById("idCbxAssetType").value);
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Find options by ContractRootId.
     * @param {number} optionRootId ID from the search.
     * @return {void}
     */
    function findOptionContracts(optionRootId) {
        fetch(
            demo.apiUrl + "/ref/v1/instruments/contractoptionspaces/" + optionRootId,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const instrumentList = [];
                    responseJson.OptionSpace[0].SpecificOptions.forEach(function (optionContract) {
                        instrumentList.push(optionContract.Uic);
                    });
                    priceSubscription.subscribeToList(instrumentList, document.getElementById("idCbxAssetType").value);
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This is an example of getting all exchanges.
     * @return {void}
     */
    function getExchanges() {
        const cbxExchange = document.getElementById("idCbxExchange");
        cbxExchange.options.length = 1;  // Remove all, except the first
        fetch(
            demo.apiUrl + "/ref/v1/exchanges?$top=1000",  // Get the first 1.000 (actually there are around 200 exchanges available)
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
                    // Populate the list of exchanges, so instruments can be filtered on Exchange
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

    /**
     * Find instruments of the selected AssetType, to create a list with prices.
     * @return {void}
     */
    function find() {
        const assetType = document.getElementById("idCbxAssetType").value;
        const keywords = document.getElementById("idInstrumentName").value + (
            assetType === "ContractFutures"
            ? " continuous"  // By adding this, non tradable FuturesSpaces can be found
            : ""
        );
        let url = demo.apiUrl + "/ref/v1/instruments?AssetTypes=" + assetType + "&IncludeNonTradable=true&$top=100" + "&AccountKey=" + encodeURIComponent(demo.user.accountKey) + "&Keywords=" + encodeURIComponent(keywords);
        if (document.getElementById("idCbxExchange").value !== "-") {
            url += "&ExchangeId=" + encodeURIComponent(document.getElementById("idCbxExchange").value);
        }
        priceSubscription.connect(document.getElementById("idBearerToken").value);
        // Search for instruments
        // You can search for an ISIN. That will work. But due to market limitations the ISIN won't be in the response.
        fetch(
            url,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const instrumentList = [];
                    let instrument;
                    if (responseJson.Data.length > 0) {
                        instrument = responseJson.Data[0];  // Just take the first instrument - it's a demo
                        if (assetType === "ContractFutures" && instrument.hasOwnProperty("DisplayHint") && instrument.DisplayHint === "Continuous") {
                            // We found an future root - get the series
                            findFutureContracts(instrument.Identifier);
                        } else if (instrument.SummaryType === "ContractOptionRoot") {
                            // We found an option root - get the series
                            findOptionContracts(instrument.Identifier);
                        } else {
                            responseJson.Data.forEach(function (instrument) {
                                instrumentList.push(instrument.Identifier);
                            });
                            priceSubscription.subscribeToList(instrumentList, document.getElementById("idCbxAssetType").value);
                        }
                    } else {
                        console.error("No instruments found...");
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
        {"evt": "click", "elmId": "idBtnGetExchanges", "func": getExchanges, "funcsToDisplay": [getExchanges]},
        {"evt": "click", "elmId": "idBtnFind", "func": find, "funcsToDisplay": [find, priceSubscription.subscribeToList]}
    ]);
    demo.displayVersion("trade");
}());
