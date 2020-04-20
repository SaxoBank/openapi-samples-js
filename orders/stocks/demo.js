/*jslint this: true, browser: true, for: true, long: true */
/*global window console accountKey run processError apiUrl */

let lastOrderId = 0;

function selectOrderType() {
    const newOrderObject = JSON.parse(document.getElementById("idNewOrderObject").value);
    newOrderObject.OrderType = document.getElementById("idCbxOrderType").value;
    newOrderObject.AccountKey = accountKey;
    delete newOrderObject.OrderPrice;
    delete newOrderObject.StopLimitPrice;
    delete newOrderObject.TrailingstopDistanceToMarket;
    delete newOrderObject.TrailingStopStep;
    switch (newOrderObject.OrderType) {
    case "Limit":  // A buy order will be executed when the price falls below the provided price point; a sell order when the price increases beyond the provided price point.
        fetch(
            apiUrl + "/trade/v1/infoprices?AssetType=Stock&uic=" + newOrderObject.Uic,
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
                    newOrderObject.OrderPrice = 70;  // SIM doesn't allow calls to price endpoint, otherwise responseJson.Quote.Bid
                    document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
                    console.log(JSON.stringify(responseJson));
                });
            } else {
                processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
        break;
    case "Market":  // Order is attempted filled at best price in the market.
        document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
        break;
    case "StopIfBid":  // A buy order will be executed when the bid price increases to the provided price point; a sell order when the price falls below.
    case "StopIfOffered":  // A buy order will be executed when the ask price increases to the provided price point; a sell order when the price falls below.
    case "StopIfTraded":  // A buy order will be executed when the last price increases to the provided price point; a sell order when the price falls below.
        newOrderObject.OrderPrice = 70;
        document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
        break;
    case "StopLimit":  // A buy StopLimit order will turn in to a regular limit order once the price goes beyond the OrderPrice. The limit order will have a OrderPrice of the StopLimitPrice.
        newOrderObject.OrderPrice = 70;
        newOrderObject.StopLimitPrice = 71;
        document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
        break;
    case "TrailingStop":  // A trailing stop order type is used to guard a position against a potential loss, but the order price follows that of the position when the price goes up. It does so in steps, trying to keep a fixed distance to the current price.
    case "TrailingStopIfBid":
    case "TrailingStopIfOffered":
    case "TrailingStopIfTraded":
        newOrderObject.OrderPrice = 70;
        newOrderObject.TrailingstopDistanceToMarket = 1;
        newOrderObject.TrailingStopStep = 0.1;
        document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
        break;
    default:
        console.error("Unsupported order type " + newOrderObject.OrderType);
    }
}

function selectOrderDuration() {
    const newOrderObject = JSON.parse(document.getElementById("idNewOrderObject").value);
    let now;
    newOrderObject.OrderDuration.DurationType = document.getElementById("idCbxOrderDuration").value;
    switch (newOrderObject.OrderDuration.DurationType) {
    case "DayOrder":
    case "GoodTillCancel":
    case "FillOrKill":
    case "ImmediateOrCancel":  // The order is working for a very short duration and when the time is up, the order is cancelled. What ever fills happened in the short time, is what constitute a position. Primarily used for Fx and Cfds.
        delete newOrderObject.OrderDuration.ExpirationDateTime;
        delete newOrderObject.OrderDuration.ExpirationDateContainsTime;
        break;
    case "GoodTillDate":  // Requires an explicit date. Cancellation of the order happens at some point on that date.
        now = new Date();
        now.setDate(now.getDate() + 3);  // Add 3x24 hours to now
        now.setSeconds(0, 0);
        newOrderObject.OrderDuration.ExpirationDateTime = now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate() + "T" + now.getHours() + ":" + now.getMinutes() + ":00";  // Example: 2020-03-20T14:00:00
        newOrderObject.OrderDuration.ExpirationDateContainsTime = true;
        break;
    default:
        console.error("Unsupported order duration " + newOrderObject.OrderDuration.DurationType);
    }
    document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
}

function populateOrderTypes(orderTypes) {
    const cbxOrderType = document.getElementById("idCbxOrderType");
    let option;
    let i;
    for (i = cbxOrderType.options.length - 1; i >= 0; i -= 1) {
        cbxOrderType.remove(i);
    }
    for (i = 0; i < orderTypes.length; i += 1) {
        option = document.createElement("option");
        option.text = orderTypes[i];
        option.value = orderTypes[i];
        cbxOrderType.add(option);
    }
}

/**
 * This is an example of getting the trading settings of an instrument.
 * @return {void}
 */
function getConditions() {
    const newOrderObject = JSON.parse(document.getElementById("idNewOrderObject").value);
    fetch(
        apiUrl + "/ref/v1/instruments/details?Uics=" + newOrderObject.Uic + "&AssetTypes=" + newOrderObject.AssetType + "&AccountKey=" + encodeURIComponent(accountKey) + "&FieldGroups=OrderSetting",
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
                // Test for SupportedOrderTypes and TickSizeScheme
                populateOrderTypes(responseJson.Data[0].SupportedOrderTypes);
                selectOrderType();
                console.log(JSON.stringify(responseJson.Data[0]));
            });
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

/**
 * This is an example of getting the costs of this order.
 * @return {void}
 */
function getOrderCosts() {
    // https://www.developer.saxo/openapi/learn/mifid-2-cost-reporting
    const newOrderObject = JSON.parse(document.getElementById("idNewOrderObject").value);
    fetch(
        apiUrl + "/cs/v1/tradingconditions/cost/" + encodeURIComponent(accountKey) + "/" + newOrderObject.Uic + "/" + newOrderObject.AssetType + "/?Amount=" + newOrderObject.Amount + "&FieldGroups=DisplayAndFormat&HoldingPeriodInDays=365",
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
                console.log(JSON.stringify(responseJson));
            });
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

/**
 * This is an example of getting the Key Information Document of this instrument.
 * @return {void}
 */
function getKid() {
    throw "KID is not implemented yet.";
}

/**
 * This is an example of an order validation.
 * @return {void}
 */
function preCheckNewOrder() {
    // Bug: Preview doesn't check for limit outside market hours
    const newOrderObject = JSON.parse(document.getElementById("idNewOrderObject").value);
    newOrderObject.AccountKey = accountKey;
    newOrderObject.FieldGroups = ["Costs", "MarginImpactBuySell"];
    fetch(
        apiUrl + "/trade/v2/orders/precheck",
        {
            "headers": {
                "Content-Type": "application/json; charset=utf-8",
                "X-Request-ID": Math.random(),  // This prevents error 409 (Conflict) from identical previews within 15 seconds
                "Authorization": "Bearer " + document.getElementById("idBearerToken").value
            },
            "body": JSON.stringify(newOrderObject),
            "method": "POST"
        }
    ).then(function (response) {
        if (response.ok) {
            response.json().then(function (responseJson) {
                // Response must have PreCheckResult property being "Ok"
                console.log(JSON.stringify(responseJson));
            });
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

/**
 * This is an example of placing a single leg order.
 * @return {void}
 */
function placeNewOrder() {
    const newOrderObject = JSON.parse(document.getElementById("idNewOrderObject").value);
    const headersObject = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": "Bearer " + document.getElementById("idBearerToken").value
    };
    newOrderObject.AccountKey = accountKey;
    if (document.getElementById("idChkRequestIdHeader").checked) {
        headersObject["X-Request-ID"] = newOrderObject.ExternalReference;  // Warning! Prevent error 409 (Conflict) from identical orders within 15 seconds
    }
    fetch(
        apiUrl + "/trade/v2/orders",
        {
            "headers": headersObject,
            "body": JSON.stringify(newOrderObject),
            "method": "POST"
        }
    ).then(function (response) {
        if (response.ok) {
            response.json().then(function (responseJson) {
                const xRequestId = response.headers.get("X-Request-ID");
                console.log("Successful request:\n" + JSON.stringify(responseJson) + (
                    xRequestId === null
                    ? ""
                    : "\nX-Request-ID response header: " + xRequestId
                ));
                lastOrderId = responseJson.OrderId;
            });
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

/**
 * This is an example of updating a single leg order.
 * @return {void}
 */
function modifyLastOrder() {
    const newOrderObject = JSON.parse(document.getElementById("idNewOrderObject").value);
    const headersObject = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": "Bearer " + document.getElementById("idBearerToken").value
    };
    newOrderObject.AccountKey = accountKey;
    newOrderObject.OrderId = lastOrderId;
    if (document.getElementById("idChkRequestIdHeader").checked) {
        headersObject["X-Request-ID"] = newOrderObject.ExternalReference;  // Warning! Prevent error 409 (Conflict) from identical orders within 15 seconds
    }
    fetch(
        apiUrl + "/trade/v2/orders",
        {
            "headers": headersObject,
            "body": JSON.stringify(newOrderObject),
            "method": "PATCH"
        }
    ).then(function (response) {
        if (response.ok) {
            response.json().then(function (responseJson) {
                const xRequestId = response.headers.get("X-Request-ID");
                console.log("Successful request:\n" + JSON.stringify(responseJson) + (
                    xRequestId === null
                    ? ""
                    : "\nX-Request-ID response header: " + xRequestId
                ));
            });
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

/**
 * This is an example of removing an order from the book.
 * @return {void}
 */
function cancelLastOrder() {
    fetch(
        apiUrl + "/trade/v2/orders/" + lastOrderId + "?AccountKey=" + encodeURIComponent(accountKey),
        {
            "headers": {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": "Bearer " + document.getElementById("idBearerToken").value
            },
            "method": "DELETE"
        }
    ).then(function (response) {
        if (response.ok) {
            response.json().then(function (responseJson) {
                // Response must have an OrderId
                console.log(JSON.stringify(responseJson));
            });
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

function instrumentIdChange() {
    const newOrderObject = JSON.parse(document.getElementById("idNewOrderObject").value);
    newOrderObject.Uic = document.getElementById("idInstrumentId").value;
    document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
}

(function () {
    // Format the initial order object exactly the same as done after modifying it when changing settings:
    instrumentIdChange();
    document.getElementById("idInstrumentId").addEventListener("change", instrumentIdChange);
    document.getElementById("idCbxOrderType").addEventListener("change", function () {
        run(selectOrderType);
    });
    document.getElementById("idCbxOrderDuration").addEventListener("change", function () {
        run(selectOrderDuration);
    });
    document.getElementById("idBtnGetConditions").addEventListener("click", function () {
        run(getConditions);
    });
    document.getElementById("idBtnPreCheckOrder").addEventListener("click", function () {
        run(preCheckNewOrder);
    });
    document.getElementById("idBtnGetOrderCosts").addEventListener("click", function () {
        run(getOrderCosts);
    });
    document.getElementById("idBtnGetKid").addEventListener("click", function () {
        run(getKid);
    });
    document.getElementById("idBtnPlaceNewOrder").addEventListener("click", function () {
        run(placeNewOrder);
    });
    document.getElementById("idBtnModifyLastOrder").addEventListener("click", function () {
        run(modifyLastOrder);
    });
    document.getElementById("idBtnCancelLastOrder").addEventListener("click", function () {
        run(cancelLastOrder);
    });
    displayVersion("trade");
}());
