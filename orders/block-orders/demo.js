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
     * Helper function to convert the json string to an object, with error handling.
     * @return {Object} The newAllocationKeyObject from the input field - null if invalid
     */
    function getAllocationKeyObjectFromJson() {
        let newAllocationKeyObject = null;
        try {
            newAllocationKeyObject = JSON.parse(document.getElementById("idNewAllocationKeyObject").value);
            if (newAllocationKeyObject.hasOwnProperty("OwnerAccountKey")) {
                newAllocationKeyObject.OwnerAccountKey = demo.user.accountKey;
            }
            document.getElementById("idNewAllocationKeyObject").value = JSON.stringify(newAllocationKeyObject, null, 4);
        } catch (e) {
            console.error(e);
        }
        return newAllocationKeyObject;
    }

    /**
     * Update the AccountKey in the order and allocation object.
     * @return {void}
     */
    function changeAccountKey() {
        const accountKey = document.getElementById("idCbxAccount").value;
        const newAllocationKeyObject = getAllocationKeyObjectFromJson();
        const newOrderObject = getOrderObjectFromJson();
        if (newAllocationKeyObject === null || newOrderObject === null) {
            return;
        }
        newAllocationKeyObject.OwnerAccountKey = accountKey;
        newOrderObject.AccountKey = accountKey;
        document.getElementById("idNewAllocationKeyObject").value = JSON.stringify(newAllocationKeyObject, null, 4);
        document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
    }

    /**
     * Update the AllocationUnitType.
     * @return {void}
     */
    function changeAllocationUnitType() {
        const allocationUnitType = document.getElementById("idCbxAllocationUnitType").value;
        const newAllocationKeyObject = getAllocationKeyObjectFromJson();
        const newOrderObject = getOrderObjectFromJson();
        if (newAllocationKeyObject === null || newOrderObject === null) {
            return;
        }
        newAllocationKeyObject.AllocationUnitType = allocationUnitType;
        switch (allocationUnitType) {
        case "Percentage":
            // Distribution is done on a percentage basis. In this case the total sum of UnitValues in the ParticipatingAccounts array must add up to 100.
            newAllocationKeyObject.ParticipatingAccountsInfo.forEach(function (accountInfo) {
                // This is just an example. Up to you to make an algorithm to distribute the positions.
                accountInfo.UnitValue = 100 / newAllocationKeyObject.ParticipatingAccountsInfo.length;
            });
            break;
        case "Unit":
            // Distribution is done using units allocation.
            // In this case the total sum of UnitValues in the ParticipatingAccounts array must add up to the amount specified in the order,
            // or at least one of the accounts in the ParticipatingAccounts must have the AcceptRemainderAmount field set to true.
            newAllocationKeyObject.ParticipatingAccountsInfo.forEach(function (accountInfo) {
                // This is just an example. Up to you to make an algorithm to distribute the positions.
                accountInfo.UnitValue = newOrderObject.Amount / newAllocationKeyObject.ParticipatingAccountsInfo.length;
            });
            break;
        default:
            console.error("Unknown AllocationUnitType: " + allocationUnitType);
        }
        document.getElementById("idNewAllocationKeyObject").value = JSON.stringify(newAllocationKeyObject, null, 4);
    }

    /**
     * Update the AllocationKey in the order object.
     * @return {void}
     */
    function changeAllocationKey() {
        const allocationKeyId = document.getElementById("idCbxAllocationKey").value;
        const newOrderObject = getOrderObjectFromJson();
        if (newOrderObject === null) {
            return;
        }
        newOrderObject.AllocationKeyId = allocationKeyId;
        document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
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
                    const newAllocationKeyObject = getAllocationKeyObjectFromJson();
                    let priority = 1;
                    let accountList = "";
                    let ownerAccountList = "";
                    if (newAllocationKeyObject === null) {
                        return;
                    }
                    newAllocationKeyObject.ParticipatingAccountsInfo = [];
                    responseJson.Data.forEach(function (account) {
                        if (account.ClientKey === demo.user.clientKey) {
                            ownerAccountList += "ClientId " + account.ClientId + " AccountType " + account.AccountType + " AccountKey " + account.AccountKey + " (" + account.AccountId + ")\n";
                        } else if (account.Active) {
                            newAllocationKeyObject.ParticipatingAccountsInfo.push({
                                "AcceptRemainderAmount": true,  // All true, for spreading the remainder priority is used.
                                "AccountKey": account.AccountKey,
                                "Priority": priority,
                                "UnitValue": 10
                            });
                            accountList += "ClientId " + account.ClientId + " AccountType " + account.AccountType + " AccountKey " + account.AccountKey + " (" + account.AccountId + ")\n";
                            priority += 1;
                        }
                    });
                    document.getElementById("idNewAllocationKeyObject").value = JSON.stringify(newAllocationKeyObject, null, 4);
                    changeAllocationUnitType();
                    console.log("Owner (choose the BlockTrading account):\n" + ownerAccountList + "\nAdded " + newAllocationKeyObject.ParticipatingAccountsInfo.length + " participating accounts:\n" + accountList + "\nResponse: " + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Add an AllocationKeyId to the list.
     * @param {string} allocationKeyId The allocation key to add.
     * @param {string} allocationKeyName The name of the allocation key to add.
     * @return {void}
     */
    function addAllocationKeyToSelect(allocationKeyId, allocationKeyName) {
        const cbxAllocationKey = document.getElementById("idCbxAllocationKey");
        const option = document.createElement("option");
        option.text = allocationKeyId + ": " + allocationKeyName;
        option.value = allocationKeyId;
        cbxAllocationKey.add(option);
        cbxAllocationKey.value = allocationKeyId;
    }

    /**
     * Create an allocation key.
     * @return {void}
     */
    function createAllocationKey() {
        const newAllocationKeyObject = getAllocationKeyObjectFromJson();
        if (newAllocationKeyObject === null) {
            return;
        }
        fetch(
            demo.apiUrl + "/trade/v1/allocationkeys",
            {
                "method": "POST",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                    "Content-Type": "application/json; charset=utf-8"
                },
                "body": JSON.stringify(newAllocationKeyObject)
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const newOrderObject = getOrderObjectFromJson();
                    addAllocationKeyToSelect(responseJson.AllocationKeyId, newAllocationKeyObject.AllocationKeyName);
                    // Add the new AllocationKeyId string to the order object and display this:
                    newOrderObject.AllocationKeyId = responseJson.AllocationKeyId;
                    document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
                    console.log("Created key " + responseJson.AllocationKeyId + ".\n\nResponse: " + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Delete an allocation key.
     * @return {void}
     */
    function deleteAllocationKey() {
        const allocationKeyId = document.getElementById("idCbxAllocationKey").value;
        fetch(
            demo.apiUrl + "/trade/v1/allocationkeys/" + allocationKeyId,
            {
                "method": "DELETE",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                console.log("Allocation key " + allocationKeyId + " has been deleted.");
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Get a list of existing allocation keys. By default only Active allocation keys for current client are returned.
     * @return {void}
     */
    function getAllocationKeys() {
        fetch(
            demo.apiUrl + "/trade/v1/allocationkeys?Statuses=Active,DeactivateAfterOrderPlacement,OneTime",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const count = responseJson["__count"];
                    const responseText = (
                        count === 0
                        ? "No allocation keys available."
                        : count + " key(s) available."
                    ) + "\n\nResponse: " + JSON.stringify(responseJson, null, 4);
                    const cbxAllocationKey = document.getElementById("idCbxAllocationKey");
                    let i;
                    // Empty the list first..
                    for (i = cbxAllocationKey.options.length - 1; i >= 0; i -= 1) {
                        cbxAllocationKey.remove(i);
                    }
                    responseJson.Data.forEach(function (allocationKey) {
                        const creationTime = new Date(allocationKey.CreationTime);
                        addAllocationKeyToSelect(allocationKey.AllocationKeyId, allocationKey.AllocationKeyName + " (" + creationTime.toLocaleString() + ")");
                    });
                    changeAllocationKey();
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
     * Get detailed information about an allocation key.
     * @return {void}
     */
    function getAllocationKeyDetails() {
        const allocationKeyId = document.getElementById("idCbxAllocationKey").value;
        fetch(
            demo.apiUrl + "/trade/v1/allocationkeys/" + allocationKeyId,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const responseText = JSON.stringify(responseJson, null, 4);
                    let totalUnitValue = 0;
                    responseJson.ParticipatingAccountsInfo.forEach(function (participant) {
                        totalUnitValue += participant.UnitValue;
                    });
                    document.getElementById("idNewAllocationKeyObject").value = responseText;
                    console.log("Total UnitValue: " + totalUnitValue + "\n\nResponse: " + responseText);
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Get distributed amount for a given allocation key.
     * @return {void}
     */
    function getDistributions() {
        const allocationKeyId = document.getElementById("idCbxAllocationKey").value;
        const newOrderObject = getOrderObjectFromJson();
        if (newOrderObject === null) {
            return;
        }
        fetch(
            demo.apiUrl + "/trade/v1/allocationkeys/distributions/" + allocationKeyId + "?Totalamount=" + newOrderObject.Amount + "&Uic=" + newOrderObject.Uic + "&AssetType=" + newOrderObject.AssetType,
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
        // Full demo on ordering: https://saxobank.github.io/openapi-samples-js/orders/stocks/
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
                        console.log("Order correlation: " + responseJson.CorrelationKey + "\n\nResponse: " + JSON.stringify(responseJson, null, 4));
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
        // Full demo on ENS: https://saxobank.github.io/openapi-samples-js/websockets/order-events-monitoring/
        const fromDate = new Date();
        fromDate.setMinutes(fromDate.getMinutes() - 5);
        fetch(
            demo.apiUrl + "/ens/v1/activities?Activities=Orders,Positions&IncludeSubAccounts=true&FromDateTime=" + fromDate.toISOString(),
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
     * Get trade messages to show order progress.
     * @return {void}
     */
    function getTradeMessages() {
        // Full demo on trade messages: https://saxobank.github.io/openapi-samples-js/websockets/trade-messages/
        fetch(
            demo.apiUrl + "/trade/v1/messages",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    let tradeMessages = "";
                    if (responseJson.length > 0) {
                        responseJson.forEach(function (tradeMessage) {
                            tradeMessages += "[" + tradeMessage.MessageType + " @ " + new Date(tradeMessage.DateTime).toLocaleString() + "] " + tradeMessage.MessageHeader + ":\n" + tradeMessage.MessageBody + "\n\n";
                        });
                        console.log(tradeMessages + "\nResponse: " + JSON.stringify(responseJson, null, 4));
                    } else {
                        console.log("No trade messages found.");
                    }
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    demo.setupEvents([
        {"evt": "change", "elmId": "idCbxAccount", "func": changeAccountKey, "funcsToDisplay": [changeAccountKey]},
        {"evt": "change", "elmId": "idCbxAllocationUnitType", "func": changeAllocationUnitType, "funcsToDisplay": [changeAllocationUnitType]},
        {"evt": "change", "elmId": "idCbxAllocationKey", "func": changeAllocationKey, "funcsToDisplay": [changeAllocationKey]},
        {"evt": "click", "elmId": "idBtnGetAccountKeys", "func": getAccountKeys, "funcsToDisplay": [getAccountKeys]},
        {"evt": "click", "elmId": "idBtnCreateAllocationKey", "func": createAllocationKey, "funcsToDisplay": [createAllocationKey]},
        {"evt": "click", "elmId": "idBtnDeleteAllocationKey", "func": deleteAllocationKey, "funcsToDisplay": [deleteAllocationKey]},
        {"evt": "click", "elmId": "idBtnGetAllocationKeys", "func": getAllocationKeys, "funcsToDisplay": [getAllocationKeys]},
        {"evt": "click", "elmId": "idBtnGetAllocationKeyDetails", "func": getAllocationKeyDetails, "funcsToDisplay": [getAllocationKeyDetails]},
        {"evt": "click", "elmId": "idBtnGetDistributedAmount", "func": getDistributions, "funcsToDisplay": [getDistributions]},
        {"evt": "click", "elmId": "idBtnPreCheckOrder", "func": preCheckNewOrder, "funcsToDisplay": [preCheckNewOrder]},
        {"evt": "click", "elmId": "idBtnPlaceNewOrder", "func": placeNewOrder, "funcsToDisplay": [placeNewOrder]},
        {"evt": "click", "elmId": "idBtnGetOrderDetails", "func": getOrderDetails, "funcsToDisplay": [getOrderDetails]},
        {"evt": "click", "elmId": "idBtnModifyLastOrder", "func": modifyLastOrder, "funcsToDisplay": [modifyLastOrder]},
        {"evt": "click", "elmId": "idBtnCancelLastOrder", "func": cancelLastOrder, "funcsToDisplay": [cancelLastOrder]},
        {"evt": "click", "elmId": "idBtnHistoricalEnsEvents", "func": getHistoricalEnsEvents, "funcsToDisplay": [getHistoricalEnsEvents]},
        {"evt": "click", "elmId": "idBtnGetTradeMessages", "func": getTradeMessages, "funcsToDisplay": [getTradeMessages]}
    ]);
    demo.displayVersion("trade");
}());
