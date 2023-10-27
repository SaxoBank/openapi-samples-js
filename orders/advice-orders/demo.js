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
    const fictivePrice = 70;  // SIM doesn't allow calls to price endpoint for most instruments
    let managedAccountsResponseData = null;

    /**
     * Helper function to convert the json string to an object, with error handling.
     * @return {Object} The newOrderObject from the input field - null if invalid
     */
    function getOrderObjectFromJson() {
        const orderObjectId = "idNewOrderObject";
        const accountKey = document.getElementById("idCbxManagedAccountKey").value;
        let newOrderObject = null;
        try {
            newOrderObject = JSON.parse(document.getElementById(orderObjectId).value);
            if (newOrderObject.hasOwnProperty("AccountKey")) {
                // This is the case for single orders, or conditional/related orders
                // This function is used for other order types as well, so more order types are considered
                newOrderObject.AccountKey = accountKey;
            }
            if (newOrderObject.hasOwnProperty("Orders")) {
                // This is the case for OCO, related and conditional orders
                newOrderObject.Orders.forEach(function (order) {
                    if (order.hasOwnProperty("AccountKey")) {
                        order.AccountKey = accountKey;
                    }
                });
            }
            document.getElementById(orderObjectId).value = JSON.stringify(newOrderObject, null, 4);
        } catch (e) {
            console.error(e);
        }
        return newOrderObject;
    }

    /**
     * Helper function to convert the json string to an object, with error handling.
     * @return {Object} The newAdviceObject from the input field - null if invalid
     */
    function getAdviceObjectFromJson() {
        const accountKey = document.getElementById("idCbxManagedAccountKey").value;
        let newAdviceObject = null;
        try {
            newAdviceObject = JSON.parse(document.getElementById("idChangeAdviceObject").value);
            newAdviceObject.AccountKey = accountKey;
            document.getElementById("idChangeAdviceObject").value = JSON.stringify(newAdviceObject, null, 4);
        } catch (e) {
            console.error(e);
        }
        return newAdviceObject;
    }

    /**
     * Add an accountKey to the list.
     * @param {string} accountKey The value.
     * @param {string} description Description to display.
     * @return {Element} The accountKey list.
     */
    function addAccountToAccountKeyList(accountKey, description) {
        const cbxAccountKeys = document.getElementById("idCbxManagedAccountKey");
        const option = document.createElement("option");
        option.text = description;
        option.value = accountKey;
        cbxAccountKeys.add(option);
        return cbxAccountKeys;
    }

    /**
     * Display the active end client AccountKey in the edits.
     * @return {void}
     */
    function addSelectedAccountKeyToEdits() {
        getOrderObjectFromJson();
        getAdviceObjectFromJson();
    }

    /**
     * Remove all items from a combo box.
     * @param {string} id The identiefier.
     * @return {void}
     */
    function clearCombobox(id) {
        const cbx = document.getElementById(id);
        let i;
        for (i = cbx.options.length - 1; i >= 0; i -= 1) {
            cbx.remove(i);
        }
    }

    /**
     * Get details about clients under a particular owner.
     * @return {void}
     */
    function getAccountKeys() {
        fetch(
            demo.apiUrl + "/port/v1/accounts?IncludeSubAccounts=true&ClientKey=" + encodeURIComponent(demo.user.clientKey),
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    let accountCount = 0;
                    clearCombobox("idCbxManagedAccountKey");
                    responseJson.Data.forEach(function (account) {
                        if (account.ClientKey === demo.user.clientKey) {
                            addAccountToAccountKeyList(account.AccountKey, "Your account: " + account.AccountId + " (" + account.AccountType + ")");
                        } else if (account.Active) {
                            addAccountToAccountKeyList(account.AccountKey, "Account end client: " + account.AccountId + " (" + account.AccountType + ")");
                            accountCount += 1;
                        }
                    });
                    managedAccountsResponseData = responseJson.Data;  // Keep, so ClientKeys can be looked up by AccountKey
                    console.log("Found " + accountCount + " managed accounts.\nResponse: " + JSON.stringify(responseJson, null, 4));
                    addSelectedAccountKeyToEdits();
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This demo can be used for not only Stocks. You can change the model in the editor to Bond, SrdOnStock, etc.
     * @param {Object} responseJson The response with the references.
     * @return {string} A message pointing you at the feature to change the order object.
     */
    function getRelatedAssetTypesMessage(responseJson) {
        let result = "";
        let i;
        let relatedInstrument;

        function addAssetTypeToMessage(assetType) {
            if (relatedInstrument.AssetType === assetType) {
                result += (
                    result === ""
                    ? ""
                    : "\n\n"
                ) + "The response below indicates there is a related " + assetType + ".\nYou can change the order object to AssetType '" + assetType + "' and Uic '" + relatedInstrument.Uic + "' to test " + assetType + " orders.";
            }
        }

        if (responseJson.hasOwnProperty("RelatedInstruments")) {
            for (i = 0; i < responseJson.RelatedInstruments.length; i += 1) {
                relatedInstrument = responseJson.RelatedInstruments[i];
                addAssetTypeToMessage("Bond");
                addAssetTypeToMessage("SrdOnStock");
                // The other way around works as well. Show message for Stock.
                addAssetTypeToMessage("Stock");
            }
        }
        if (responseJson.hasOwnProperty("RelatedOptionRootsEnhanced")) {
            // Don't loop. Just take the first, for demo purposes.
            relatedInstrument = responseJson.RelatedOptionRootsEnhanced[0];
            result += (
                result === ""
                ? ""
                : "\n\n"
            ) + "The response below indicates there are related options.\nYou can use OptionRootId '" + relatedInstrument.OptionRootId + "' in the options example.";
        }
        return result;
    }

    /**
     * This function collects the access rights of the logged in user.
     * @return {void}
     */
    function getAccessRights() {
        fetch(
            demo.apiUrl + "/root/v1/user",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const responseText = "\n\nResponse: " + JSON.stringify(responseJson, null, 4);
                    if (responseJson.Operations.indexOf("OAPI.OP.CanAdviseOnOrdersOnOwnedClients") > -1) {
                        console.log("You are allowed to create advices on owned clients." + responseText);
                    } else if (responseJson.Operations.indexOf("OAPI.OP.CanAdviseOnOrders") > -1) {
                        console.log("You are allowed to place order advices." + responseText);
                    } else if (responseJson.Operations.indexOf("OAPI.OP.CanAdviseOnOrdersOnRestrictedClients") > -1) {
                        console.log("You are allowed to place order advices on restricted clients." + responseText);
                    } else {
                        console.error("You are NOT allowed to place advice orders." + responseText);
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
         * Verify if the selected OrderType is supported for the instrument.
         * @param {Object} orderObject The object used to POST the new order.
         * @param {Array<string>} orderTypes Array with supported order types (Market, Limit, etc).
         * @return {void}
         */
        function checkSupportedOrderTypes(orderObject, orderTypes) {
            if (orderTypes.indexOf(orderObject.OrderType) === -1) {
                window.alert("The order type " + orderObject.OrderType + " is not supported for this instrument.");
            }
        }

        /**
         * Verify if the selected account is capable of handling this instrument.
         * @param {Array<string>} tradableOn Supported account list.
         * @return {void}
         */
        function checkSupportedAccounts(tradableOn) {
            const accountKey = document.getElementById("idCbxManagedAccountKey").value;
            // First, get the id of the active account:
            const activeAccountId = managedAccountsResponseData.find(function (i) {
                return i.AccountKey === accountKey;
            }).AccountId;
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
        const accountKey = document.getElementById("idCbxManagedAccountKey").value;
        fetch(
            demo.apiUrl + "/ref/v1/instruments/details/" + newOrderObject.Uic + "/" + newOrderObject.AssetType + "?AccountKey=" + encodeURIComponent(accountKey) + "&FieldGroups=OrderSetting",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    console.log(getRelatedAssetTypesMessage(responseJson) + "\n\n" + JSON.stringify(responseJson, null, 4));
                    if (responseJson.IsTradable === false) {
                        window.alert("This instrument is not tradable!");
                        // For demonstration purposes, the validation continues, but an order ticket shouldn't be shown!
                    }
                    checkTradingStatus(responseJson);
                    checkSupportedOrderTypes(newOrderObject, responseJson.SupportedOrderTypes);
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
     * Add an Order to the list.
     * @param {string} orderId The value.
     * @param {string} description Description to display.
     * @return {Element} The orders list.
     */
    function addOrderToOrdersList(orderId, description) {
        const cbxOrders = document.getElementById("idCbxOrderId");
        const option = document.createElement("option");
        option.text = description;
        option.value = orderId;
        cbxOrders.add(option);
        return cbxOrders;
    }

    /**
     * This is an example of placing a single leg order.
     * @return {void}
     */
    function placeNewOrder() {
        const headersObject = {
            "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
            "Content-Type": "application/json; charset=utf-8",
            "X-Request-ID": Math.random()  // This prevents error 409 (Conflict) from identical previews within 15 seconds
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
                    addOrderToOrdersList(responseJson.OrderId, "New order " + responseJson.OrderId).value = responseJson.OrderId;
                    getOrderDetails();
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
     * Get the ClientKey of an AccountKey by using a cached response.
     * @return {void}
     */
    function getClientKeyOfSelectedAccount() {
        const accountKeyToFind = document.getElementById("idCbxManagedAccountKey").value;
        if (managedAccountsResponseData === null) {
            console.error("Request managed accounts first, before making this request.");
            throw "Request managed accounts first, before making this request.";
        }
        return managedAccountsResponseData.find(function (i) {
            return i.AccountKey === accountKeyToFind;
        }).ClientKey;
    }

    /**
     * Helper function to determine if OrderId is a number.
     * @param {string} n The value.
     * @return {boolean} True is the parameter is numeric.
     */
    function isNumeric(n) {
        // Source https://stackoverflow.com/questions/18082/validate-decimal-numbers-in-javascript-isnumeric
        return !Number.isNaN(parseFloat(n)) && Number.isFinite(n);
    }

    /**
     * Retrieve order details.
     * @return {void}
     */
    function getOrderDetails() {
        const clientKey = getClientKeyOfSelectedAccount();
        const orderId = document.getElementById("idCbxOrderId").value;
        if (isNumeric(orderId)) {
            console.error("An OrderId must be selected first.");
            return;
        }
        fetch(
            demo.apiUrl + "/port/v1/orders/" + encodeURIComponent(clientKey) + "/" + orderId,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    console.log("Response: " + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This is an example of updating an advice.
     * @return {void}
     */
    function updateAdvice() {
        const orderId = document.getElementById("idCbxOrderId").value;
        const newAdviceObject = getAdviceObjectFromJson();
        const headersObject = {
            "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
            "Content-Type": "application/json; charset=utf-8"
        };
        if (isNumeric(orderId)) {
            console.error("An OrderId must be selected first.");
            return;
        }
        fetch(
            demo.apiUrl + "/trade/v2/orders/" + orderId + "/advice",
            {
                "method": "PUT",
                "headers": headersObject,
                "body": JSON.stringify(newAdviceObject)
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    console.log("Successful request:\n" + JSON.stringify(responseJson, null, 4));
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
     * This is an example of cancelling an advice, leading to an order cancel.
     * @return {void}
     */
    function cancelOrderAdvice() {
        const adviceDeleteAction = document.getElementById("idCbxAdviceDeleteAction").value;
        const accountKey = document.getElementById("idCbxManagedAccountKey").value;
        const orderId = document.getElementById("idCbxOrderId").value;
        if (isNumeric(orderId)) {
            console.error("An OrderId must be selected first.");
            return;
        }
        // DELETE /trade/v2/orders/123/advice?AdviceDeleteAction={Reject/Revoke}&AccountKey={AccountKey}
        fetch(
            demo.apiUrl + "/trade/v2/orders/" + orderId + "/advice?AdviceDeleteAction=" + adviceDeleteAction + "&AccountKey=" + encodeURIComponent(accountKey),
            {
                "method": "DELETE",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    // Response will echo the OrderId
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
        const accountKey = document.getElementById("idCbxManagedAccountKey").value;
        const fromDate = new Date();
        fromDate.setMinutes(fromDate.getMinutes() - 10);
        fetch(
            demo.apiUrl + "/ens/v1/activities?Activities=Orders&FromDateTime=" + fromDate.toISOString() + "&AccountKey=" + encodeURIComponent(accountKey),
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

    /**
     * Retrieve the list of pending order advices.
     * @return {void}
     */
    function getOrders() {
        const accountKey = document.getElementById("idCbxManagedAccountKey").value;
        const clientKey = getClientKeyOfSelectedAccount();
        fetch(
            demo.apiUrl + "/port/v1/orders?Status=All&ClientKey=" + encodeURIComponent(clientKey) + "&AccountKey=" + encodeURIComponent(accountKey),
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    // Empty order list:
                    clearCombobox("idCbxOrderId");
                    if (responseJson.Data.length === 0) {
                        console.error("No orders found on account " + accountKey);
                    } else {
                        responseJson.Data.forEach(function (order) {
                            addOrderToOrdersList(order.OrderId, order.OrderId + " (" + order.Status + ")");
                        });
                        getOrderDetails();
                        console.log("All open orders for account '" + accountKey + "'.\n\n" + JSON.stringify(responseJson, null, 4));
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
     * Reflect the new status in the modify order advice edit.
     * @return {void}
     */
    function updateModifyOrderEdit() {
        const newStatus = document.getElementById("idCbxAdviceModifyAction").value;
        const adviceObject = getAdviceObjectFromJson();
        adviceObject.AdviceAction = newStatus;
        document.getElementById("idChangeAdviceObject").value = JSON.stringify(adviceObject, null, 4);
    }

    demo.setupEvents([
        {"evt": "change", "elmId": "idCbxManagedAccountKey", "func": addSelectedAccountKeyToEdits, "funcsToDisplay": [addSelectedAccountKeyToEdits]},
        {"evt": "change", "elmId": "idCbxOrderId", "func": getOrderDetails, "funcsToDisplay": [getOrderDetails]},
        {"evt": "change", "elmId": "idCbxAdviceModifyAction", "func": updateModifyOrderEdit, "funcsToDisplay": [updateModifyOrderEdit]},
        {"evt": "click", "elmId": "idBtnGetAccountKeys", "func": getAccountKeys, "funcsToDisplay": [getAccountKeys]},
        {"evt": "click", "elmId": "idBtnGetAccessRights", "func": getAccessRights, "funcsToDisplay": [getAccessRights]},
        {"evt": "click", "elmId": "idBtnGetConditions", "func": getConditions, "funcsToDisplay": [getConditions]},
        {"evt": "click", "elmId": "idBtnPreCheckOrder", "func": preCheckNewOrder, "funcsToDisplay": [preCheckNewOrder]},
        {"evt": "click", "elmId": "idBtnPlaceNewOrder", "func": placeNewOrder, "funcsToDisplay": [placeNewOrder]},
        {"evt": "click", "elmId": "idBtnGetOrderDetails", "func": getOrderDetails, "funcsToDisplay": [getOrderDetails]},
        {"evt": "click", "elmId": "idBtnUpdateAdvice", "func": updateAdvice, "funcsToDisplay": [updateAdvice]},
        {"evt": "click", "elmId": "idBtnCancelOrderAdvice", "func": cancelOrderAdvice, "funcsToDisplay": [cancelOrderAdvice]},
        {"evt": "click", "elmId": "idBtnGetOrders", "func": getOrders, "funcsToDisplay": [getOrders]},
        {"evt": "click", "elmId": "idBtnHistoricalEnsEvents", "func": getHistoricalEnsEvents, "funcsToDisplay": [getHistoricalEnsEvents]}
    ]);
    demo.displayVersion("trade");
}());
