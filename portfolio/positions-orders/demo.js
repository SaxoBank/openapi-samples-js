/*jslint browser: true, long: true */
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

    function displayAndFormatValue(displayAndFormat, value) {
        let result;
        let integerPart;
        let fractionPart;
        let numerator;
        console.log("DisplayFormat " + displayAndFormat.Format);
        if (value === undefined || value === null) {
            return "(not available)";
        }
        if (displayAndFormat.hasOwnProperty("Format")) {
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
        } else {
            // No format returned, use "Normal":
            result = displayAndFormat.Currency + " " + value.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.Decimals, maximumFractionDigits: displayAndFormat.Decimals});
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
                    responseJson.Data.forEach(function (position) {
                        list += position.NetPositionBase.Amount + "x " + position.NetPositionBase.AssetType + " " + position.DisplayAndFormat.Description + " total price " + displayAndFormatValue(position.DisplayAndFormat, position.NetPositionView.MarketValue) + " - open price " + displayAndFormatValue(position.DisplayAndFormat, position.NetPositionView.AverageOpenPrice) + "\n";
                    });
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
     * Example of getting all formatted positions for the clientKey.
     * @return {void}
     */
    function getPortfolioClient() {
        getPortfolio(
            demo.apiUrl + "/port/v1/netpositions?FieldGroups=NetPositionBase,NetPositionView,DisplayAndFormat&ClientKey=" + encodeURIComponent(demo.user.clientKey),
            "All (netted) positions for client '" + demo.user.clientKey + "'."
        );
    }

    /**
     * Example of getting all formatted positions for the accountGroupKey.
     * @return {void}
     */
    function getPortfolioAccountGroup() {
        if (demo.user.accountGroupKeys[0] === demo.user.clientKey) {
            console.error("AccountGroups are not enabled for this client.");
        } else {
            getPortfolio(
                demo.apiUrl + "/port/v1/netpositions?FieldGroups=NetPositionBase,NetPositionView,DisplayAndFormat&ClientKey=" + encodeURIComponent(demo.user.clientKey) + "&AccountGroupKey=" + encodeURIComponent(demo.user.accountGroupKeys[0]),
                "All (netted) positions for your account group '" + demo.user.accountGroupKeys[0] + "'."
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
            "All (netted) positions for your account '" + demo.user.accountKey + "'."
        );
    }

    /**
     * Create a description of the condition in case of conditional orders (aka sleeping orders).
     * @param {Object} condition The condition of the sleeping order.
     * @return {string} Textual representation of the condition.
     */
    function getConditionInText(condition) {

        function priceTypeInText() {
            switch (condition.TriggerPriceType) {
            case "LastTraded":
                return "last traded";
            default:
                return condition.TriggerPriceType.toLowerCase();
            }
        }

        let description = "  - activated when the following condition is met: ";
        let expirationDate;
        switch (condition.OpenOrderType) {
        case "StopTrigger":  // Distance
            description += condition.DisplayAndFormat.Description + " " + priceTypeInText() + " price is " + condition.TrailingStopDistanceToMarket + " " + (
                condition.BuySell === "Sell"
                ? "above lowest "
                : "below highest "
            ) + priceTypeInText() + " price";
            break;
        case "BreakoutTrigger":  // Breakout
            description += condition.DisplayAndFormat.Description + " " + priceTypeInText() + " price is outside " + condition.BreakoutTriggerDownPrice + "-" + condition.BreakoutTriggerUpPrice;
            break;
        case "LimitTrigger":  // Price
            description += condition.DisplayAndFormat.Description + " last traded price is at or " + (
                condition.BuySell === "Sell"
                ? "above"
                : "below"
            ) + " " + condition.Price;
            break;
        }
        description += ". ";
        switch (condition.Duration.DurationType) {
        case "GoodTillDate":
            expirationDate = new Date(condition.Duration.ExpirationDate);
            description += "Valid until trade day " + expirationDate.toLocaleDateString() + ".";
            break;
        case "DayOrder":
            description += "Valid for current trade day.";
            break;
        case "GoodTillCancel":
            description += "Valid until met or canceled.";
            break;
        }
        return description;
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
                    responseJson.Data.forEach(function (order) {
                        const conditionalOrderTypes = ["LimitTrigger", "BreakoutTrigger", "StopTrigger"];
                        if (conditionalOrderTypes.indexOf(order.OpenOrderType) < 0) {
                            list += order.Duration.DurationType + " #" + order.OrderId + ": " + order.BuySell + " " + order.Amount + "x " + order.AssetType + " " + order.DisplayAndFormat.Description + (
                                order.OpenOrderType === "Market"  // This can be the case for conditional orders (Status = WaitCondition)
                                ? " (Market)"
                                : " @ price " + displayAndFormatValue(order.DisplayAndFormat, order.Price)
                            );
                            list += " (status " + order.Status + ")" + (
                                order.hasOwnProperty("ExternalReference")
                                ? " reference: " + order.ExternalReference
                                : ""
                            );
                            list += (
                                order.hasOwnProperty("FilledAmount")  // You won't see partial fills on SIM, but they exist on Live!
                                ? " partially filled: " + order.FilledAmount
                                : ""
                            ) + "\n";
                            if (order.hasOwnProperty("SleepingOrderCondition")) {
                                // When this object is available, the order is "sleeping", waiting for a condition to be reached.
                                // This condition can be a price movement of a different instrument.
                                list += getConditionInText(order.SleepingOrderCondition) + "\n"
                            }
                        }
                    });
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
     * Example of getting all formatted open orders for the clientKey.
     * @return {void}
     */
    function getOrdersClient() {
        getOrders(
            demo.apiUrl + "/port/v1/orders?Status=All&FieldGroups=DisplayAndFormat,ExchangeInfo&ClientKey=" + encodeURIComponent(demo.user.clientKey),
            "All open orders for client '" + demo.user.clientKey + "'."
        );
    }

    /**
     * Example of getting all formatted open orders for the accountGroupKey.
     * @return {void}
     */
    function getOrdersAccountGroup() {
        if (demo.user.accountGroupKeys[0] === demo.user.clientKey) {
            console.error("AccountGroups are not enabled for this client.");
        } else {
            getOrders(
                demo.apiUrl + "/port/v1/orders?Status=All&FieldGroups=DisplayAndFormat,ExchangeInfo&ClientKey=" + encodeURIComponent(demo.user.clientKey) + "&AccountGroupKey=" + encodeURIComponent(demo.user.accountGroupKeys[0]),
                "All open orders for your account group '" + demo.user.accountGroupKeys[0] + "'."
            );
        }
    }

    /**
     * Example of getting all formatted open orders for the selected account.
     * @return {void}
     */
    function getOrdersAccount() {
        getOrders(
            demo.apiUrl + "/port/v1/orders?Status=All&FieldGroups=DisplayAndFormat,ExchangeInfo&ClientKey=" + encodeURIComponent(demo.user.clientKey) + "&AccountKey=" + encodeURIComponent(demo.user.accountKey),
            "All open orders for your account '" + demo.user.accountKey + "'."
        );
    }

    /**
     * Example of formatting historical orders.
     * @param {string} url The URL to use for the request.
     * @param {string} msg Text to display as comment, followed by the orders.
     * @param {number} daysInThePast Start of the range.
     * @return {void}
     */
    function getHistoricalOrders(url, msg, daysInThePast) {

        /**
         * Prefix number with zero, if it has one digit.
         * @param {number} n The one or two digit number representing day or month.
         * @return {string} The formatted numer.
         */
        function addLeadingZeroes(n) {
            if (n <= 9) {
                return "0" + n;
            }
            return n;
        }

        const fromDate = new Date();
        let fromDateString;
        fromDate.setDate(fromDate.getDate() - daysInThePast);
        fromDateString = fromDate.getFullYear() + "-" + addLeadingZeroes(fromDate.getMonth() + 1) + "-" + addLeadingZeroes(fromDate.getDate()) + "T00:00:00.000Z";
        url += "&FromDateTime=" + encodeURIComponent(fromDateString);
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
                    responseJson.Data.forEach(function (order) {
                        switch (order.OrderType) {
                        case "LimitTrigger":
                            list += "Conditional order of type " + order.OrderType;
                            break;
                        case "BreakoutTrigger":
                            list += "Conditional order of type " + order.OrderType;
                            break;
                        case "StopTrigger":
                            list += "Conditional order of type " + order.OrderType;
                            break;
                        default:
                            list += order.Duration.DurationType + " #" + order.OrderId + ": " + order.BuySell + " " + order.Amount + "x " + order.AssetType;
                        }
                        list += " (status " + order.Status + " " + order.SubStatus + ")" + (
                            order.hasOwnProperty("ExternalReference")
                            ? " reference: " + order.ExternalReference
                            : ""
                        ) + (
                            order.hasOwnProperty("FilledAmount")  // You won't see partial fills on SIM, but they exist on Live!
                            ? " partially filled: " + order.FilledAmount
                            : ""
                        ) + "\n";
                    });
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
     * Example of getting historical orders for the selected account.
     * @return {void}
     */
    function getHistoricalOrdersClient() {
        const daysInThePast = 21;
        getHistoricalOrders(
            demo.apiUrl + "/cs/v1/audit/orderactivities?IncludeSubAccounts=false&EntryType=Last&FieldGroups=DisplayAndFormat&ClientKey=" + encodeURIComponent(demo.user.clientKey),
            "Historical orders from past " + daysInThePast + " days for client '" + demo.user.clientKey + "'.",
            daysInThePast
        );
    }

    /**
     * Example of getting historical orders for the selected account.
     * @return {void}
     */
    function getHistoricalOrdersAccountGroup() {
        const daysInThePast = 21;
        if (demo.user.accountGroupKeys[0] === demo.user.clientKey) {
            console.error("AccountGroups are not enabled for this client.");
        } else {
            getHistoricalOrders(
                demo.apiUrl + "/cs/v1/audit/orderactivities?IncludeSubAccounts=false&EntryType=Last&FieldGroups=DisplayAndFormat&ClientKey=" + encodeURIComponent(demo.user.clientKey) + "&AccountGroupKey=" + encodeURIComponent(demo.user.accountGroupKey),
                "Historical orders from past " + daysInThePast + " days for account group '" + demo.user.accountGroupKeys[0] + "'.",
                daysInThePast
            );
        }
    }

    /**
     * Example of getting historical orders for the selected account.
     * @return {void}
     */
    function getHistoricalOrdersAccount() {
        const daysInThePast = 21;
        getHistoricalOrders(
            demo.apiUrl + "/cs/v1/audit/orderactivities?IncludeSubAccounts=false&EntryType=Last&FieldGroups=DisplayAndFormat&ClientKey=" + encodeURIComponent(demo.user.clientKey) + "&AccountKey=" + encodeURIComponent(demo.user.accountKey),
            "Historical orders from past " + daysInThePast + " days for account '" + demo.user.accountKey + "'.",
            daysInThePast
        );
    }

    /**
     * Example of getting historical orders using the ENS endpoint - more on this in the websockets sample.
     * @return {void}
     */
    function getHistoricalOrdersViaEns() {
        const daysInThePast = 13;  // ENS allows max 14 days back
        getHistoricalOrders(
            demo.apiUrl + "/ens/v1/activities?Activities=Orders",
            "Historical orders from past " + daysInThePast + " days.",
            daysInThePast
        );
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnGetPortfolioClient", "func": getPortfolioClient, "funcsToDisplay": [getPortfolioClient, getPortfolio, displayAndFormatValue]},
        {"evt": "click", "elmId": "idBtnGetPortfolioAccountGroup", "func": getPortfolioAccountGroup, "funcsToDisplay": [getPortfolioAccountGroup, getPortfolio, displayAndFormatValue]},
        {"evt": "click", "elmId": "idBtnGetPortfolioAccount", "func": getPortfolioAccount, "funcsToDisplay": [getPortfolioAccount, getPortfolio, displayAndFormatValue]},
        {"evt": "click", "elmId": "idBtnGetOrdersClient", "func": getOrdersClient, "funcsToDisplay": [getOrdersClient, getOrders, displayAndFormatValue]},
        {"evt": "click", "elmId": "idBtnGetOrdersAccountGroup", "func": getOrdersAccountGroup, "funcsToDisplay": [getOrdersAccountGroup, getOrders, displayAndFormatValue]},
        {"evt": "click", "elmId": "idBtnGetOrdersAccount", "func": getOrdersAccount, "funcsToDisplay": [getOrdersAccount, getOrders, displayAndFormatValue]},
        {"evt": "click", "elmId": "idBtnGetHistoricalOrdersClient", "func": getHistoricalOrdersClient, "funcsToDisplay": [getHistoricalOrdersClient, getHistoricalOrders, displayAndFormatValue]},
        {"evt": "click", "elmId": "idBtnGetHistoricalOrdersAccountGroup", "func": getHistoricalOrdersAccountGroup, "funcsToDisplay": [getHistoricalOrdersAccountGroup, getHistoricalOrders, displayAndFormatValue]},
        {"evt": "click", "elmId": "idBtnGetHistoricalOrdersAccount", "func": getHistoricalOrdersAccount, "funcsToDisplay": [getHistoricalOrdersAccount, getHistoricalOrders, displayAndFormatValue]},
        {"evt": "click", "elmId": "idBtnGetHistoricalOrdersViaEns", "func": getHistoricalOrdersViaEns, "funcsToDisplay": [getHistoricalOrdersViaEns, displayAndFormatValue]}
    ]);
    demo.displayVersion("port");
}());
