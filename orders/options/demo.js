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
    const fictivePrice = 1;  // SIM doesn't allow calls to price endpoint for most instruments
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
     * Modify the order object so the elements comply to the order type.
     * @return {void}
     */
    function changeOrderType() {
        const newOrderObject = getOrderObjectFromJson();
        newOrderObject.OrderType = document.getElementById("idCbxOrderType").value;
        delete newOrderObject.OrderPrice;
        delete newOrderObject.StopLimitPrice;
        delete newOrderObject.TrailingstopDistanceToMarket;
        delete newOrderObject.TrailingStopStep;
        switch (newOrderObject.OrderType) {
        case "Limit":  // A buy order will be executed when the price falls below the provided price point; a sell order when the price increases beyond the provided price point.
            fetch(
                demo.apiUrl + "/trade/v1/infoprices?AssetType=" + newOrderObject.AssetType + "&uic=" + newOrderObject.Uic + "&FieldGroups=" + encodeURIComponent("DisplayAndFormat,Quote"),
                {
                    "method": "GET",
                    "headers": {
                        "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                    }
                }
            ).then(function (response) {
                if (response.ok) {
                    response.json().then(function (responseJson) {
                        if (responseJson.Quote.PriceTypeBid === "NoAccess") {
                            newOrderObject.OrderPrice = fictivePrice;  // SIM doesn't supply prices for most instruments (only FxSpot)
                            console.error("Price not available, so using fictive price (only for testing).");
                        } else {
                            newOrderObject.OrderPrice = responseJson.Quote.Bid;
                        }
                        document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
                        console.log("Result of price request due to switch to 'Limit':\n" + JSON.stringify(responseJson, null, 4));
                    });
                } else {
                    demo.processError(response);
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
            newOrderObject.OrderPrice = fictivePrice;
            document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
            break;
        case "StopLimit":  // A buy StopLimit order will turn in to a regular limit order once the price goes beyond the OrderPrice. The limit order will have a OrderPrice of the StopLimitPrice.
            newOrderObject.OrderPrice = fictivePrice;
            newOrderObject.StopLimitPrice = fictivePrice + 1;  // Some other fictivePrice
            document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
            break;
        case "TrailingStop":  // A trailing stop order type is used to guard a position against a potential loss, but the order price follows that of the position when the price goes up. It does so in steps, trying to keep a fixed distance to the current price.
        case "TrailingStopIfBid":
        case "TrailingStopIfOffered":
        case "TrailingStopIfTraded":
            newOrderObject.OrderPrice = fictivePrice;
            newOrderObject.TrailingstopDistanceToMarket = 1;
            newOrderObject.TrailingStopStep = 0.1;
            document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
            break;
        case "TriggerBreakout":
        case "TriggerLimit":
        case "TriggerStop":
            console.error("You've selected an ordertype for a conditional order, which is not covered by this sample.\nSee for conditional orders:\nhttps://saxobank.github.io/openapi-samples-js/orders/conditional-orders/");
            break;
        default:
            console.error("Unsupported order type " + newOrderObject.OrderType);
        }
        populateSupportedOrderDurations(newOrderObject.OrderDuration.DurationType);
    }

    /**
     * Adjust the order object in the textarea so the related properties comply with the chosen order duration.
     * @return {void}
     */
    function changeOrderDuration() {

        /**
         * Prefix number with zero, if it has one digit.
         * @param {number} n The one or two digit number representing day or month.
         * @return {string} The formatted number.
         */
        function addLeadingZero(n) {
            return (
                n > 9
                ? String(n)
                : "0" + n
            );
        }

        const newOrderObject = getOrderObjectFromJson();
        let now;
        newOrderObject.OrderDuration.DurationType = document.getElementById("idCbxOrderDuration").value;
        switch (newOrderObject.OrderDuration.DurationType) {
        case "AtTheClose":
        case "AtTheOpening":
        case "DayOrder":
        case "GoodForPeriod":
        case "GoodTillCancel":
        case "FillOrKill":
        case "ImmediateOrCancel":  // The order is working for a very short duration and when the time is up, the order is canceled. What ever fills happened in the short time, is what constitute a position. Primarily used for Fx and CFDs.
            delete newOrderObject.OrderDuration.ExpirationDateTime;
            delete newOrderObject.OrderDuration.ExpirationDateContainsTime;
            break;
        case "GoodTillDate":  // Requires an explicit date. Cancellation of the order happens at some point on that date.
            now = new Date();
            now.setDate(now.getDate() + 3);  // Add 3x24 hours to now
            now.setSeconds(0, 0);
            newOrderObject.OrderDuration.ExpirationDateTime = now.getFullYear() + "-" + addLeadingZero(now.getMonth() + 1) + "-" + addLeadingZero(now.getDate()) + "T" + addLeadingZero(now.getHours()) + ":" + addLeadingZero(now.getMinutes()) + ":00";  // Example: 2020-03-20T14:00:00
            newOrderObject.OrderDuration.ExpirationDateContainsTime = true;
            break;
        default:
            console.error("Unsupported order duration " + newOrderObject.OrderDuration.DurationType);
        }
        document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
    }

    /**
     * Add the order durations available for the selected order type to the combo box. Pre-select the type which was selected before, when available.
     * @param {string} selectedOrderDuration The order duration to be selected.
     * @return {void}
     */
    function populateSupportedOrderDurations(selectedOrderDuration) {
        const cbxOrderType = document.getElementById("idCbxOrderType");
        const cbxOrderDuration = document.getElementById("idCbxOrderDuration");
        // The durations were stored, when parsing the instrument details. The can differ per OrderType.
        const supportedDurations = cbxOrderType.options[cbxOrderType.selectedIndex].dataset.durations.split("|");
        let isSelectedDurationSupported = false;
        let option;
        let i;
        // Make the list empty first..
        for (i = cbxOrderDuration.options.length - 1; i >= 0; i -= 1) {
            cbxOrderDuration.remove(i);
        }
        supportedDurations.forEach(function (orderDuration) {
            option = document.createElement("option");
            option.text = orderDuration;
            option.value = orderDuration;
            if (orderDuration === selectedOrderDuration) {
                option.setAttribute("selected", true);  // Make the selected type the default one
                isSelectedDurationSupported = true;
            }
            cbxOrderDuration.add(option);
        });
        if (!isSelectedDurationSupported) {
            // Update the duration in the order object, because it is not supported.
            changeOrderDuration();
        }
    }

    /**
     * Add the order types available for this instrument (and account) to the combo box. Pre-select the type which was selected before, when available.
     * @param {Array} orderTypeSettings The order types to be added.
     * @param {string} selectedOrderType The order type to be selected.
     * @return {void}
     */
    function populateSupportedOrderTypes(orderTypeSettings, selectedOrderType) {
        const cbxOrderType = document.getElementById("idCbxOrderType");
        let option;
        let isSelectedOrderTypeSupported = false;
        let i;
        // Make the list empty first..
        for (i = cbxOrderType.options.length - 1; i >= 0; i -= 1) {
            cbxOrderType.remove(i);
        }
        orderTypeSettings.forEach(function (orderTypeSetting) {
            option = document.createElement("option");
            option.text = orderTypeSetting.OrderType;
            option.value = orderTypeSetting.OrderType;
            // Store the supported durations for this OrderType:
            option.dataset.durations = orderTypeSetting.DurationTypes.join("|");
            if (orderTypeSetting.OrderType === selectedOrderType) {
                option.setAttribute("selected", true);  // Make the selected type the default one
                isSelectedOrderTypeSupported = true;
            }
            cbxOrderType.add(option);
        });
        if (!isSelectedOrderTypeSupported) {
            changeOrderType();  // The current order type is not supported. Change to a different one
        }
    }

    /**
     * This is an example of getting the series (option sheet, or option space) of an option root.
     * @return {void}
     */
    function getSeries() {
        const newOrderObject = getOrderObjectFromJson();
        const optionRootId = document.getElementById("idInstrumentId").value;
        fetch(
            // Don't filter on parameter "TradingStatus=Tradable", because many series have status "NotDefined"
            demo.apiUrl + "/ref/v1/instruments/contractoptionspaces/" + optionRootId + "?OptionSpaceSegment=AllDates",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    if (responseJson.hasOwnProperty("OptionSpace")) {
                        newOrderObject.Uic = responseJson.OptionSpace[0].SpecificOptions[0].Uic;
                        newOrderObject.AssetType = responseJson.AssetType;  // Can differ (FuturesOption, StockOption, StockIndexOption)
                        document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
                        console.log(JSON.stringify(responseJson, null, 4));
                    } else {
                        // This can happen when the filter is too strict!
                        console.error("No option series found for this root. Are you filtering the results using TradingStatus?\n\n" + JSON.stringify(responseJson, null, 4));
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
     * This is an example of getting the trading settings of an instrument.
     * @return {void}
     */
    function getConditions() {

        /**
         * The instrument is tradable, but there might be limitations. If so, display them.
         * @param {Object} detailsObject The response with the instrument details.
         * @return {void}
         */
        function checkTradingStatus(detailsObject) {
            let statusDescription = "This instrument has trading limitations:\n";
            if (detailsObject.TradingStatus !== "Tradable") {
                if (detailsObject.hasOwnProperty("NonTradableReason")) {
                    switch (detailsObject.NonTradableReason) {
                    case "ETFsWithoutKIIDs":
                        statusDescription += "The issuer has not provided a Key Information Document (KID) for this instrument.";
                        break;
                    case "ExpiredInstrument":
                        statusDescription += "This instrument has expired.";
                        break;
                    case "NonShortableInstrument":
                        statusDescription += "Short selling is not available for this instrument.";
                        break;
                    case "NotOnlineClientTradable":
                        statusDescription += "This instrument is not tradable online.";
                        break;
                    case "OfflineTradableBonds":
                        statusDescription += "This instrument is tradable offline.";
                        break;
                    case "ReduceOnlyInstrument":
                        statusDescription += "This instrument is reduce-only.";
                        break;
                    default:
                        // There are reasons "OtherReason" and "None".
                        statusDescription += "This instrument is not tradable.";
                    }
                    statusDescription += "\n(" + detailsObject.NonTradableReason + ")";
                } else {
                    // Somehow not reason was supplied.
                    statusDescription += "Status: " + detailsObject.TradingStatus;
                }
                window.alert(statusDescription);
            }
        }

        /**
         * Verify if the selected account is capable of handling this instrument.
         * @param {Array<string>} tradableOn Supported account list.
         * @return {void}
         */
        function checkSupportedAccounts(tradableOn) {
            // Verify if the selected account is capable of handling this instrument.
            // First, get the id of the active account:
            const activeAccountId = demo.user.accounts.find(function (i) {
                return i.accountKey === demo.user.accountKey;
            }).accountId;
            // Next, check if instrument is allowed on this account:
            if (tradableOn.length === 0) {
                window.alert("This instrument cannot be traded on any of your accounts.");
            } else if (tradableOn.indexOf(activeAccountId) === -1) {
                window.alert("This instrument cannot be traded on the selected account " + activeAccountId + ", but only on " + tradableOn.join(", ") + ".");
            }
        }

        function calculateFactor(tickSize) {
            let numberOfDecimals = 0;
            if ((tickSize % 1) !== 0) {
                numberOfDecimals = tickSize.toString().split(".")[1].length;
            }
            return Math.pow(10, numberOfDecimals);
        }

        function checkTickSize(orderObject, tickSize) {
            const factor = calculateFactor(tickSize);  // Modulo doesn't support fractions, so multiply with a factor
            if (Math.round(orderObject.OrderPrice * factor) % Math.round(tickSize * factor) !== 0) {
                window.alert("The price of " + orderObject.OrderPrice + " doesn't match the tick size of " + tickSize);
            }
        }

        function checkTickSizes(orderObject, tickSizeScheme) {
            let tickSize = tickSizeScheme.DefaultTickSize;
            let i;
            for (i = 0; i < tickSizeScheme.Elements.length; i += 1) {
                if (orderObject.OrderPrice <= tickSizeScheme.Elements[i].HighPrice) {
                    tickSize = tickSizeScheme.Elements[i].TickSize;  // The price is below a threshold and therefore not the default
                    break;
                }
            }
            checkTickSize(orderObject, tickSize);
        }

        function checkMinimumTradeSize(orderObject, detailsObject) {
            if (orderObject.Amount < detailsObject.MinimumTradeSize) {
                window.alert("The order amount must be at least the minimumTradeSize of " + detailsObject.MinimumTradeSize);
            }
        }

        function checkMinimumOrderValue(orderObject, detailsObject) {
            const price = (
                orderObject.hasOwnProperty("OrderPrice")
                ? orderObject.OrderPrice
                : fictivePrice  // SIM doesn't allow calls to price endpoint for most instruments so just take something
            );
            if (orderObject.Amount * price < detailsObject.MinimumOrderValue) {
                window.alert("The order value (amount * price) must be at least the minimumOrderValue of " + detailsObject.MinimumOrderValue);
            }
        }

        function checkLotSizes(orderObject, detailsObject) {
            if (orderObject.Amount < detailsObject.MinimumLotSize) {
                window.alert("The amount must be at least the minimumLotSize of " + detailsObject.MinimumLotSize);
            }
            if (detailsObject.hasOwnProperty("LotSize") && orderObject.Amount % detailsObject.LotSize !== 0) {
                window.alert("The amount must be the lot size or a multiplication of " + detailsObject.LotSize);
            }
        }

        const newOrderObject = getOrderObjectFromJson();
        // This requests gets the order settings of the selected instrument.
        // By adding the AccountKey, specific account settings are considered as well.
        fetch(
            demo.apiUrl + "/ref/v1/instruments/details/" + newOrderObject.Uic + "/" + newOrderObject.AssetType + "?AccountKey=" + encodeURIComponent(demo.user.accountKey) + "&FieldGroups=SupportedOrderTypeSettings",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    populateSupportedOrderTypes(responseJson.SupportedOrderTypeSettings, newOrderObject.OrderType);
                    populateSupportedOrderDurations(newOrderObject.OrderDuration.DurationType);
                    console.log(JSON.stringify(responseJson, null, 4));
                    if (responseJson.IsTradable === false) {
                        window.alert("This instrument is not tradable!");
                        // For demonstration purposes the validation continues, but an order ticket shouldn't be shown!
                    }
                    checkTradingStatus(responseJson);
                    if (newOrderObject.OrderType !== "Market" && newOrderObject.OrderType !== "TraspasoIn") {
                        if (responseJson.hasOwnProperty("TickSizeScheme")) {
                            checkTickSizes(newOrderObject, responseJson.TickSizeScheme);
                        } else if (responseJson.hasOwnProperty("TickSize")) {
                            checkTickSize(newOrderObject, responseJson.TickSize);
                        }
                    }
                    checkSupportedAccounts(responseJson.TradableOn);
                    checkMinimumTradeSize(newOrderObject, responseJson);
                    if (newOrderObject.AssetType === "Stock") {
                        checkMinimumOrderValue(newOrderObject, responseJson);
                    }
                    if (newOrderObject.AssetType === "Stock" && responseJson.LotSizeType !== "NotUsed") {
                        checkLotSizes(newOrderObject, responseJson);
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
        const newOrderObject = getOrderObjectFromJson();
        const headersObject = {
            "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
            "Content-Type": "application/json; charset=utf-8"
        };
        if (document.getElementById("idChkRequestIdHeader").checked) {
            headersObject["X-Request-ID"] = newOrderObject.ExternalReference;  // Warning! Prevent error 409 (Conflict) from identical orders within 15 seconds
        }
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
        if (document.getElementById("idChkRequestIdHeader").checked) {
            headersObject["X-Request-ID"] = newOrderObject.ExternalReference;  // Warning! Prevent error 409 (Conflict) from identical orders within 15 seconds
        }
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

    demo.setupEvents([
        {"evt": "change", "elmId": "idCbxOrderType", "func": changeOrderType, "funcsToDisplay": [changeOrderType, populateSupportedOrderDurations, changeOrderDuration]},
        {"evt": "change", "elmId": "idCbxOrderDuration", "func": changeOrderDuration, "funcsToDisplay": [changeOrderDuration]},
        {"evt": "click", "elmId": "idBtnGetSeries", "func": getSeries, "funcsToDisplay": [getSeries]},
        {"evt": "click", "elmId": "idBtnGetConditions", "func": getConditions, "funcsToDisplay": [getConditions]},
        {"evt": "click", "elmId": "idBtnPreCheckOrder", "func": preCheckNewOrder, "funcsToDisplay": [preCheckNewOrder]},
        {"evt": "click", "elmId": "idBtnPlaceNewOrder", "func": placeNewOrder, "funcsToDisplay": [placeNewOrder]},
        {"evt": "click", "elmId": "idBtnModifyLastOrder", "func": modifyLastOrder, "funcsToDisplay": [modifyLastOrder]},
        {"evt": "click", "elmId": "idBtnCancelLastOrder", "func": cancelLastOrder, "funcsToDisplay": [cancelLastOrder]}
    ]);
    demo.displayVersion("trade");
}());
