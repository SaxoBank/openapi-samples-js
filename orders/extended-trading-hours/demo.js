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
     * Not all clients support ETH trading.
     * @return {void}
     */
    function getClientSupport() {
        fetch(
            demo.apiUrl + "/port/v1/clients/" + encodeURIComponent(demo.user.clientKey),
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    switch (responseJson.AllowedTradingSessions) {
                    case "Regular":
                        console.error("The selected account only supports the regular trading sessions.");
                        break;
                    case "All":
                        console.log("The selected account supports ETH trading sessions.");
                        break;
                    default:
                        console.error("Unrecognized AllowedTradingSessions value found: " + responseJson.AllowedTradingSessions);
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
     * Retrieve all exchanges and filter the ones with 'PreMarket' and 'PostMarket' trading sessions.
     * @return {void}
     */
    function getSupportedExchanges() {
        fetch(
            demo.apiUrl + "/ref/v1/exchanges?$top=1000",  // Get the first 1.000 (actually there are around 200 exchanges available)
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
                    let responseText = "";
                    responseJson.Data.forEach(function (exchange) {
                        exchange.ExchangeSessions.forEach(function (session) {
                            const startTime = new Date(session.StartTime);
                            const endTime = new Date(session.EndTime);
                            if (session.State === "PreMarket" || session.State === "PostMarket") {
                                if (now >= startTime && now < endTime) {
                                    // This is the session we are in now.
                                    responseText += "--> ";
                                }
                                responseText += exchange.Name + " (" + exchange.ExchangeId + ") has state '" + session.State + "' from " + startTime.toLocaleString() + " to " + endTime.toLocaleString() + "\n";
                            }
                        });
                    });
                    if (responseText === "") {
                        console.log("No exchanges found with support for Pre-, or PostMarket trading.");
                    } else {
                        console.log(responseText);
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
     * Not all instruments support ETH trading.
     * @return {void}
     */
    function getCheckInstrumentSupport() {
        const newOrderObject = getOrderObjectFromJson();
        fetch(
            demo.apiUrl + "/ref/v1/instruments/details/" + newOrderObject.Uic + "/" + newOrderObject.AssetType,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    if (responseJson.IsExtendedTradingHoursEnabled) {
                        console.log("The selected instrument supports ETH trading sessions. You can combine the AccountCheck and this InstrumentCheck by providing an AccountKey in this request.");
                    } else {
                        console.error("The selected instrument only supports the regular trading sessions.");
                    }
                    /*
                    switch (responseJson.SupportedTradingSessions) {
                    case "Regular":
                        console.error("The selected instrument only supports the regular trading sessions.");
                        break;
                    case "All":
                        console.log("The selected instrument supports ETH trading sessions. You can combine the AccountCheck and this InstrumentCheck by providing an AccountKey in this request.");
                        break;
                    default:
                        console.error("Unrecognized SupportedTradingSessions value found: " + responseJson.AllowedTradingSessions);
                    }
                    */
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Returns trading schedule for a given uic and asset type.
     * @return {void}
     */
    function getTradingSessions(sessions) {
        const now = new Date();
        let currentTradingSession = "Undefined";
        let responseText = "Current local time: " + now.toLocaleTimeString() + "\n";
        sessions.forEach(function (session) {
            const startTime = new Date(session.StartTime);
            const endTime = new Date(session.EndTime);
            if (now >= startTime && now < endTime) {
                // This is the session we are in now, usually the first.
                currentTradingSession = session.State;
                responseText += "--> ";
            }
            responseText += "'" + session.State + "' from " + startTime.toLocaleString() + " to " + endTime.toLocaleString() + "\n";
        });
        switch (currentTradingSession) {
        case "PreMarket":
        case "PostMarket":
        //case "PreTrading":
        //case "PostTrading":
        //case "PreAutomatedTrading":
        //case "PostAutomatedTrading":
            responseText += "\nWe are outside the AutomatedTrading session, but trading is possible because market is in an extended trading session.";
            break;
        case "AutomatedTrading":
            responseText += "\nWe are in the regular 'AutomatedTrading' session.";
            break;
        case "Undefined":
            responseText += "\nWe are in an unknown trading session. Please report this to Saxo, because this is wrong!";
            break;
        default:
            responseText += "\nThe market is closed with state: " + currentTradingSession;
        }
        console.log(responseText);
    }

    /**
     * Returns trading schedule for a given uic and asset type by using the TradingSchedule endpoint.
     * @return {void}
     */
    function getTradingSessionsFromTradingSchedule() {
        const newOrderObject = getOrderObjectFromJson();
        // Saxo has two endpoints serving the trading sessions. Choice is yours.
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
                    getTradingSessions(responseJson.Sessions);
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Returns trading schedule for a given uic and asset type by using the instrument details.
     * @return {void}
     */
    function getTradingSessionsFromInstrument() {
        const newOrderObject = getOrderObjectFromJson();
        // Saxo has two endpoints serving the trading sessions. Choice is yours.
        fetch(
            demo.apiUrl + "/ref/v1/instruments/details/" + newOrderObject.Uic + "/" + newOrderObject.AssetType + "?FieldGroups=TradingSessions",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    getTradingSessions(responseJson.TradingSessions.Sessions);
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * The regular instrument prices stop after the AutomatedTradingSession. The PreMarket and PostMarket sessions have their own prices.
     * @return {void}
     */
    function getEthPrices() {
        // The regular instrument prices stop after the AutomatedTradingSession. The PreMarket and PostMarket sessions have their own prices.
        // Retrieve them:
        const newOrderObject = getOrderObjectFromJson();
        let url = demo.apiUrl + "/trade/v1/infoprices?Uic=" + newOrderObject.Uic + "&AssetType=" + newOrderObject.AssetType;
        // With the AccountKey, the price is specific for your account
        url += "&AccountKey=" + newOrderObject.AccountKey;
        // The FieldGroup "ExtendedTradingHoursPriceData" requests ETH prices
        url += "&FieldGroups=" + encodeURIComponent("ExtendedTradingHoursPriceData,DisplayAndFormat,InstrumentPriceDetails,MarketDepth,PriceInfo,PriceInfoDetails,Quote");
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
            demo.apiUrl + "/port/v1/orders/" + encodeURIComponent(demo.user.clientKey) + "/" + lastOrderId,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    if (responseJson.Data.length === 0) {
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
        {"evt": "click", "elmId": "idBtnCheckClientSupport", "func": getClientSupport, "funcsToDisplay": [getClientSupport]},
        {"evt": "click", "elmId": "idBtnGetSupportedExchanges", "func": getSupportedExchanges, "funcsToDisplay": [getSupportedExchanges]},
        {"evt": "click", "elmId": "idBtnCheckInstrumentSupport", "func": getCheckInstrumentSupport, "funcsToDisplay": [getCheckInstrumentSupport]},
        {"evt": "click", "elmId": "idBtnGetSessionsFromTradingSchedule", "func": getTradingSessionsFromTradingSchedule, "funcsToDisplay": [getTradingSessionsFromTradingSchedule, getTradingSessions]},
        {"evt": "click", "elmId": "idBtnGetSessionsFromInstrument", "func": getTradingSessionsFromInstrument, "funcsToDisplay": [getTradingSessionsFromInstrument, getTradingSessions]},
        {"evt": "click", "elmId": "idBtnGetEthPrices", "func": getEthPrices, "funcsToDisplay": [getEthPrices]},
        {"evt": "click", "elmId": "idBtnPreCheckOrder", "func": preCheckNewOrder, "funcsToDisplay": [preCheckNewOrder]},
        {"evt": "click", "elmId": "idBtnPlaceNewOrder", "func": placeNewOrder, "funcsToDisplay": [placeNewOrder]},
        {"evt": "click", "elmId": "idBtnGetOrderDetails", "func": getOrderDetails, "funcsToDisplay": [getOrderDetails]},
        {"evt": "click", "elmId": "idBtnModifyLastOrder", "func": modifyLastOrder, "funcsToDisplay": [modifyLastOrder]},
        {"evt": "click", "elmId": "idBtnCancelLastOrder", "func": cancelLastOrder, "funcsToDisplay": [cancelLastOrder]},
        {"evt": "click", "elmId": "idBtnHistoricalEnsEvents", "func": getHistoricalEnsEvents, "funcsToDisplay": [getHistoricalEnsEvents]}
    ]);
    demo.displayVersion("trade");
}());
