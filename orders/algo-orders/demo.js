/*jslint browser: true, long: true, for: true, unordered: true */
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
    let lastOrderId = 0;

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
                        // Conditional orders don't need an account key in the condition
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
                        let value;  // Used to display (dummy!) data
                        explanation += "\n\nInput field " + parameter.UiOrderingIndex + ": " + parameter.Description;
                        explanation += "\nDisplayName: " + parameter.DisplayName + " (" + (
                            parameter.IsMandatory === true
                            ? "required"
                            : "optional"
                        );
                        if (parameter.hasOwnProperty("UiDefaultValue")) {
                            value = parameter.UiDefaultValue;
                            explanation += ", default " + value;
                        } else {
                            // Just add some random values:
                            switch (parameter.DataType.toLowerCase()) {
                            case "char":  // Single character string
                                value = "a";
                                break;
                            case "int":  // Integer
                                value = 42;
                                break;
                            case "price":  // Price specified as a decimal number
                                value = 23.0037;
                                break;
                            case "qty":  // Quantity specified as an integer
                                value = 100;
                                break;
                            case "string":  // A "choose one from a list" value like a dropdown
                                value = "Bladiebla";  // Little chance there is no list..
                                break;
                            case "utctimestamp":  // TimeStamp (not a full date) provided as a string (3 2-digit numeric inputs)
                                value = "13:27:53";
                                break;
                            default:
                                console.error("Unsupported DataType: " + parameter.DataType);
                            }
                        }
                        if (parameter.hasOwnProperty("UiStepSize")) {
                            explanation += ", steps of " + parameter.UiStepSize;
                        }
                        if (parameter.hasOwnProperty("MinFloatValue")) {
                            explanation += ", min. " + parameter.MinFloatValue;
                            // Make sure the dummy value fits into the range:
                            value = Math.max(parameter.MinFloatValue, value);
                        }
                        if (parameter.hasOwnProperty("MaxFloatValue")) {
                            explanation += ", max. " + parameter.MaxFloatValue;
                            // Make sure the dummy value fits into the range:
                            value = Math.min(parameter.MaxFloatValue, value);
                        }
                        explanation += ")";
                        if (parameter.hasOwnProperty("ParameterValues")) {
                            explanation += "\nValues:";
                            parameter.ParameterValues.forEach(function (parameterValue, i) {
                                if (i === 0) {
                                    value = parameterValue.Value;
                                }
                                explanation += "\n- " + parameterValue.Name + ": " + parameterValue.Value;
                            });
                        }
                        algoOrderData.Arguments[parameter.Name] = value;
                    });
                    // And add it to the newOrderData:
                    newOrderObject.AlgoOrderData = algoOrderData;
                    document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
                    console.log(explanation + "\n\nResponse:\n" + JSON.stringify(responseJson, null, 4));
                    if (responseJson.SupportedOrderTypes.indexOf(newOrderObject.OrderType) === -1) {
                        window.alert("Unsupported order type. Supported types are: " + responseJson.SupportedOrderTypes.join(", "));
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
     * This is an example of removing an order.
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
        {"evt": "change", "elmId": "idCbxStrategy", "func": selectStrategy, "funcsToDisplay": [selectStrategy]},
        {"evt": "click", "elmId": "idBtnGetStrategies", "func": getStrategies, "funcsToDisplay": [getStrategies]},
        {"evt": "click", "elmId": "idBtnPlaceNewOrder", "func": placeNewOrder, "funcsToDisplay": [placeNewOrder]},
        {"evt": "click", "elmId": "idBtnModifyLastOrder", "func": modifyLastOrder, "funcsToDisplay": [modifyLastOrder]},
        {"evt": "click", "elmId": "idBtnCancelLastOrder", "func": cancelLastOrder, "funcsToDisplay": [cancelLastOrder]}
    ]);
    demo.displayVersion("trade");
}());
