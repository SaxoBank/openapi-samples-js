/*jslint browser: true, long: true */
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
    let positionNettingMode = "?";

    /**
     * Example of NettingMode retrieval. This mode tells weather to show RealTime netted orders, or EndOfDay.
     * @return {void}
     */
    function getNettingMode() {
        fetch(
            demo.apiUrl + "/port/v1/clients/me",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    let description = "Netting mode is set to " + responseJson.PositionNettingMode + ".";
                    positionNettingMode = responseJson.PositionNettingMode;
                    console.log(description + "\n\nResponse:\n" + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Example of NettingMode retrieval. This mode tells weather to show RealTime netted orders, or EndOfDay.
     * @return {void}
     */
    function updateNettingMode() {
        if (positionNettingMode === "Intraday") {
            positionNettingMode = "EndOfDay";
        } else {
            positionNettingMode = "Intraday";
        }
        fetch(
            demo.apiUrl + "/port/v1/clients/me",
            {
                "method": "PATCH",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                    "Content-Type": "application/json; charset=utf-8"
                },
                "body": JSON.stringify({
                    "NewPositionNettingMode": positionNettingMode
                })
            }
        ).then(function (response) {
            if (response.ok) {
                console.log("Netting mode set to " + positionNettingMode + ".");
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Display a price value using the format from the Api.
     * @param {Object} displayAndFormat The description of formatting.
     * @param {number} value The number to be formatted.
     * @return {string} The formatted number.
     */
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
     * Example of getting all netted formatted positions for your clientKey.
     * @return {void}
     */
    function getOpenNetPositions() {
        fetch(
            demo.apiUrl + "/port/v1/netpositions?FieldGroups=NetPositionBase,NetPositionView,DisplayAndFormat&ClientKey=" + encodeURIComponent(demo.user.clientKey),
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
                    console.log("All (netted) positions for client '" + demo.user.clientKey + "' using netting mode " + positionNettingMode + ".\n\n" + (
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
     * Example of getting all formatted positions for your clientKey.
     * @return {void}
     */
    function getOpenPositions() {
        fetch(
            demo.apiUrl + "/port/v1/positions?FieldGroups=PositionBase,PositionView,DisplayAndFormat&ClientKey=" + encodeURIComponent(demo.user.clientKey),
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
                        list += position.PositionBase.Amount + "x " + position.PositionBase.AssetType + " " + position.DisplayAndFormat.Description + " total price " + displayAndFormatValue(position.DisplayAndFormat, position.PositionView.MarketValue) + " - open price " + displayAndFormatValue(position.DisplayAndFormat, position.PositionView.AverageOpenPrice) + "\n";
                    });
                    console.log("All positions for client '" + demo.user.clientKey + "' using netting mode " + positionNettingMode + ".\n\n" + (
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
     * Example of getting all formatted positions for your clientKey.
     * @return {void}
     */
    function getClosedPositions() {
        fetch(
            demo.apiUrl + "/port/v1/closedpositions?FieldGroups=ClosedPosition,DisplayAndFormat&ClientKey=" + encodeURIComponent(demo.user.clientKey),
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
                    if (responseJson.hasOwnProperty("Data")) {
                        responseJson.Data.forEach(function (position) {
                            list += position.ClosedPosition.Amount + "x " + position.ClosedPosition.AssetType + " " + position.DisplayAndFormat.Description + " total price " + displayAndFormatValue(position.DisplayAndFormat, position.ClosedPosition.ClosingMarketValue) + " - open price " + displayAndFormatValue(position.DisplayAndFormat, position.ClosedPosition.OpenPrice) + "\n";
                        });
                    }
                    console.log("All closed positions for client '" + demo.user.clientKey + "' using netting mode " + positionNettingMode + ".\n\n" + (
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
     * Example of getting all formatted open orders for the your clientKey.
     * @return {void}
     */
    function getOrders() {
        // Only open orders will be shown.
        fetch(
            demo.apiUrl + "/port/v1/orders?FieldGroups=DisplayAndFormat,ExchangeInfo&ClientKey=" + encodeURIComponent(demo.user.clientKey),
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
                        list += order.Duration.DurationType + " #" + order.OrderId + ": " + order.BuySell + " " + order.Amount + "x " + order.AssetType + " " + order.DisplayAndFormat.Description + " @ price " + displayAndFormatValue(order.DisplayAndFormat, order.Price) + " (status " + order.Status + ")" + (
                            order.hasOwnProperty("ExternalReference")
                            ? " reference: " + order.ExternalReference
                            : ""
                        ) + (
                            order.hasOwnProperty("FilledAmount")  // You won't see partial fills on SIM, but they exist on Live!
                            ? " partially filled: " + order.FilledAmount
                            : ""
                        ) + "\n";
                    });
                    console.log("All open orders for client '" + demo.user.clientKey + "'.\n\n" + (
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
     * Position changes are broadcasted via ENS. Retrieve the overnight events to see what you can expect.
     * @return {void}
     */
    function getHistoricalEnsEvents() {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 1);
        fetch(
            demo.apiUrl + "/ens/v1/activities?Activities=Positions&FromDateTime=" + fromDate.toISOString(),
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
                    responseJson.Data.forEach(function (ensEvent) {
                        if (ensEvent.PositionEvent === "Updated") {
                            // More info: https://www.developer.saxo/openapi/learn/position-events
                            list += "Account " + ensEvent.AccountId + ": Update on " + ensEvent.AssetType + " " + ensEvent.Symbol + " received at " + new Date(ensEvent.ActivityTime).toLocaleString() + "\n";
                        }
                    });
                    if (list === "") {
                        list = "No PositionEvents of type 'Update' found in the last 24 hours.\n";
                    } else {
                        list = "Historical events of the last 24 hours, including the nightly rollover:\n" + list;
                    }
                    console.log(list + "\n" + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnGetNettingMode", "func": getNettingMode, "funcsToDisplay": [getNettingMode]},
        {"evt": "click", "elmId": "idBtnGetOpenNetPositions", "func": getOpenNetPositions, "funcsToDisplay": [getOpenNetPositions, displayAndFormatValue]},
        {"evt": "click", "elmId": "idBtnGetOpenPositions", "func": getOpenPositions, "funcsToDisplay": [getOpenPositions, displayAndFormatValue]},
        {"evt": "click", "elmId": "idBtnGetClosedPositions", "func": getClosedPositions, "funcsToDisplay": [getClosedPositions, displayAndFormatValue]},
        {"evt": "click", "elmId": "idBtnGetOrders", "func": getOrders, "funcsToDisplay": [getOrders, displayAndFormatValue]},
        {"evt": "click", "elmId": "idBtnUpdateNettingMode", "func": updateNettingMode, "funcsToDisplay": [updateNettingMode]},
        {"evt": "click", "elmId": "idBtnHistoricalEnsEvents", "func": getHistoricalEnsEvents, "funcsToDisplay": [getHistoricalEnsEvents]}
    ]);
    demo.displayVersion("port");
}());
