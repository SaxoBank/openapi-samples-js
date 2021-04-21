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
        "assetTypesList": document.getElementById("idCbxAssetType"),  // Optional
        "selectedAssetType": "Stock",  // Is required when assetTypesList is available
        "footerElm": document.getElementById("idFooter")
    });
    let lastOrderId = 0;
    let lastOrderIdCondition = 0;

    /**
     * Helper function to convert the json string to an object, with error handling.
     * @return {Object} The newOrderObject from the input field - null if invalid
     */
    function getOrderObjectFromJson() {
        let newOrderObject = null;
        try {
            newOrderObject = JSON.parse(document.getElementById("idNewOrderObject").value);
            newOrderObject.AccountKey = demo.user.accountKey;
            newOrderObject.Orders.forEach(function (order) {
                order.AccountKey = demo.user.accountKey;
            });
            document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
        } catch (e) {
            console.error(e);
        }
        return newOrderObject;
    }

    /**
     * This is an example of an order validation.
     * @return {void}
     */
    function preCheckNewOrder() {
        // The PreCheck only checks the order, not the trigger!
        // Bug: Preview doesn't check for limit outside market hours
        const newOrderObject = getOrderObjectFromJson();
        newOrderObject.AccountKey = demo.user.accountKey;
        newOrderObject.FieldGroups = ["Costs", "MarginImpactBuySell"];
        fetch(
            demo.apiUrl + "/trade/v2/orders/precheck",
            {
                "method": "POST",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                    "Content-Type": "application/json; charset=utf-8",
                    "X-Request-ID": Math.random()  // This prevents error 409 (Conflict) from identical previews within 15 seconds
                },
                "body": JSON.stringify(newOrderObject)
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    // Response must have PreCheckResult property being "Ok"
                    if (responseJson.PreCheckResult === "Ok") {
                        // Secondly, you can have a PreCheckResult of "Ok", but still a (functional) error
                        // Order could be placed if the account had sufficient margin and funding.
                        // In this case all calculated cost and margin values are in the response, together with an ErrorInfo object:
                        if (responseJson.hasOwnProperty("ErrorInfo")) {
                            console.error(responseJson.ErrorInfo.Message + "\n\n" + JSON.stringify(responseJson, null, 4));
                        } else {
                            // The order can be placed
                            console.log(JSON.stringify(responseJson, null, 4));
                        }
                    } else {
                        // Order request is syntactically correct, but the order cannot be placed, as it would violate semantic rules
                        console.error(JSON.stringify(responseJson, null, 4) + "\n\nX-Correlation header (for troubleshooting with Saxo): " + response.headers.get("X-Correlation"));
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
     * This is an example of placing a conditional order.
     * @return {void}
     */
    function placeNewOrder() {
        const headersObject = {
            "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
            "Content-Type": "application/json; charset=utf-8"
        };
        const newOrderObject = getOrderObjectFromJson();
        fetch(
            demo.apiUrl + "/trade/v2/orders",
            {
                "method": "POST",
                "headers": headersObject,
                "body": JSON.stringify(newOrderObject)
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const xRequestId = response.headers.get("X-Request-ID");
                    console.log("Successful request:\n" + JSON.stringify(responseJson, null, 4) + (
                        xRequestId === null
                        ? ""
                        : "\nX-Request-ID response header: " + xRequestId
                    ));
                    lastOrderId = responseJson.OrderId;
                    lastOrderIdCondition = responseJson.Orders[0].OrderId;
                });
            } else {
                console.debug(response);
                if (response.status === 403) {
                    // Don't add this check to your application, but for learning purposes:
                    // An HTTP Forbidden indicates that your app is not enabled for trading.
                    // See https://www.developer.saxo/openapi/appmanagement
                    demo.processError(response, "Your app might not be enabled for trading.");
                } else {
                    demo.processError(response);
                }
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This is an example of updating a conditional order.
     * @return {void}
     */
    function modifyLastOrder() {
        const newOrderObject = getOrderObjectFromJson();
        const headersObject = {
            "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
            "Content-Type": "application/json; charset=utf-8"
        };
        newOrderObject.OrderId = lastOrderId;
        newOrderObject.Orders[0].OrderId = lastOrderIdCondition;
        fetch(
            demo.apiUrl + "/trade/v2/orders",
            {
                "method": "PATCH",
                "headers": headersObject,
                "body": JSON.stringify(newOrderObject)
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const xRequestId = response.headers.get("X-Request-ID");
                    console.log("Successful request:\n" + JSON.stringify(responseJson, null, 4) + (
                        xRequestId === null
                        ? ""
                        : "\nX-Request-ID response header: " + xRequestId
                    ));
                });
            } else {
                // If you get a 404 NotFound, the order might already be executed!
                demo.processError(response);
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
            demo.apiUrl + "/trade/v2/orders/" + lastOrderId + "?AccountKey=" + encodeURIComponent(demo.user.accountKey),
            {
                "method": "DELETE",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    // Response must have an OrderId
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
     * Create a description of the order with condition.
     * @return {void}
     */
    function getConditionInText(conditionalOrder) {

        function priceTypeInText() {
            switch (conditionalOrder.TriggerOrderData.PriceType) {
            case "Last":
                return "last traded";
            default:
                return conditionalOrder.TriggerOrderData.PriceType.toLowerCase();
            }
        }

        let description = "Activate this order when the following condition is met:\n";
        let expirationDate;
        switch (conditionalOrder.OrderType) {
        case "TriggerStop":  // Distance
            description += conditionalOrder.AssetType + " " + conditionalOrder.Uic + " " + priceTypeInText() + " price is " + conditionalOrder.TrailingStopDistanceToMarket + " " + (
                conditionalOrder.BuySell === "Sell"
                ? "above lowest "
                : "below highest "
            ) + priceTypeInText() + " price";
            break;
        case "TriggerBreakout":  // Breakout
            description += conditionalOrder.AssetType + " " + conditionalOrder.Uic + " " + priceTypeInText() + " price is outside " + conditionalOrder.TriggerOrderData.LowerPrice + "-" + conditionalOrder.TriggerOrderData.UpperPrice;
            break;
        case "TriggerLimit":  // Price
            description += conditionalOrder.AssetType + " " + conditionalOrder.Uic + " last traded price is at or " + (
                conditionalOrder.BuySell === "Sell"
                ? "above"
                : "below"
            ) + " " + conditionalOrder.TriggerOrderData.LowerPrice;
            break;
        }
        description += ".\n";
        switch (conditionalOrder.OrderDuration.DurationType) {
        case "GoodTillDate":
            expirationDate = new Date(conditionalOrder.OrderDuration.ExpirationDateTime);
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
     * This function is called when the value of idCbxCondition is changed.
     * @return {void}
     */
    function changeCondition() {
        // Conditions are Price, Breakout and Distance.
        // A price condition is met when the price of the trigger instrument reaches a certain value.
        // Example of a price condition: Microsoft Corp. last traded price is at or below 250.00. Valid until met or cancelled.
        //      .. of a breakout condition: EURUSD close price is outside 1.1500-1.1600. Valid until trade day 22-Dec-2022.
        //      .. of a distance condition: DAX Index is 1,000 below highest open price. Valid for current trade day.
        const newOrderObject = getOrderObjectFromJson();
        const conditionalOrder = newOrderObject.Orders[0];
        const newCondition = document.getElementById("idCbxCondition").value;
        conditionalOrder.OrderType = newCondition;
        delete conditionalOrder.TrailingStopStep;
        delete conditionalOrder.TrailingStopDistanceToMarket;
        delete conditionalOrder.TriggerOrderData.UpperPrice;
        switch (newCondition) {
        case "TriggerStop":  // Distance
            conditionalOrder.TrailingStopStep = 0.05;
            conditionalOrder.TrailingStopDistanceToMarket = 50;
            conditionalOrder.TriggerOrderData.LowerPrice = 700;
            conditionalOrder.BuySell = document.getElementById("idCbxOperator").value;
            break;
        case "TriggerBreakout":  // Breakout
            conditionalOrder.TriggerOrderData.LowerPrice = 10;
            conditionalOrder.TriggerOrderData.UpperPrice = 1500;
            delete conditionalOrder.BuySell;
            break;
        case "TriggerLimit":  // Price
            conditionalOrder.TriggerOrderData.LowerPrice = 1000;
            conditionalOrder.BuySell = document.getElementById("idCbxOperator").value;
            break;
        }
        document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
        console.log(getConditionInText(conditionalOrder));
    }

    /**
     * This function is called when the value of idCbxOperator is changed.
     * @return {void}
     */
    function changeOperator() {
        // Applicable for Limits. When "At or above": Sell, when "At or below": Buy.
        const newOrderObject = getOrderObjectFromJson();
        newOrderObject.Orders[0].BuySell = document.getElementById("idCbxOperator").value;
        document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
        console.log(getConditionInText(newOrderObject.Orders[0]));
    }

    /**
     * This function is called when the value of idCbxTrigger is changed.
     * @return {void}
     */
    function changeTrigger() {
        // Triggers differ per condition.
        const newOrderObject = getOrderObjectFromJson();
        newOrderObject.Orders[0].TriggerOrderData.PriceType = document.getElementById("idCbxTrigger").value;
        document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
        console.log(getConditionInText(newOrderObject.Orders[0]));
    }

    /**
     * This function is called when the value of idCbxExpiry is changed.
     * @return {void}
     */
    function changeExpiry() {
        const expiry = document.getElementById("idCbxExpiry").value;
        const expiryDate = new Date();
        const newOrderObject = getOrderObjectFromJson();
        const conditionalOrder = newOrderObject.Orders[0];
        switch (expiry) {
        case "EOM":
            conditionalOrder.OrderDuration.DurationType = "GoodTillDate";
            expiryDate.setMonth(expiryDate.getMonth() + 1, 0);
            conditionalOrder.OrderDuration.ExpirationDateTime = expiryDate.toISOString().split("T")[0];
            conditionalOrder.OrderDuration.ExpirationDateContainsTime = false;
            break;
        case "EOY":
            conditionalOrder.OrderDuration.DurationType = "GoodTillDate";
            expiryDate.setFullYear(expiryDate.getFullYear() + 1, 0, 0);
            conditionalOrder.OrderDuration.ExpirationDateTime = expiryDate.toISOString().split("T")[0];
            conditionalOrder.OrderDuration.ExpirationDateContainsTime = false;
            break;
        default:
            conditionalOrder.OrderDuration.DurationType = expiry;
            delete conditionalOrder.OrderDuration.ExpirationDateTime;
            delete conditionalOrder.OrderDuration.ExpirationDateContainsTime;
        }
        document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
        console.log(getConditionInText(conditionalOrder));
    }

    demo.setupEvents([
        {"evt": "change", "elmId": "idCbxCondition", "func": changeCondition, "funcsToDisplay": [changeCondition, getConditionInText]},
        {"evt": "change", "elmId": "idCbxOperator", "func": changeOperator, "funcsToDisplay": [changeOperator, getConditionInText]},
        {"evt": "change", "elmId": "idCbxTrigger", "func": changeTrigger, "funcsToDisplay": [changeTrigger, getConditionInText]},
        {"evt": "change", "elmId": "idCbxExpiry", "func": changeExpiry, "funcsToDisplay": [changeExpiry, getConditionInText]},
        {"evt": "click", "elmId": "idBtnPreCheckOrder", "func": preCheckNewOrder, "funcsToDisplay": [preCheckNewOrder]},
        {"evt": "click", "elmId": "idBtnPlaceNewOrder", "func": placeNewOrder, "funcsToDisplay": [placeNewOrder]},
        {"evt": "click", "elmId": "idBtnModifyLastOrder", "func": modifyLastOrder, "funcsToDisplay": [modifyLastOrder]},
        {"evt": "click", "elmId": "idBtnCancelLastOrder", "func": cancelLastOrder, "funcsToDisplay": [cancelLastOrder]}
    ]);
    demo.displayVersion("trade");
}());
