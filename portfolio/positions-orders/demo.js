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
        "footerElm": document.getElementById("idFooter")
    });

    /**
     * Example of formatting a value according to the DisplayAndFormat.
     * @param {Object} displayAndFormat The format rules.
     * @param {number} value The value to be formatted.
     * @return {string} The formatted number.
     */
    function displayAndFormatValue(displayAndFormat, value) {

        /**
         * Round a value to a number of decimals.
         * @return {number} The rounded value.
         */
        function round(valueToRound, decimalPlaces) {
            const factorOfTen = Math.pow(10, decimalPlaces);
            return Math.round(valueToRound * factorOfTen) / factorOfTen;
        }

        /**
         * Return the value as a string, using the DecimalPips display format.
         * @return {string} The formatted value.
         */
        function displayWithDecimalPips() {
            const pipsCodes = [8304, 185, 178, 179, 8308, 8309, 8310, 8311, 8312, 8313];  // Unicode superscript codes of 0..9
            const positionOfDecimalSeparator = String(value).indexOf(".");
            const roundedValue = round(value, displayAndFormat.Decimals + 1);  // Round, so the correct value is shown.
            // Truncate value to allowed decimals:
            const truncatedValue = Math.trunc(roundedValue * Math.pow(10, displayAndFormat.Decimals)) / Math.pow(10, displayAndFormat.Decimals);
            const fractionPart = (
                positionOfDecimalSeparator === -1
                ? String(roundedValue)
                : String(roundedValue).slice(positionOfDecimalSeparator + 1)
            );
            const pipsSymbol = (
                fractionPart.length > displayAndFormat.Decimals
                ? String.fromCharCode(pipsCodes[parseInt(fractionPart.charAt(displayAndFormat.Decimals), 10)])
                : String.fromCharCode(pipsCodes[0])
            );
            return displayAndFormat.Currency + " " + truncatedValue.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.Decimals}) + pipsSymbol;
        }

        /**
         * Return the value as a string, using the Fractions display format.
         * @return {string} The formatted value.
         */
        function displayWithFractions() {
            const integerPart = Math.trunc(value);
            const fractionPart = value - integerPart;
            const numerator = fractionPart * Math.pow(2, displayAndFormat.Decimals);
            const numeratorText = numerator.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.NumeratorDecimals, maximumFractionDigits: displayAndFormat.NumeratorDecimals});
            return displayAndFormat.Currency + " " + integerPart + " " + numeratorText + "/" + Math.pow(2, displayAndFormat.Decimals);
        }

        /**
         * Return the value as a string, using the ModernFractions display format.
         * @return {string} The formatted value.
         */
        function displayWithModernFractions() {
            const integerPart = Math.trunc(value);
            const fractionPart = value - integerPart;
            const numerator = fractionPart * Math.pow(2, displayAndFormat.Decimals);
            const numeratorText = numerator.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.NumeratorDecimals, maximumFractionDigits: displayAndFormat.NumeratorDecimals});
            return displayAndFormat.Currency + " " + integerPart + " " + numeratorText + "/" + (
                displayAndFormat.Decimals === -5
                ? "32"
                : "128"
            );
        }

        if (value === undefined || value === null) {
            return "(not available)";
        }
        if (displayAndFormat.hasOwnProperty("Format")) {
            switch (displayAndFormat.Format) {
            case "Normal":  // Standard decimal formatting is used with the Decimals field indicating the number of decimals.
                return displayAndFormat.Currency + " " + value.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.Decimals, maximumFractionDigits: displayAndFormat.Decimals});
            case "Percentage":  // Display as percentage, e.g. 12.34%.
                return value.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.Decimals, maximumFractionDigits: displayAndFormat.Decimals}) + "%";
            case "AllowDecimalPips":  // Display the last digit smaller than the rest of the numbers. Note that this digit is not included in the number of decimals, effectively increasing the number of decimals by one. E.g. 12.345 when Decimals is 2 and DisplayFormat is AllowDecimalPips.
                return displayWithDecimalPips();
            case "Fractions":  // Display as regular fraction i.e. 3 1/4 where 1=numerator and 4=denominator.
                return displayWithFractions();
            case "ModernFractions":  // Special US Bonds futures fractional format (1/32s or 1/128s without nominator). If PriceDecimals = -5 then the nominator is 32, else 128.
                return displayWithModernFractions();
            default:
                console.error("Unsupported format: " + displayAndFormat.Format);
                throw "Unsupported format";
            }
        } else {
            // No format returned, use "Normal":
            return displayAndFormat.Currency + " " + value.toLocaleString(undefined, {minimumFractionDigits: displayAndFormat.Decimals, maximumFractionDigits: displayAndFormat.Decimals});
        }
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

        const orderType = (
            condition.hasOwnProperty("OpenOrderType")
            ? condition.OpenOrderType  // This is the case for /orders
            : condition.OrderType  // This is the case for /activities
        );
        const symbol = (
            condition.hasOwnProperty("DisplayAndFormat")
            ? condition.DisplayAndFormat.Symbol  // This is the case for /orders
            : condition.Symbol  // This is the case for /activities
        );
        let description = "  - activated when the following condition is met: ";
        let expirationDate;
        switch (orderType) {
        case "StopTrigger":  // Distance
            description += symbol + " " + priceTypeInText() + " price is " + condition.TrailingStopDistanceToMarket + " " + (
                condition.BuySell === "Sell"
                ? "below highest "
                : "above lowest "
            ) + priceTypeInText() + " price";
            break;
        case "BreakoutTrigger":  // Breakout
            description += symbol + " " + priceTypeInText() + " price is outside " + condition.BreakoutTriggerDownPrice + "-" + condition.BreakoutTriggerUpPrice;
            break;
        case "LimitTrigger":  // Price
            description += symbol + " last traded price is at or " + (
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
                    let multiLegOrderId = 0;
                    responseJson.Data.forEach(function (order) {
                        if (order.hasOwnProperty("MultiLegOrderDetails")) {
                            if (order.MultiLegOrderDetails.MultiLegOrderId !== multiLegOrderId) {
                                multiLegOrderId = order.MultiLegOrderDetails.MultiLegOrderId;
                                list += order.MultiLegOrderDetails.Description + "\n";
                            }
                            list += "- ";
                        }
                        list += order.Duration.DurationType + " #" + order.OrderId + ": " + order.BuySell + " " + order.Amount + "x " + order.AssetType + " " + order.DisplayAndFormat.Description + (
                            order.OpenOrderType === "Market"  // This can be the case for conditional orders (Status = WaitCondition)
                            ? " (Market)"
                            : " @ price " + displayAndFormatValue(order.DisplayAndFormat, order.Price)
                        );
                        list += " (status " + order.Status + ")" + (
                            (order.hasOwnProperty("ExternalReference") && order.ExternalReference !== "")
                            ? " reference: " + order.ExternalReference
                            : ""
                        );
                        list += (
                            order.hasOwnProperty("FilledAmount")  // You won't see partial fills on SIM, but they exist on Live!
                            ? " partially filled: " + order.FilledAmount
                            : ""
                        ) + "\n";
                        if (order.Status === "WaitCondition") {
                            // This status indicates that the order is waiting for a condition to be met, it is a "sleeping" order.
                            // This condition can be a price movement on a different instrument and is represented in the SleepingOrderCondition object.
                            list += getConditionInText(order.SleepingOrderCondition) + "\n";
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
                        const activityTime = new Date(order.ActivityTime);
                        const symbol = (
                            order.hasOwnProperty("DisplayAndFormat")
                            ? order.DisplayAndFormat.Symbol  // OrderActivities
                            : order.Symbol  // Activities
                        );
                        list += activityTime.toLocaleString() + " " + order.Duration.DurationType + " #" + order.OrderId + ": " + order.BuySell + " " + order.Amount + "x " + order.AssetType + " " + symbol + " (status " + order.Status + " " + order.SubStatus + ")" + (
                            (order.hasOwnProperty("ExternalReference") && order.ExternalReference !== "")
                            ? " reference: " + order.ExternalReference
                            : ""
                        ) + (
                            order.hasOwnProperty("FilledAmount")  // You won't see partial fills on SIM, but they exist on Live!
                            ? " partially filled: " + order.FilledAmount
                            : ""
                        ) + "\n";
                        if (order.SubStatus === "WaitCondition") {
                            // This status indicates that the order is waiting for a condition to be met, it is a "sleeping" order.
                            // This condition can be a price movement on a different instrument and is represented in the SleepingOrderCondition object.
                            if (order.hasOwnProperty("SleepingOrderCondition")) {
                                list += getConditionInText(order.SleepingOrderCondition) + "\n";
                            } else {
                                list += "  - condition couldn't be displayed." + "\n";
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
     * Example of getting historical orders for the selected client.
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
     * Example of getting historical orders for the selected account group.
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
