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
        "selectedAssetType": "-",  // Is required when assetTypesList is available
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
     * List the search result using GroupId.
     * @param {Array<Object>} instrumentList The search result data.
     * @return {string} The items in a list.
     */
    function getGroupedDisplayList(instrumentList) {
        // More info: https://openapi.help.saxo/hc/en-us/articles/4468535563037-What-is-the-purpose-of-GroupId-in-the-instruments-resource-
        let items = [];
        let currentGroupId = NaN;
        instrumentList.forEach(function (instrument) {
            if (instrument.GroupId !== currentGroupId) {
                currentGroupId = instrument.GroupId;
                items.push("+" + instrument.AssetType + " " + instrument.Description);
            } else {
                items.push("    - " + instrument.AssetType + " " + instrument.Description);
            }
        });
        return items.join("\n");
    }

    /**
     * This is an example of instrument search.
     * @return {void}
     */
    function findInstrument() {
        const maxResults = 200;
        const assetType = document.getElementById("idCbxAssetType").value;
        const exchangeId = document.getElementById("idCbxExchange").value;
        const keywords = document.getElementById("idInstrumentName").value + (
            assetType === "ContractFutures"
            ? " continuous"  // By adding this, non tradable FuturesSpaces can be found
            : ""
        );
        let url = demo.apiUrl + "/ref/v1/instruments?$top=" + maxResults + "&AccountKey=" + encodeURIComponent(demo.user.accountKey) + "&Keywords=" + encodeURIComponent(keywords);
        if (exchangeId !== "-") {
            url += "&ExchangeId=" + encodeURIComponent(exchangeId);
        }
        if (assetType !== "-") {
            // You can also specify a consistent group here, like "MiniFuture,WarrantDoubleKnockOut,WarrantKnockOut,WarrantOpenEndKnockOut" for all Turbo's
            url += "&AssetTypes=" + encodeURIComponent(assetType);
        }
        // After a corporate action the instrument might be replaced by a copy with new Uic. The old one becomes non tradable.
        url += "&IncludeNonTradable=" + (
            document.getElementById("idChkTradable").checked
            ? "false"
            : "true"
        );
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
                    let instrument;
                    let result;
                    if (responseJson.Data.length > 0) {
                        instrument = responseJson.Data[0];  // Just take the first instrument - it's a demo
                        // Remember the first Uic for the details request
                        if (instrument.hasOwnProperty("PrimaryListing") && assetType === "Stock") {
                            // Stocks might have a primary listing on another market - take that one
                            instrumentId = instrument.PrimaryListing;
                        } else {
                            // This is not called "Uic", because it can identify an OptionRoot or FuturesSpace as well
                            instrumentId = instrument.Identifier;
                        }
                        switch (instrument.SummaryType) {
                        case "ContractOptionRoot":
                            instrumentIdType = "optionRoot";
                            result = "Click [Get details] for the contract option space of option root " + instrument.Description + ", which is the first search result.";
                            break;
                        case "Instrument":
                            if (assetType === "ContractFutures" && instrument.hasOwnProperty("DisplayHint") && instrument.DisplayHint === "Continuous") {
                                instrumentIdType = "futuresSpace";
                                result = "Click [Get details] for the future space of future " + instrument.Description + ", which is the first search result.";
                            } else {
                                instrumentIdType = "uic";
                                result = "Click [Get details] for the instrument details of " + instrument.Description + ", which is the first search result.";
                            }
                            break;
                        default:
                            console.error("Unknown SummaryType: " + instrument.SummaryType);
                        }
                        result = getGroupedDisplayList(responseJson.Data) + "\n\n" + result;
                    } else {
                        result = "No instruments found.";
                    }
                    // You can search for an ISIN. That will work. But due to market limitations the ISIN won't be in the response.
                    console.log(result + "\n\nResponse: " + JSON.stringify(responseJson, null, 4));
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
        {"evt": "click", "elmId": "idBtnGetExchanges", "func": getExchanges, "funcsToDisplay": [getExchanges]},
        {"evt": "click", "elmId": "idBtnFind", "func": findInstrument, "funcsToDisplay": [findInstrument]},
        {"evt": "click", "elmId": "idBtnGetDetails", "func": getDetails, "funcsToDisplay": [getDetails]}
    ]);
    demo.displayVersion("ref");
}());
