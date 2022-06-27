/*jslint browser: true, for: true, long: true, unordered: true */
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
    let lastOrderId = "0";

    /**
     * Helper function to convert the json string to an object, with error handling.
     * @return {Object} The newOrderObject from the input field - null if invalid
     */
    function getOrderObjectFromJson() {
        let newOrderObject = null;
        try {
            newOrderObject = JSON.parse(document.getElementById("idNewOrderObject").value);
            if (newOrderObject.hasOwnProperty("AccountKey")) {
                // This is the case for single orders, or conditional/related orders
                // This function is used for other order types as well, so more order types are considered
                newOrderObject.AccountKey = demo.user.accountKey;
            }
            if (newOrderObject.hasOwnProperty("Orders")) {
                // This is the case for OCO, related and conditional orders
                newOrderObject.Orders.forEach(function (order) {
                    if (order.hasOwnProperty("AccountKey")) {
                        order.AccountKey = demo.user.accountKey;
                    }
                });
            }
            document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
        } catch (e) {
            console.error(e);
        }
        return newOrderObject;
    }

    /**
     * Returns trading schedule for a given uic and asset type.
     * @return {void}
     */
    function getTradingSchedule() {
        const newOrderObject = getOrderObjectFromJson();
        fetch(
            demo.apiUrl + "/ref/v1/instruments/tradingschedule/" + newOrderObject.Uic + "/" + newOrderObject.AssetType,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const now = new Date();
                    let responseText = "Current local time: " + now.toLocaleTimeString() + "\n";
                    responseJson.Sessions.forEach(function (session) {
                        const startTime = new Date(session.StartTime);
                        const endTime = new Date(session.EndTime);
                        if (now >= startTime && now < endTime) {
                            // This is the session we are in now, usually the first.
                            responseText += "--> ";
                        }
                        responseText += session.State + " from " + startTime.toLocaleString() + " to " + endTime.toLocaleString() + "\n";
                    });
                    console.log(responseText);
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This is an example of an order validation.
     * @return {void}
     */
    function preCheckNewOrder() {
        // Bug: Preview doesn't check for limit outside market hours

        function getErrorMessage(responseJson, defaultMessage) {
            let errorMessage;
            if (responseJson.hasOwnProperty("ErrorInfo")) {
                // Be aware that the ErrorInfo.Message might contain line breaks, escaped like "\r\n"!
                errorMessage = (
                    responseJson.ErrorInfo.hasOwnProperty("Message")
                    ? responseJson.ErrorInfo.Message
                    : responseJson.ErrorInfo.ErrorCode  // In some cases (AllocationKeyDoesNotMatchAccount) the message is not available
                );
                // There can be error messages per order. Try to add them.
                if (responseJson.hasOwnProperty("Orders")) {
                    responseJson.Orders.forEach(function (order) {
                        errorMessage += "\n- " + getErrorMessage(order, "");
                    });
                }
            } else {
                errorMessage = defaultMessage;
            }
            return errorMessage;
        }

        const newOrderObject = getOrderObjectFromJson();
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
                            // Be aware that the ErrorInfo.Message might contain line breaks, escaped like "\r\n"!
                            console.error(getErrorMessage(responseJson, "") + "\n\n" + JSON.stringify(responseJson, null, 4));
                        } else {
                            // The order can be placed
                            console.log("The order can be placed:\n\n" + JSON.stringify(responseJson, null, 4));
                        }
                    } else {
                        // Order request is syntactically correct, but the order cannot be placed, as it would violate semantic rules
                        // This can be something like: {"ErrorInfo":{"ErrorCode":"IllegalInstrumentId","Message":"Instrument ID is invalid"},"EstimatedCashRequired":0.0,"PreCheckResult":"Error"}
                        console.error(getErrorMessage(responseJson, "Order request is syntactically correct, but the order cannot be placed, as it would violate semantic rules:") + "\n\n" + JSON.stringify(responseJson, null, 4) + "\n\nX-Correlation header (for troubleshooting with Saxo): " + response.headers.get("X-Correlation"));
                    }
                });
            } else {
                // This can be something like: {"Message":"One or more properties of the request are invalid!","ModelState":{"Orders":["Stop leg of OCO order must have OrderType of either: TrailingStopIfTraded, StopIfTraded, StopLimit"]},"ErrorCode":"InvalidModelState"}
                // The developer (you) must fix this.
                demo.processError(response);
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
     * This is an example of getting detailed information of a specific order (in this case the last placed order).
     * @return {void}
     */
    function getOrderDetails() {
        fetch(
            demo.apiUrl + "/port/v1/orders/" + lastOrderId + "?ClientKey=" + demo.user.clientKey,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    if (responseJson === null) {
                        console.error("The order wasn't found in the list of active orders. Is order " + lastOrderId + " still open?");
                    } else {
                        console.log("Response: " + JSON.stringify(responseJson, null, 4));
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
     * This is an example of updating a single leg order.
     * @return {void}
     */
    function modifyLastOrder() {
        const newOrderObject = getOrderObjectFromJson();
        const headersObject = {
            "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
            "Content-Type": "application/json; charset=utf-8"
        };
        newOrderObject.OrderId = lastOrderId;
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
     * Order changes are broadcasted via ENS. Retrieve the recent events to see what you can expect.
     * @return {void}
     */
    function getHistoricalEnsEvents() {
        const fromDate = new Date();
        fromDate.setMinutes(fromDate.getMinutes() - 10);
        fetch(
            demo.apiUrl + "/ens/v1/activities?Activities=Orders&FromDateTime=" + fromDate.toISOString(),
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    console.log("Found " + responseJson.Data.length + " event(s) in the last 10 minutes:\n\n" + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnGetTradingSchedule", "func": getTradingSchedule, "funcsToDisplay": [getTradingSchedule]},
        {"evt": "click", "elmId": "idBtnPreCheckOrder", "func": preCheckNewOrder, "funcsToDisplay": [preCheckNewOrder]},
        {"evt": "click", "elmId": "idBtnPlaceNewOrder", "func": placeNewOrder, "funcsToDisplay": [placeNewOrder]},
        {"evt": "click", "elmId": "idBtnGetOrderDetails", "func": getOrderDetails, "funcsToDisplay": [getOrderDetails]},
        {"evt": "click", "elmId": "idBtnModifyLastOrder", "func": modifyLastOrder, "funcsToDisplay": [modifyLastOrder]},
        {"evt": "click", "elmId": "idBtnCancelLastOrder", "func": cancelLastOrder, "funcsToDisplay": [cancelLastOrder]},
        {"evt": "click", "elmId": "idBtnHistoricalEnsEvents", "func": getHistoricalEnsEvents, "funcsToDisplay": [getHistoricalEnsEvents]}
    ]);
    demo.displayVersion("trade");
}());
