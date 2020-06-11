/*jslint this: true, browser: true, for: true, long: true, bitwise: true */
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
        "selectedAssetType": "FxSpot",  // Is required when assetTypesList is available
        "footerElm": document.getElementById("idFooter")
    });
    let entitlementsResponse = {};

    /**
     * This function checks if the user is entitled to have realtime prices for the listed instruments.
     * @return {void}
     */
    function getEntitlements() {
        // Step 1. Get the entitlements for this user - entitlements should be cached, since they don't change often
        // Entitlements can be changed with the Subscriptions tab: https://www.saxotrader.com/d/myAccount (only on live accounts)
        fetch(
            demo.apiUrl + "/port/v1/users/me/entitlements",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    entitlementsResponse = responseJson;
                    console.log("Entitlements:\n" + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This function retrieves the instrument data and does a lookup in the entitlements to see if there is a subscription for realtime prices level 1 or 2.
     * @return {void}
     */
    function getSubscriptionLevels() {

        function getMatch(entitlementsResponse, exchangeId, assetType) {
            const defaultEntitlement = "delayed prices";
            let i;
            let j;
            let entitlement;
            for (i = 0; i < entitlementsResponse.Data.length; i += 1) {
                if (entitlementsResponse.Data[i].ExchangeId === exchangeId) {
                    for (j = 0; j < entitlementsResponse.Data[i].Entitlements.length; j += 1) {
                        entitlement = entitlementsResponse.Data[i].Entitlements[j];
                        if (entitlement.hasOwnProperty("RealTimeTopOfBook") && entitlement.RealTimeTopOfBook.indexOf(assetType) !== -1) {
                            return "realtime prices (top of book/level 1)";
                        }
                        if (entitlement.hasOwnProperty("RealTimeFullBook") && entitlement.RealTimeFullBook.indexOf(assetType) !== -1) {
                            return "realtime prices (full book/level 2)";
                        }
                    }
                    return defaultEntitlement;
                }
            }
            return defaultEntitlement;
        }

        const uics = document.getElementById("idUics").value;
        const assetType = document.getElementById("idCbxAssetType").value;
        fetch(
            demo.apiUrl + "/ref/v1/instruments/details?Uics=" + uics + "&AssetTypes=" + assetType + "&AccountKey=" + encodeURIComponent(demo.user.accountKey),
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    let result = "";
                    responseJson.Data.forEach(function (instrument) {
                        const entitlementDescription = getMatch(entitlementsResponse, instrument.Exchange.ExchangeId, assetType);
                        result += instrument.Uic + ": " + instrument.AssetType + " " + instrument.Description + ": " + entitlementDescription + "\n";
                    });
                    console.log(result);
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    document.getElementById("idBtnGetEntitlements").addEventListener("click", function () {
        demo.run(getEntitlements);
    });
    document.getElementById("idBtnGetSubscriptionLevels").addEventListener("click", function () {
        demo.run(getSubscriptionLevels);
    });
    demo.displayVersion("port");
}());
