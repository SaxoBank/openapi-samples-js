/*jslint this: true, browser: true, for: true, long: true */
/*global window console clientKey accountKey run processError apiUrl */

function displayAndFormatValue(displayAndFormat, value) {
    let result;
    let integerPart;
    let fractionPart;
    let numerator;
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
 * @return {void}
 */
function getPortfolio() {
    fetch(
        apiUrl + "/port/v1/netpositions/?FieldGroups=NetPositionBase,NetPositionView,DisplayAndFormat&ClientKey=" + encodeURIComponent(clientKey) + "&AccountKey=" + encodeURIComponent(accountKey),
        {
            "headers": {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": "Bearer " + document.getElementById("idBearerToken").value
            },
            "method": "GET"
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
                console.log(
                    list === ""
                    ? "No instruments found on this account."
                    : list
                );
                document.getElementById("idJavaScript").innerText = displayAndFormatValue.toString() + "\n\n" + document.getElementById("idJavaScript").innerText;
            });
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

/**
 * Example of formatting pending orders.
 * @return {void}
 */
function getOrders() {
    fetch(
        apiUrl + "/port/v1/orders/?FieldGroups=DisplayAndFormat,ExchangeInfo&ClientKey=" + encodeURIComponent(clientKey) + "&AccountKey=" + encodeURIComponent(accountKey),
        {
            "headers": {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": "Bearer " + document.getElementById("idBearerToken").value
            },
            "method": "GET"
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
                console.log(
                    list === ""
                    ? "No orders found on this account."
                    : list
                );
                document.getElementById("idJavaScript").innerText = displayAndFormatValue.toString() + "\n\n" + document.getElementById("idJavaScript").innerText;
            });
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

(function () {
    document.getElementById("idBtnGetPortfolio").addEventListener("click", function () {
        run(getPortfolio);
    });
    document.getElementById("idBtnGetOrders").addEventListener("click", function () {
        run(getOrders);
    });
}());
