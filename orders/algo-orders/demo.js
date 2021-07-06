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
            newOrderObject.AccountKey = demo.user.accountKey;
            document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
        } catch (e) {
            console.error(e);
        }
        return newOrderObject;
    }

    /**
     * Add the strategies which are allowed for this instrument.
     * @param {Array} Strategies The strategies to be added.
     * @return {void}
     */
    function populateSupportedStrategies(strategies) {
        const cbxStrategy = document.getElementById("idCbxStrategy");
        let option;
        let i;
        for (i = cbxStrategy.options.length - 1; i >= 0; i -= 1) {
            cbxStrategy.remove(i);
        }
        strategies.sort();
        strategies.forEach(function (strategy) {
            option = document.createElement("option");
            option.text = strategy;
            option.value = strategy;
            cbxStrategy.add(option);
        });
    }

    /**
     * Modify the order object so the elements comply to the strategy.
     * @return {void}
     */
    function selectStrategy() {
        const selectedStrategy = document.getElementById("idCbxStrategy").value;
        fetch(
            demo.apiUrl + "/ref/v1/algostrategies/" + encodeURIComponent(selectedStrategy),
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const newOrderObject = getOrderObjectFromJson();
                    const algoOrderData = {
                        "StrategyName": selectedStrategy,
                        "Arguments": {}
                    };
                    let explanation = "Strategy: " + responseJson.Description;
                    // Populate the strategy arguments:
                    responseJson.Parameters.forEach(function (parameter) {
                        let value;
                        explanation += "\n\nInput field " + parameter.UiOrderingIndex + ": " + parameter.Description;
                        explanation += "\nDisplayName: " + parameter.DisplayName + (
                            parameter.IsMandatory === true
                            ? " (required)"
                            : " (optional)"
                        );
                        switch (parameter.DataType) {
                        case "Char":  // Single character string
                            value = "a";
                            break;
                        case "Int":  // Integer
                            value = 42;
                            break;
                        case "Price":  // Price specified as a decimal number
                            value = 23.0037;
                            break;
                        case "Qty":  // Quantity specified as an integer
                            value = 100;
                            break;
                        case "String":  // A "choose one from a list" value like a dropdown
                            value = parameter.ParameterValues[0].Value;  // Create a dropdown list to show all options
                            break;
                        case "UtcTimestamp":  // Timestamp (not a full date) provided as a string (3 2-digit numeric inputs)
                            value = "13:27:53";
                            break;
                        default:
                            console.error("Unsupported DataType: " + parameter.DataType);
                        }
                        algoOrderData.Arguments[parameter.Name] = value;
                    });
                    // And add it to the newOrderData:
                    newOrderObject.AlgoOrderData = algoOrderData;
                    document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
                    console.log(explanation + "\n\nResponse:\n" + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Add the strategies which are allowed for this instrument.
     * @param {Array} Strategies The strategies to be added.
     * @return {void}
     */
    function populateSupportedStrategies(strategies) {
        const cbxStrategy = document.getElementById("idCbxStrategy");
        let option;
        let i;
        for (i = cbxStrategy.options.length - 1; i >= 0; i -= 1) {
            cbxStrategy.remove(i);
        }
        strategies.sort();
        strategies.forEach(function (strategy) {
            option = document.createElement("option");
            option.text = strategy;
            option.value = strategy;
            cbxStrategy.add(option);
        });
        selectStrategy();
    }

    /**
     * Get the instrument details too lookup the strategies.
     * @return {void}
     */
    function getStrategies() {
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
                    const instrumentName = responseJson.AssetType + " " + responseJson.Description + " (Uic " + responseJson.Uic + ")";
                    if (responseJson.hasOwnProperty("SupportedStrategies") && responseJson.SupportedStrategies.length > 0) {
                        populateSupportedStrategies(responseJson.SupportedStrategies);
                        console.log("Found strategies for " + instrumentName + ":\n\n" + responseJson.SupportedStrategies.join("\n"));
                    } else {
                        console.error("Instrument " + instrumentName + " doesn't support Algo Orders.");
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
     * Order changes are broadcasted via ENS. Retrieve the overnight events to see what you can expect.
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
        {"evt": "change", "elmId": "idCbxStrategy", "func": selectStrategy, "funcsToDisplay": [selectStrategy]},
        {"evt": "click", "elmId": "idBtnGetStrategies", "func": getStrategies, "funcsToDisplay": [getStrategies]},
        {"evt": "click", "elmId": "idBtnPlaceNewOrder", "func": placeNewOrder, "funcsToDisplay": [placeNewOrder]},
        {"evt": "click", "elmId": "idBtnModifyLastOrder", "func": modifyLastOrder, "funcsToDisplay": [modifyLastOrder]},
        {"evt": "click", "elmId": "idBtnCancelLastOrder", "func": cancelLastOrder, "funcsToDisplay": [cancelLastOrder]},
        {"evt": "click", "elmId": "idBtnHistoricalEnsEvents", "func": getHistoricalEnsEvents, "funcsToDisplay": [getHistoricalEnsEvents]},
        {"evt": "click", "elmId": "idBtnGetOrders", "func": getOrders, "funcsToDisplay": [getOrders]}
    ]);
    demo.displayVersion("trade");
}());
