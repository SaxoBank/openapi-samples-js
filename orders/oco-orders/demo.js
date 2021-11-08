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
    let lastOrderId1 = 0;
    let lastOrderId2 = 0;

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
     * This is an example of an order validation.
     * @return {void}
     */
    function preCheckNewOrder() {
        // Bug: Preview doesn't check for limit outside market hours

        function getErrorMessage(responseJson, defaultMessage) {
            let errorMessage;
            if (responseJson.hasOwnProperty("ErrorInfo")) {
                // Be aware that the ErrorInfo.Message might contain line breaks, escaped like "\r\n"!
                errorMessage = responseJson.ErrorInfo.Message;
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
     * This is an example of placing an OCO order.
     * @return {void}
     */
    function placeNewOrder() {
        const newOrderObject = getOrderObjectFromJson();
        const headersObject = {
            "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
            "Content-Type": "application/json; charset=utf-8"
        };
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
                    if (responseJson.Orders.length > 0) {
                        lastOrderId1 = responseJson.Orders[0].OrderId;
                        if (responseJson.Orders.length > 1) {
                            lastOrderId2 = responseJson.Orders[1].OrderId;
                        }
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

        function modify(newOrderObject) {
            const headersObject = {
                "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                "Content-Type": "application/json; charset=utf-8"
            };
            console.log("Mofifying order " + newOrderObject.OrderId);
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
                    demo.processError(response);
                }
            }).catch(function (error) {
                console.error(error);
            });
        }

        const newOrderObjectArray = getOrderObjectFromJson();
        let orderObject;
        if (newOrderObjectArray.Orders.length > 0) {
            orderObject = newOrderObjectArray.Orders[0];
            orderObject.OrderId = lastOrderId1;
            modify(orderObject);
            if (newOrderObjectArray.Orders.length > 0) {
                orderObject = newOrderObjectArray.Orders[1];
                orderObject.OrderId = lastOrderId2;
                modify(orderObject);
            }
        }
    }

    /**
     * This is an example of removing two orders from the book in one operation.
     * @return {void}
     */
    function cancelLastOrder() {
        fetch(
            demo.apiUrl + "/trade/v2/orders/" + lastOrderId1 + "," + lastOrderId2 + "?AccountKey=" + encodeURIComponent(demo.user.accountKey),
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
        fromDate.setMinutes(fromDate.getMinutes() - 5);
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
                    console.log("Found " + responseJson.Data.length + " events in the last 5 minutes:\n\n" + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Get the open orders, reflecting the created relation between the orders.
     * @return {void}
     */
    function getOrders() {
        fetch(
            demo.apiUrl + "/port/v1/orders/me",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    console.log("Found " + responseJson.Data.length + " open orders:\n\n" + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    demo.setupEvents([
        {"evt": "click", "elmId": "idBtnPreCheckOrder", "func": preCheckNewOrder, "funcsToDisplay": [preCheckNewOrder]},
        {"evt": "click", "elmId": "idBtnPlaceNewOrder", "func": placeNewOrder, "funcsToDisplay": [placeNewOrder]},
        {"evt": "click", "elmId": "idBtnModifyLastOrder", "func": modifyLastOrder, "funcsToDisplay": [modifyLastOrder]},
        {"evt": "click", "elmId": "idBtnCancelLastOrder", "func": cancelLastOrder, "funcsToDisplay": [cancelLastOrder]},
        {"evt": "click", "elmId": "idBtnHistoricalEnsEvents", "func": getHistoricalEnsEvents, "funcsToDisplay": [getHistoricalEnsEvents]},
        {"evt": "click", "elmId": "idBtnGetOrders", "func": getOrders, "funcsToDisplay": [getOrders]}
    ]);
    demo.displayVersion("trade");
}());
