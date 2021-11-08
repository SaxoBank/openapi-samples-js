/*jslint this: true, browser: true, long: true, unordered: true */
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
     * Authenticate using an old app, created before November 1st, 2021.
     * @return {void}
     */
    function getTokenOnLegacyAssetTypes() {
        const stateObject = {
            "redirect": window.location.pathname,  // https://auth0.com/docs/protocols/state-parameters#redirect-users
            "csrfToken": window.localStorage.getItem("csrfToken"),  // https://auth0.com/docs/protocols/state-parameters#csrf-attacks
            "env": "sim"
        };
        const redirectUrl = window.location.protocol + "//" + window.location.host + "/openapi-samples-js/assets/html/redirect.html";
        const href = "https://sim.logonvalidation.net/authorize?response_type=token&state=" + window.btoa(JSON.stringify(stateObject)) + "&redirect_uri=" + encodeURIComponent(redirectUrl) + "&client_id=7194692c30db42efb2c675c6c0fb2a67";
        // Navigate to authentication of legacy app.
        console.log("Redirectiong to " + href);
        window.location.href = href;
    }

    /**
     * Authenticate using an app on Extended AssetTypes.
     * @return {void}
     */
    function getTokenOnExtendedAssetTypes() {
        const href = document.getElementById("idHrefRetrieveToken").href;  // Just copy the regular redirect
        // Navigate to authentication of modern app.
        console.log("Redirectiong to " + href);
        window.location.href = href;
    }

    /**
     * Example of getting the allowed AssetTypes for an account, with or without using Extended AssetTypes.
     * @return {void}
     */
    function getLegalAssetTypes() {
        const headers = {
            "Authorization": "Bearer " + document.getElementById("idBearerToken").value
        };
        if (document.getElementById("idChkExtAsset").checked) {
            headers.Pragma = "oapi-x-extasset";
        }
        fetch(
            demo.apiUrl + "/port/v1/accounts/" + encodeURIComponent(demo.user.accountKey),
            {
                "method": "GET",
                "headers": headers
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    responseJson.LegalAssetTypes.sort();
                    console.log(JSON.stringify(responseJson.LegalAssetTypes, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Example of a search for an instrument with the name iShares, in general an ETF.
     * @return {void}
     */
    function findIshares() {
        const headers = {
            "Authorization": "Bearer " + document.getElementById("idBearerToken").value
        };
        if (document.getElementById("idChkExtAsset").checked) {
            headers.Pragma = "oapi-x-extasset";
        }
        fetch(
            demo.apiUrl + "/ref/v1/instruments?AccountKey=" + encodeURIComponent(demo.user.accountKey) + "&Keywords=ishares",
            {
                "method": "GET",
                "headers": headers
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
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
     * Example of a search for an ETF, with or without using Extended AssetTypes.
     * @return {void}
     */
    function findEtf() {
        const headers = {
            "Authorization": "Bearer " + document.getElementById("idBearerToken").value
        };
        if (document.getElementById("idChkExtAsset").checked) {
            headers.Pragma = "oapi-x-extasset";
        }
        fetch(
            demo.apiUrl + "/ref/v1/instruments?AccountKey=" + encodeURIComponent(demo.user.accountKey) + "&AssetTypes=Etf",
            {
                "method": "GET",
                "headers": headers
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    if (responseJson.Data.length > 0) {
                        document.getElementById("idUic").value = responseJson.Data[0].Identifier;
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
     * Example of getting prices.
     * @param {string} assetType The AssetType of the Uic.
     * @return {void}
     */
    function getPrices(assetType) {
        const headers = {
            "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
            "Content-Type": "application/json; charset=utf-8"
        };
        if (document.getElementById("idChkExtAsset").checked) {
            headers.Pragma = "oapi-x-extasset";
        }
        const data = {
            "ContextId": "MyContextId",
            "ReferenceId": "MyReferenceId" + Date.now(),
            "Arguments": {
                "AccountKey": demo.user.accountKey,
                "Uic": document.getElementById("idUic").value,
                "AssetType": assetType,
                "RequireTradableQuote": true,  // This field lets the server know the prices are used to base trading decisions on
                // DisplayAndFormat gives you the name of the instrument in the snapshot in the response.
                // MarketDepth gives the order book, when available.
                "FieldGroups": ["Quote", /*"MarketDepth",*/ "DisplayAndFormat", "PriceInfoDetails"]
            }
        };
        fetch(
            demo.apiUrl + "/trade/v1/prices/subscriptions",
            {
                "method": "POST",
                "headers": headers,
                "body": JSON.stringify(data)
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
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
     * Request prices and use the AssetType Etf.
     * @return {void}
     */
    function getPricesAsEtf() {
        getPrices("Etf");
    }

    /**
     * Request prices and use the AssetType Stock. For a limited time that will be possible, to make the migration easier.
     * @return {void}
     */
    function getPricesAsStock() {
        getPrices("Stock");
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnGetTokenOnLegacyAssetTypes", "func": getTokenOnLegacyAssetTypes, "funcsToDisplay": [getTokenOnLegacyAssetTypes]},
        {"evt": "click", "elmId": "idBtnGetTokenOnExtendedAssetTypes", "func": getTokenOnExtendedAssetTypes, "funcsToDisplay": [getTokenOnExtendedAssetTypes]},
        {"evt": "click", "elmId": "idBtnGetLegalAssetTypes", "func": getLegalAssetTypes, "funcsToDisplay": [getLegalAssetTypes]},
        {"evt": "click", "elmId": "idBtnSearchIshares", "func": findIshares, "funcsToDisplay": [findIshares]},
        {"evt": "click", "elmId": "idBtnFindEtf", "func": findEtf, "funcsToDisplay": [findEtf]},
        {"evt": "click", "elmId": "idBtnGetPrices", "func": getPricesAsEtf, "funcsToDisplay": [getPricesAsEtf, getPrices]},
        {"evt": "click", "elmId": "idBtnGetPricesAsStock", "func": getPricesAsStock, "funcsToDisplay": [getPricesAsStock, getPrices]}
    ]);
    demo.displayVersion("ref");
}());
