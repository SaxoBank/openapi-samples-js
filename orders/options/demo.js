/*jslint this: true, browser: true, for: true, long: true */
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
    const fictivePrice = 70;  // SIM doesn't allow calls to price endpoint for most instruments
    let lastOrderId = 0;

    /**
     * Helper function to convert the json string to an object, with error handling.
     * @return {Object} The newOrderObject from the input field - null if invalid
     */
    function getOrderObjectFromJson() {
        let newOrderObject = null;
        try {
            newOrderObject = JSON.parse(document.getElementById("idNewOrderObject").value);
        } catch (e) {
            console.error(e);
        }
        return newOrderObject;
    }

    /**
     * Modify the order object so the elements comply to the order type.
     * @return {void}
     */
    function selectOrderType() {
        const newOrderObject = getOrderObjectFromJson();
        newOrderObject.OrderType = document.getElementById("idCbxOrderType").value;
        newOrderObject.AccountKey = demo.user.accountKey;
        delete newOrderObject.OrderPrice;
        delete newOrderObject.StopLimitPrice;
        delete newOrderObject.TrailingstopDistanceToMarket;
        delete newOrderObject.TrailingStopStep;
        switch (newOrderObject.OrderType) {
        case "Limit":  // A buy order will be executed when the price falls below the provided price point; a sell order when the price increases beyond the provided price point.
            fetch(
                demo.apiUrl + "/trade/v1/infoprices?AssetType=StockOption&uic=" + newOrderObject.Uic,
                {
                    "method": "GET",
                    "headers": {
                        "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                    }
                }
            ).then(function (response) {
                if (response.ok) {
                    response.json().then(function (responseJson) {
                        newOrderObject.OrderPrice = fictivePrice;  // SIM doesn't allow calls to price endpoint, otherwise responseJson.Quote.Bid
                        document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
                        console.log(JSON.stringify(responseJson));
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
        default:
            console.error("Unsupported order type " + newOrderObject.OrderType);
        }
    }

    /**
     * Adjust the order object in the textarea so the related properties comply with the chosen order duration.
     * @return {void}
     */
    function selectOrderDuration() {
        const newOrderObject = getOrderObjectFromJson();
        let now;
        newOrderObject.OrderDuration.DurationType = document.getElementById("idCbxOrderDuration").value;
        switch (newOrderObject.OrderDuration.DurationType) {
        case "DayOrder":
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
            newOrderObject.OrderDuration.ExpirationDateTime = now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate() + "T" + now.getHours() + ":" + now.getMinutes() + ":00";  // Example: 2020-03-20T14:00:00
            newOrderObject.OrderDuration.ExpirationDateContainsTime = true;
            break;
        default:
            console.error("Unsupported order duration " + newOrderObject.OrderDuration.DurationType);
        }
        document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
    }

    /**
     * Add the order types which are allowed for this account to the combo box. Pre-select the type which was selected before.
     * @param {Array} orderTypes The order types to be added.
     * @param {string} selectedOrderType The order type to be selected.
     * @return {void}
     */
    function populateSupportedOrderTypes(orderTypes, selectedOrderType) {
        const cbxOrderType = document.getElementById("idCbxOrderType");
        let option;
        let isSelectedOrderTypeAllowed = false;
        let i;
        for (i = cbxOrderType.options.length - 1; i >= 0; i -= 1) {
            cbxOrderType.remove(i);
        }
        orderTypes.sort();
        for (i = 0; i < orderTypes.length; i += 1) {
            option = document.createElement("option");
            option.text = orderTypes[i];
            option.value = orderTypes[i];
            if (orderTypes[i] === selectedOrderType) {
                option.setAttribute("selected", true);  // Make the selected type the default one
                isSelectedOrderTypeAllowed = true;
            }
            cbxOrderType.add(option);
        }
        if (!isSelectedOrderTypeAllowed) {
            selectOrderType();  // The current order type is not supported. Change to a different one
        }
    }

    /**
     * This is an example of getting the series (option sheet) of an option root.
     * @return {void}
     */
    function getSeries() {
        const newOrderObject = getOrderObjectFromJson();
        const optionRootId = document.getElementById("idInstrumentId").value;
        fetch(
            demo.apiUrl + "/ref/v1/instruments/contractoptionspaces/" + optionRootId + "?OptionSpaceSegment=AllDates&TradingStatus=Tradable",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    // Test for SupportedOrderTypes, ContractSize, Decimals and TickSizeScheme. An example can be found in the function getConditions()
                    populateSupportedOrderTypes(responseJson.SupportedOrderTypes, newOrderObject.OrderType);
                    newOrderObject.Uic = responseJson.OptionSpace[0].SpecificOptions[0].Uic;
                    newOrderObject.AccountKey = demo.user.accountKey;
                    document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
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
     * This is an example of getting the trading settings of an instrument.
     * @return {void}
     */
    function getConditions() {

        function checkSupportedOrderTypes(orderObject, orderTypes) {
            if (orderTypes.indexOf(orderObject.OrderType) === -1) {
                window.alert("The order type " + orderObject.OrderType + " is not supported for this instrument.");
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
        fetch(
            demo.apiUrl + "/ref/v1/instruments/details/" + newOrderObject.Uic + "/" + newOrderObject.AssetType + "?AccountKey=" + encodeURIComponent(demo.user.accountKey) + "&FieldGroups=OrderSetting",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    populateSupportedOrderTypes(responseJson.SupportedOrderTypes, newOrderObject.OrderType);
                    console.log(JSON.stringify(responseJson, null, 4));
                    if (responseJson.IsTradable === false) {
                        window.alert("This instrument is not tradable!");
                    }
                    checkSupportedOrderTypes(newOrderObject, responseJson.SupportedOrderTypes);
                    if (newOrderObject.OrderType !== "Market" && newOrderObject.OrderType !== "TraspasoIn") {
                        if (responseJson.hasOwnProperty("TickSizeScheme")) {
                            checkTickSizes(newOrderObject, responseJson.TickSizeScheme);
                        } else if (responseJson.hasOwnProperty("TickSize")) {
                            checkTickSize(newOrderObject, responseJson.TickSize);
                        }
                    }
                    checkMinimumTradeSize(newOrderObject, responseJson);
                    if (newOrderObject.AssetType === "Stock") {
                        checkMinimumOrderValue(newOrderObject, responseJson);
                    }
                    if (newOrderObject.AssetType === "Stock" && responseJson.LotSizeType !== "NotUsed") {
                        checkLotSizes(newOrderObject, responseJson);
                    }
                    if (responseJson.IsComplex) {
                        // Show a warning before placing an order in a complex product.
                        switch (demo.user.language) {
                        case "fr":
                            window.alert("Votre ordre porte sur un produit ou service complexe pour lequel vous devez avoir une connaissance et une expérience appropriées. Pour plus d’informations, veuillez consulter nos vidéos pédagogiques et nos guides.\nEn validant cet ordre, vous reconnaissez avoir été informé des risques de cette transaction.");
                            break;
                        default:
                            window.alert("Your order relates to a complex product or service for which you must have appropriate knowledge and experience. For more information, please see our instructional videos and guides.\nBy validating this order, you acknowledge that you have been informed of the risks of this transaction.");
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
     * This is an example of an order validation.
     * @return {void}
     */
    function preCheckNewOrder() {
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
                        console.error(JSON.stringify(responseJson, null, 4));
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
     * This is an example of getting the costs of this order.
     * @return {void}
     */
    function getOrderCosts() {
        // https://www.developer.saxo/openapi/learn/mifid-2-cost-reporting
        // https://www.developer.saxo/openapi/referencedocs/service?apiVersion=v1&serviceGroup=clientservices&service=trading%20conditions%20-%20contract%20option
        const optionRootId = document.getElementById("idInstrumentId").value;
        fetch(
            demo.apiUrl + "/cs/v1/tradingconditions/ContractOptionSpaces/" + encodeURIComponent(demo.user.accountKey) + "/" + optionRootId + "?FieldGroups=ScheduledTradingConditions",
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
     * This is an example of placing a single leg order.
     * @return {void}
     */
    function placeNewOrder() {
        const newOrderObject = getOrderObjectFromJson();
        const headersObject = {
            "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
            "Content-Type": "application/json; charset=utf-8"
        };
        newOrderObject.AccountKey = demo.user.accountKey;
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
        newOrderObject.AccountKey = demo.user.accountKey;
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

    document.getElementById("idCbxOrderType").addEventListener("change", function () {
        demo.run(selectOrderType);
    });
    document.getElementById("idCbxOrderDuration").addEventListener("change", function () {
        demo.run(selectOrderDuration);
    });
    document.getElementById("idBtnGetSeries").addEventListener("click", function () {
        demo.run(getSeries);
    });
    document.getElementById("idBtnGetConditions").addEventListener("click", function () {
        demo.run(getConditions);
    });
    document.getElementById("idBtnPreCheckOrder").addEventListener("click", function () {
        demo.run(preCheckNewOrder);
    });
    document.getElementById("idBtnGetOrderCosts").addEventListener("click", function () {
        demo.run(getOrderCosts);
    });
    document.getElementById("idBtnPlaceNewOrder").addEventListener("click", function () {
        demo.run(placeNewOrder);
    });
    document.getElementById("idBtnModifyLastOrder").addEventListener("click", function () {
        demo.run(modifyLastOrder);
    });
    document.getElementById("idBtnCancelLastOrder").addEventListener("click", function () {
        demo.run(cancelLastOrder);
    });
    demo.displayVersion("trade");
}());
