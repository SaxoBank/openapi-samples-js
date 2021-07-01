/*jslint browser: true, long: true, unordered: true */
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
        "footerElm": document.getElementById("idFooter")
    });
    let instrumentIds;

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
                        if (exchange.ExchangeId === "CATS_SAXO") {
                            // This is the exchange where Binck Turbo's are traded. Select this exchange by default.
                            option.setAttribute("selected", true);
                        }
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
     * This is an example of filtering turbos.
     * @return {void}
     */
    function findInstrument() {
        const issuer = document.getElementById("idCbxIssuer").value;
        const underlyingAssetType = document.getElementById("idCbxUnderlyingAssetType").value;
        const keywords = document.getElementById("idInstrumentName").value;
        const underlyingUic = document.getElementById("idUnderlyingUic").value;
        const exchangeId = document.getElementById("idCbxExchange").value;
        const barrierPriceFrom = document.getElementById("idBarrierPriceFrom").value;
        const barrierPriceTo = document.getElementById("idBarrierPriceTo").value;
        const tradePerspective = document.getElementById("idCbxTradePerspective").value;
        const orderBy = document.getElementById("idCbxOrderBy").value;
        let url = demo.apiUrl + "/ref/v1/instruments?AssetTypes=" + encodeURIComponent("MiniFuture,WarrantDoubleKnockOut,WarrantKnockOut,WarrantOpenEndKnockOut") + "&$top=1000&AccountKey=" + encodeURIComponent(demo.user.accountKey) + "&Keywords=" + encodeURIComponent(keywords);
        if (issuer !== "-") {
            url += "&Issuers=" + encodeURIComponent(issuer);
        }
        if (underlyingAssetType !== "-") {
            url += "&UnderlyingAssetTypes=" + encodeURIComponent(underlyingAssetType);
        }
        if (exchangeId !== "-") {
            url += "&ExchangeId=" + encodeURIComponent(exchangeId);
        }
        if (underlyingUic !== "") {
            url += "&UnderlyingUics=" + encodeURIComponent(underlyingUic);
        }
        if (barrierPriceFrom !== "0") {
            url += "&BarrierPriceFrom=" + encodeURIComponent(barrierPriceFrom);
        }
        if (barrierPriceTo !== "0") {
            url += "&BarrierPriceTo=" + encodeURIComponent(barrierPriceTo);
        }
        if (tradePerspective !== "-") {
            url += "&TradePerspectives=" + encodeURIComponent(tradePerspective);
        }
        if (orderBy !== "-") {
            url += "&OrderBy=" + encodeURIComponent(orderBy);
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
                    let result;
                    instrumentIds = [];
                    if (responseJson.Data.length > 0) {
                        result = "Found instruments:\n";
                        responseJson.Data.forEach(function (instrument) {
                            result += instrument.Description + " (" + instrument.AssetType + ", underlying " + instrument.UnderlyingAssetType + " " + instrument.UnderlyingDescription + "/Uic " + instrument.UnderlyingUic + ")\n";
                            // Remember the list, so it can be used to get details.
                            instrumentIds.push({
                                "uic": instrument.Identifier,
                                "assetType": instrument.AssetType
                            });
                        });
                    } else {
                        result = "No results.\n";
                    }
                    // You can search for an ISIN. That will work. But due to market limitations the ISIN won't be in the response.
                    console.log(result + "\n" + JSON.stringify(responseJson, null, 4));
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
        const assetTypes = [];
        const uics = [];
        instrumentIds.forEach(function (instrumentId, i) {
            // Do this only for the first 100 instruments
            if (i < 100) {
                i += 1;
                uics.push(instrumentId.uic);
                if (assetTypes.indexOf(instrumentId.assetType) === -1) {
                    assetTypes.push(instrumentId.assetType);
                }
            }
        });
        fetch(
            demo.apiUrl + "/ref/v1/instruments/details?AssetTypes=" + encodeURIComponent(assetTypes.join(",")) + "&Uics=" + encodeURIComponent(uics.join(",")),
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    let result;
                    if (responseJson.Data.length > 0) {
                        result = "Found instrument details:\n";
                        responseJson.Data.forEach(function (instrument) {
                            const issueDate = new Date(instrument.IssueDate);
                            result += instrument.Description + " (" + instrument.AssetType + ", underlying " + instrument.UnderlyingAssetType + " " + instrument.UnderlyingDescription + "/Uic " + instrument.UnderlyingUic + ")\n";
                            result += "- Barrier " + instrument.Barrier + ", strike " + instrument.StrikePrice + ", distance " + instrument.BarrierDistance + ", issued on " + issueDate.toLocaleDateString() + " by " + instrument.IssuerName + " (" + instrument.IssuerCountry + ")\n";
                        });
                    } else {
                        result = "No results.\n";
                    }
                    // You can search for an ISIN. That will work. But due to market limitations the ISIN won't be in the response.
                    console.log(result + "\n" + JSON.stringify(responseJson, null, 4));
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
