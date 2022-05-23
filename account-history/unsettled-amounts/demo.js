/*jslint this: true, browser: true, for: true, long: true, unordered: true */
/*global window console demonstrationHelper */

(function () {
    // Create a helper function to remove some boilerplate code from the example itself.
    const demo = demonstrationHelper({
        "responseElm": document.getElementById("idResponse"),
        "javaScriptElm": document.getElementById("idJavaScript"),
        "accessTokenElm": document.getElementById("idBearerToken"),
        "retrieveTokenHref": document.getElementById("idHrefRetrieveToken"),
        "accountsList": document.getElementById("idCbxAccount"),
        "tokenValidateButton": document.getElementById("idBtnValidate"),
        "footerElm": document.getElementById("idFooter")
    });

    /**
     * Reads the selected value of the indentified dropdown, and returns the value.
     * Used for accessing the selected Currency-AmountTypeId, ExchangeId, or AmountTypeSource values.
     * @param {string} identifier
     * @returns {string}
     */
    function read(identifier) {
        return document.getElementById("idCbx" + identifier).selectedOptions[0].value;
    }

    /**
     * Populate dropdown with ExchangeIds that can be looked up.
     * @param {Object} response
     */
    function setExchangeDropdown(response) {
        const select = document.getElementById("idCbxExchangeId");
        response.Exchanges.forEach(function (exchange) {
            const opt = document.createElement("option");
            opt.value = exchange.ExchangeId;
            opt.text = exchange.ExchangeId;
            select.appendChild(opt);
        });
    }

    /**
     * Populate dropdown with owed currencies and amount types
     * @param {Object} response
     */
    function setDropdownForInstrument(response) {
        const select = document.getElementById("idCbxCurrencyAndAmountType");
        const currency = response.Currency;
        response.AmountTypes.forEach(function (amountType) {
            const opt = document.createElement("option");
            opt.value = currency + "-" + amountType.AmountTypeId;
            opt.text = currency + " - " + amountType.AmountType + " (" + amountType.AmountTypeId + ")";
            select.appendChild(opt);
        });
    }

    /**
     * Clear the Dropdown specified
     * @param {string} identifier
     */
    function resetDropdownOptions(identifier) {
        const select = document.getElementById("idCbx" + identifier);
        const sel_len = select.length;
        let i;
        for (i = 0; i < sel_len; i += 1) {
            select.remove(0);
        }
    }

    /**
     * Parse key information out of response and return string format for display
     * @param {Object} response
     * @param {string} requestType
     * @param {string} requestUrl
     * @param {string} params
     * @returns {string}
     */
    function parseResponse(response, requestType, requestUrl) {
        console.log(requestUrl)
        let endpointDisplay = "Endpoint: \n\t" + requestUrl.split("?")[0].split("openapi")[1] + "?\nParameters: \n\t" + requestUrl.split("?")[1].replaceAll("&", "&\n\t") + "\n";
        if (requestType === "Instruments") {
            return "Instruments for which amounts are owed\n" + endpointDisplay
        }

        let details = [];
        let dateRange = "Date Range is: \n\t" + response.CashFlows[0].ValueDate + " => " + response.CashFlows[response.CashFlows.length - 1].ValueDate;
        let total = response.Total + " " + response.Currency;
        let detailsDescription;

        if (response === null || response.CashFlows[0] === undefined) {
            return "No Amounts Owed\n" + endpointDisplay;
        }
        response = response[requestType];
        response.forEach(function (elem) {
            details.push(elem.ExchangeId || elem.Currency);
        });
        total = "Total (estimated) amount owed is: \n\t" + total;
        if (requestType === "Currencies") {
            detailsDescription = "Amounts are owed in these Currencies: \n\t" + details.toString();
        } else {
            detailsDescription = "Amounts are owed to these Exchanges: \n\t" + details.toString();
        }
        return endpointDisplay + "\n" + total + "\n" + dateRange + "\n" + detailsDescription + "\n\n";
    }

    /**
     * Get the unsettled amounts for a specific client by currency
     * @return {void}
     */
    function getUnsettledAmountsByCurrencyClick() {
        getUnsettledAmountsByCurrency("Currencies");
    }

    /**
     * Get the unsettled amounts for a specific client by amount type
     * @return {void}
     */
    function getUnsettledAmountsByAmountTypeClick() {
        getUnsettledAmountsByCurrency("AmountTypes");
    }

    /**
     * Get the unsettled amounts for a specific client, by currency or amount types
     * @return {void}
     */
    function getUnsettledAmountsByCurrency(scope) {
        const amountTypeSource = read("AmountTypeSource");
        let parameters = "?ClientKey=" + encodeURIComponent(demo.user.clientKey) + "&Scope=" + scope;
        if (amountTypeSource !== "All") {
            parameters += "&AmountTypeSource=" + amountTypeSource;
        }
        let endpoint = demo.apiUrl + "/hist/v1/unsettledamounts" + parameters
        fetch(
            endpoint,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    if (scope === "AmountTypes" && responseJson.Currencies.length > 0) {
                        resetDropdownOptions("CurrencyAndAmountType");
                        responseJson.Currencies.forEach(function (currency) {
                            setDropdownForInstrument(currency);
                        });
                    }
                    console.log(parseResponse(responseJson, "Currencies", endpoint) + JSON.stringify(responseJson, null, 2));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Get the unsettled instruments for which amounts are owed, for a specific client, currency, and amount type.
     * @return {void}
     */
    function getUnsettledAmountsByInstruments() {
        const currency = read("CurrencyAndAmountType").split("-")[0];
        const amountTypeId = read("CurrencyAndAmountType").split("-")[1];
        let parameters = "?ClientKey=" + encodeURIComponent(demo.user.clientKey) + "&Currency=" + currency + "&AmountTypeId=" + amountTypeId;
        if (read("CurrencyAndAmountType") === "-") {
            console.log("You must select a Currency and AmountTypeId first.\nIf the dropdown is empty, execute the 'Get amounts by amount type' first");
            return;
        }
        let endpoint = demo.apiUrl + "/hist/v1/unsettledamounts/instruments" + parameters
        fetch(
            endpoint,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    console.log(parseResponse(responseJson, "Instruments", endpoint) + JSON.stringify(responseJson, null, 2));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Get the unsettled amounts for a specific client, by exchange
     * @return {void}
     */
    function getUnsettledAmountsByExchange() {
        let amountTypeSource = read("AmountTypeSource");
        let parameters = "?ClientKey=" + encodeURIComponent(demo.user.clientKey);
        if (amountTypeSource !== "All") {
            parameters += "&AmountTypeSource=" + amountTypeSource;
        }
        let endpoint = demo.apiUrl + "/hist/v1/unsettledamounts/exchanges" + parameters;
        fetch(
            endpoint,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    if (responseJson.Exchanges.length > 0) {
                        resetDropdownOptions("ExchangeId");
                        setExchangeDropdown(responseJson);
                    }
                    console.log(parseResponse(responseJson, "Exchanges", endpoint) + JSON.stringify(responseJson, null, 2));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Get the unsettled amounts for a specific client, for a specific exchange
     * @return {void}
     */
    function getUnsettledAmountsForExchange() {
        let amountTypeSource = read("AmountTypeSource");
        let parameters = "?ClientKey=" + encodeURIComponent(demo.user.clientKey);
        if (read("ExchangeId") === "-") {
            console.log("You must select an ExchangeId. \nIf the dropdown is empty, execute the 'Get amounts by exchange' first");
            return;
        }
        if (amountTypeSource !== "All") {
            parameters += "&AmountTypeSource=" + amountTypeSource;
        }
        let endpoint = demo.apiUrl + "/hist/v1/unsettledamounts/exchanges/" + read("ExchangeId") + parameters;
        fetch(
            endpoint,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    console.log(parseResponse(responseJson, "Currencies", endpoint) + JSON.stringify(responseJson, null, 2));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }




    demo.setupEvents([
        { "evt": "click", "elmId": "idBtnGetUnsettledAmountsByCurrency", "func": getUnsettledAmountsByCurrencyClick, "funcsToDisplay": [getUnsettledAmountsByCurrencyClick, getUnsettledAmountsByCurrency] },
        { "evt": "click", "elmId": "idBtnGetUnsettledAmountsByAmountType", "func": getUnsettledAmountsByAmountTypeClick, "funcsToDisplay": [getUnsettledAmountsByAmountTypeClick, getUnsettledAmountsByCurrency] },
        { "evt": "click", "elmId": "idBtnGetUnsettledAmountsByInstruments", "func": getUnsettledAmountsByInstruments, "funcsToDisplay": [getUnsettledAmountsByInstruments] },
        { "evt": "click", "elmId": "idBtnGetUnsettledAmountsByExchange", "func": getUnsettledAmountsByExchange, "funcsToDisplay": [getUnsettledAmountsByExchange] },
        { "evt": "click", "elmId": "idBtnGetUnsettledAmountsForExchange", "func": getUnsettledAmountsForExchange, "funcsToDisplay": [getUnsettledAmountsForExchange] }
    ]);
    demo.displayVersion("hist");
}());
