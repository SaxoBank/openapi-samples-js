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

    function displayAndFormatValue(displayAndFormat, value) {
        let result;
        let integerPart;
        let fractionPart;
        let numerator;
        console.log("DisplayFormat " + displayAndFormat.Format);
        if (value === undefined || value === null) {
            return "(not available)";
        }
        switch (displayAndFormat.Format) {
        case "Normal":  // Standard decimal formatting is used with the Decimals field indicating the number of decimals.
            result = displayAndFormat.Currency + " " + value.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.Decimals, maximumFractionDigits: displayAndFormat.Decimals});
            break;
        case "Percentage":  // Display as percentage, e.g. 12.34%.
            result = value.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.Decimals, maximumFractionDigits: displayAndFormat.Decimals}) + "%";
            break;
        case "AllowDecimalPips":  // Display the last digit as a smaller than the rest of the numbers. Note that this digit is not included in the number of decimals, effectively increasing the number of decimals by one. E.g. 12.345 when Decimals is 2 and DisplayFormat is AllowDecimalPips.
            result = displayAndFormat.Currency + " " + value.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.Decimals, maximumFractionDigits: displayAndFormat.Decimals}) + " " + value.toFixed(displayAndFormat.Decimals + 1).slice(-1);
            break;
        case "Fractions":  // Display as regular fraction i.e. 3 1/4 where 1=numerator and 4=denominator.
            integerPart = parseInt(value);
            fractionPart = value - integerPart;
            numerator = fractionPart * Math.pow(2, displayAndFormat.Decimals);
            numerator = numerator.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.NumeratorDecimals, maximumFractionDigits: displayAndFormat.NumeratorDecimals});
            result = displayAndFormat.Currency + " " + integerPart + " " + numerator + "/" + Math.pow(2, displayAndFormat.Decimals);
            break;
        case "ModernFractions":  // Special US Bonds futures fractional format (1/32s or 1/128s without nominator). If PriceDecimals = -5 then the nominator is 32, else 128.
            integerPart = parseInt(value);
            fractionPart = value - integerPart;
            numerator = fractionPart * Math.pow(2, displayAndFormat.Decimals);
            numerator = numerator.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.NumeratorDecimals, maximumFractionDigits: displayAndFormat.NumeratorDecimals});
            result = displayAndFormat.Currency + " " + integerPart + " " + numerator + "/" + (
                displayAndFormat.Decimals === -5
                ? "32"
                : "128"
            );
            break;
        default:
            console.error("Unsupported format: " + displayAndFormat.Format);
            throw "Unsupported format";
        }
        return result;
    }

    /**
     * Example of formatting positions in a portfolio.
     * @param {string} url The URL to use for the request.
     * @param {string} msg Text to display as comment, followed by the positions.
     * @return {void}
     */
    function getPortfolio(url, msg) {
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
                    let list = "";
                    let position;
                    let i;
                    for (i = 0; i < responseJson.Data.length; i += 1) {
                        position = responseJson.Data[i];
                        list += position.NetPositionView.PositionCount + "x " + position.NetPositionBase.AssetType + " " + position.DisplayAndFormat.Description + " total price " + displayAndFormatValue(position.DisplayAndFormat, position.NetPositionView.MarketValue) + " - open price " + displayAndFormatValue(position.DisplayAndFormat, position.NetPositionView.AverageOpenPrice) + "\n";
                    }
                    console.log(msg + "\n\n" + (
                        list === ""
                        ? "No positions found."
                        : list
                    ));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Example of getting all formatted positions for the your clientKey.
     * @return {void}
     */
    function getPortfolioClient() {
        getPortfolio(
            demo.apiUrl + "/port/v1/netpositions?FieldGroups=NetPositionBase,NetPositionView,DisplayAndFormat&ClientKey=" + encodeURIComponent(demo.user.clientKey),
            "All (netted) positions for client '" + demo.user.clientKey + "'"
        );
    }

    /**
     * Example of getting all formatted positions for your accountGroupKey.
     * @return {void}
     */
    function getPortfolioAccountGroup() {
        if (demo.user.accountGroupKeys[0] === demo.user.clientKey) {
            console.error("AccountGroups are not enabled for this client.");
        } else {
            getPortfolio(
                demo.apiUrl + "/port/v1/netpositions?FieldGroups=NetPositionBase,NetPositionView,DisplayAndFormat&ClientKey=" + encodeURIComponent(demo.user.clientKey) + "&AccountGroupKey=" + encodeURIComponent(demo.user.accountGroupKeys[0]),
                "All (netted) positions for your account group '" + demo.user.accountGroupKeys[0] + "'"
            );
        }
    }

    /**
     * Example of getting all formatted positions for the selected account.
     * @return {void}
     */
    function getPortfolioAccount() {
        getPortfolio(
            demo.apiUrl + "/port/v1/netpositions?FieldGroups=NetPositionBase,NetPositionView,DisplayAndFormat&ClientKey=" + encodeURIComponent(demo.user.clientKey) + "&AccountKey=" + encodeURIComponent(demo.user.accountKey),
            "All (netted) positions for your account '" + demo.user.accountKey + "'"
        );
    }

    /**
     * Example of formatting pending orders.
     * @param {string} url The URL to use for the request.
     * @param {string} msg Text to display as comment, followed by the orders.
     * @return {void}
     */
    function getOrders(url, msg) {
        // Only open orders will be shown.
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
                    let list = "";
                    let order;
                    let i;
                    for (i = 0; i < responseJson.Data.length; i += 1) {
                        order = responseJson.Data[i];
                        list += order.Duration.DurationType + " #" + order.OrderId + ": " + order.BuySell + " " + order.Amount + "x " + order.AssetType + " " + order.DisplayAndFormat.Description + " @ price " + displayAndFormatValue(order.DisplayAndFormat, order.Price) + " (status " + order.Status + ")" + (
                            order.hasOwnProperty("ExternalReference")
                            ? " reference=" + order.ExternalReference
                            : ""
                        ) + "\n";
                    }
                    console.log(msg + "\n\n" + (
                        list === ""
                        ? "No orders found."
                        : list
                    ));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Example of getting all formatted open orders for the your clientKey.
     * @return {void}
     */
    function getOrdersClient() {
        getOrders(
            demo.apiUrl + "/port/v1/orders?FieldGroups=DisplayAndFormat,ExchangeInfo&ClientKey=" + encodeURIComponent(demo.user.clientKey),
            "All open orders for client '" + demo.user.clientKey + "'"
        );
    }

    /**
     * Example of getting all formatted open orders for your accountGroupKey.
     * @return {void}
     */
    function getOrdersAccountGroup() {
        if (demo.user.accountGroupKeys[0] === demo.user.clientKey) {
            console.error("AccountGroups are not enabled for this client.");
        } else {
            getOrders(
                demo.apiUrl + "/port/v1/orders?FieldGroups=DisplayAndFormat,ExchangeInfo&ClientKey=" + encodeURIComponent(demo.user.clientKey) + "&AccountGroupKey=" + encodeURIComponent(demo.user.accountGroupKeys[0]),
                "All open orders for your account group '" + demo.user.accountGroupKeys[0] + "'"
            );
        }
    }

    /**
     * Example of getting all formatted open orders for the selected account.
     * @return {void}
     */
    function getOrdersAccount() {
        getOrders(
            demo.apiUrl + "/port/v1/orders?FieldGroups=DisplayAndFormat,ExchangeInfo&ClientKey=" + encodeURIComponent(demo.user.clientKey) + "&AccountKey=" + encodeURIComponent(demo.user.accountKey),
            "All open orders for your account '" + demo.user.accountKey + "'"
        );
    }

    document.getElementById("idBtnGetPortfolioClient").addEventListener("click", function () {
        demo.run(getPortfolioClient, displayAndFormatValue);
    });
    document.getElementById("idBtnGetPortfolioAccountGroup").addEventListener("click", function () {
        demo.run(getPortfolioAccountGroup, displayAndFormatValue);
    });
    document.getElementById("idBtnGetPortfolioAccount").addEventListener("click", function () {
        demo.run(getPortfolioAccount, displayAndFormatValue);
    });
    document.getElementById("idBtnGetOrdersClient").addEventListener("click", function () {
        demo.run(getOrdersClient, displayAndFormatValue);
    });
    document.getElementById("idBtnGetOrdersAccountGroup").addEventListener("click", function () {
        demo.run(getOrdersAccountGroup, displayAndFormatValue);
    });
    document.getElementById("idBtnGetOrdersAccount").addEventListener("click", function () {
        demo.run(getOrdersAccount, displayAndFormatValue);
    });
    demo.displayVersion("port");
}());
