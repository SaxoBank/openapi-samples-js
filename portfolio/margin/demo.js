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
        "footerElm": document.getElementById("idFooter")
    });

    /**
     * This is an example of getting the margin.
     * @return {void}
     */
    function getBalances(url, result) {
        fetch(
            demo.apiUrl + url,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    result += "\n\nMarginAvailableForTrading: " + responseJson.Currency + " " + responseJson.MarginAvailableForTrading.toLocaleString(undefined, {
                        minimumFractionDigits: responseJson.CurrencyDecimals,
                        maximumFractionDigits: responseJson.CurrencyDecimals
                    });
                    result += "\n\nResponse: " + JSON.stringify(responseJson, null, 4);
                    console.log(result);
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This is an example of getting the margin.
     * @return {void}
     */
    function getMargin() {
        // First, get the account details to see if it is cross margined...
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
                    let result = "Account settings for the margin calculation (account " + responseJson.AccountKey + "):";
                    let balancesUrl = "/port/v1/balances?FieldGroups=MarginOverview&ClientKey=" + encodeURIComponent(responseJson.ClientKey);
                    if (responseJson.IsMarginTradingAllowed) {
                        result += "\nCanUseCashPositionsAsMarginCollateral: " + responseJson.CanUseCashPositionsAsMarginCollateral;
                        result += "\nUseCashPositionsAsMarginCollateral: " + responseJson.UseCashPositionsAsMarginCollateral;
                        result += "\nMarginCalculationMethod: " + responseJson.MarginCalculationMethod;
                        if (responseJson.IndividualMargining) {
                            // Margin is calculated based on the individual account:
                            balancesUrl += "&AccountKey=" + encodeURIComponent(responseJson.AccountKey);
                            result += "\nIndividualMargining applies. Margin is calculated on Account level..";
                        } else {
                            // Margin might be calculated on accountGroup level (if supported), or on client level:
                            if (responseJson.AccountGroupKey === responseJson.ClientKey) {
                                result += "\nCrossMargining, but no AccountGroups available. Margin is calculated on Client level..";
                            } else {
                                // AccountGroups are supported for this client - request on account group level:
                                balancesUrl += "&AccountGroupKey=" + encodeURIComponent(responseJson.AccountGroupKey);
                                result += "\nCrossMargining. Margin is calculated on AccountGroup level..";
                            }
                        }
                        result += "\n\nUsing endpoint: GET " + balancesUrl;
                        getBalances(balancesUrl, result);
                    } else {
                        result += "\nMarging trading is not allowed for this account with type " + responseJson.AccountType;
                        console.log(result);
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
     * Get margin overview for a client, account group or an account.
     * @return {void}
     */
    function getMarginOverview() {
        fetch(
            demo.apiUrl + "/port/v1/balances/marginoverview?ClientKey=" + demo.user.clientKey + "&AccountKey=" + encodeURIComponent(demo.user.accountKey),
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
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

    document.getElementById("idCbxAccount").addEventListener("change", function () {
        demo.run(getMargin);
    });
    document.getElementById("idBtnGetMargin").addEventListener("click", function () {
        demo.run(getMargin, getBalances);
    });
    document.getElementById("idBtnGetMarginOverview").addEventListener("click", function () {
        demo.run(getMarginOverview);
    });
    demo.displayVersion("port");
}());
