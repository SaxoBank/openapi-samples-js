/*jslint this: true, browser: true, for: true, long: true */
/*global window console demonstrationHelper */

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
        "selectedAssetType": "Stock",  // Is required when assetTypesList is available
        "footerElm": document.getElementById("idFooter")
    });
    let instrumentId;
    let instrumentIdType;

    /**
     * This is an example of getting all exchanges.
     * @return {void}
     */
    function getExchanges() {
        const cbxExchange = document.getElementById("idCbxExchange");
        let option;
        let i;
        for (i = cbxExchange.options.length - 1; i > 0; i -= 1) {
            cbxExchange.remove(i);  // Remove all, except the first
        }
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
                    let j;
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
                    for (j = 0; j < responseJson.Data.length; j += 1) {
                        option = document.createElement("option");
                        option.text = responseJson.Data[j].Name + " (code " + responseJson.Data[j].ExchangeId + ", mic " + responseJson.Data[j].Mic + ")";
                        option.value = responseJson.Data[j].ExchangeId;
                        cbxExchange.add(option);
                    }
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
     * This function collects all available AssetTypes for the active account, so you don't search for something you won't find because it is not available.
     * @param {Function=} callback An optional function to run after a successful request.
     * @return {void}
     */
    function getLegalAssetTypes(callback) {
        const cbxAssetType = document.getElementById("idCbxAssetType");
        let option;
        let i;
        for (i = cbxAssetType.options.length - 1; i >= 0; i -= 1) {
            cbxAssetType.remove(i);
        }
        fetch(
            demo.apiUrl + "/port/v1/accounts/" + encodeURIComponent(demo.user.accountKey),
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    let j;
                    responseJson.LegalAssetTypes.sort();  // Sort the list for reading purposes
                    for (j = 0; j < responseJson.LegalAssetTypes.length; j += 1) {
                        option = document.createElement("option");
                        option.text = responseJson.LegalAssetTypes[j];
                        option.value = responseJson.LegalAssetTypes[j];
                        if (option.value === "Stock") {
                            // Make the most common type the default one
                            option.setAttribute("selected", true);
                        }
                        cbxAssetType.add(option);
                    }
                    if (callback !== undefined) {
                        callback();
                    }
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This is an example of instrument search.
     * @return {void}
     */
    function findInstrument() {
        const assetType = document.getElementById("idCbxAssetType").value;
        const keywords = document.getElementById("idInstrumentName").value + (
            assetType === "ContractFutures"
            ? " continuous"  // By adding this, non tradable FuturesSpaces can be found
            : ""
        );
        let url = demo.apiUrl + "/ref/v1/instruments?AssetTypes=" + assetType + "&IncludeNonTradable=true&$top=10" + "&AccountKey=" + encodeURIComponent(demo.user.accountKey) + "&Keywords=" + encodeURIComponent(keywords);
        if (document.getElementById("idCbxExchange").value !== "-") {
            url += "&ExchangeId=" + encodeURIComponent(document.getElementById("idCbxExchange").value);
        }
        if (document.getElementById("idChkMultiLeg").checked) {
            url += "&CanParticipateInMultiLegOrder=true";
        }
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
                    const identifierIsOptionRoot = ["CfdIndexOption", "FuturesOption", "StockIndexOption", "StockOption"];
                    if (responseJson.Data.length > 0) {
                        // Remember the first Uic for the details request
                        if (responseJson.Data[0].hasOwnProperty("PrimaryListing") && assetType === "Stock") {
                            // Stocks might have a primary listing on another market - take that one
                            instrumentId = responseJson.Data[0].PrimaryListing;
                        } else {
                            // This is not called "Uic", because it can identify an OptionRoot or FuturesSpace as well
                            instrumentId = responseJson.Data[0].Identifier;
                        }
                        if (assetType === "ContractFutures" && responseJson.Data[0].hasOwnProperty("DisplayHint") && responseJson.Data[0].DisplayHint === "Continuous") {
                            instrumentIdType = "futuresSpace";
                        } else if (identifierIsOptionRoot.indexOf(assetType) !== -1) {
                            instrumentIdType = "optionRoot";
                        } else {
                            instrumentIdType = "uic";
                        }
                    }
                    console.log(JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This is an example of getting instrument details, option or future series.
     * @return {void}
     */
    function getDetails() {
        const assetType = document.getElementById("idCbxAssetType").value;
        let urlPath;
        switch (instrumentIdType) {
        case "optionRoot":  // This identifier is not a Uic, but an option root. Contracts can be retrieved.
            urlPath = "/ref/v1/instruments/contractoptionspaces/" + instrumentId;
            break;
        case "futuresSpace":  // This identifier is not a Uic, but a futures space.
            urlPath = "/ref/v1/instruments/futuresspaces/" + instrumentId;
            break;
        default:
            urlPath = "/ref/v1/instruments/details/" + instrumentId + "/" + assetType;
        }
        fetch(
            demo.apiUrl + urlPath,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    switch (instrumentIdType) {
                    case "optionRoot":
                        instrumentId = responseJson.OptionSpace[0].SpecificOptions[0].Uic;  // Select first contract
                        instrumentIdType = "uic";
                        console.log("The search result contained an option root (# " + instrumentId + ").\nThese are the contracts with their Uics (request details again for first contract):\n\n" + JSON.stringify(responseJson, null, 4));
                        break;
                    case "futuresSpace":
                        instrumentId = responseJson.Elements[0].Uic;  // Select first future
                        instrumentIdType = "uic";
                        console.log("The search result contained a futures space (# " + instrumentId + ").\nThese are the futures in this space, with their Uics (request details again for first future):\n\n" + JSON.stringify(responseJson, null, 4));
                        break;
                    default:
                        console.log("These are the details of this instrument:\n\n" + JSON.stringify(responseJson, null, 4));
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
        {"evt": "change", "elmId": "idCbxAccount", "func": getLegalAssetTypes, "funcsToDisplay": [getLegalAssetTypes], "isDelayedRun": true},
        {"evt": "click", "elmId": "idBtnGetExchanges", "func": getExchanges, "funcsToDisplay": [getExchanges]},
        {"evt": "click", "elmId": "idBtnFind", "func": findInstrument, "funcsToDisplay": [findInstrument]},
        {"evt": "click", "elmId": "idBtnGetDetails", "func": getDetails, "funcsToDisplay": [getDetails]}
    ]);
    demo.displayVersion("ref");
}());
