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

    // AmountTypeSource Query Parameter Value, used on most endpoints here.
    var AmountTypeSource = read("AmountTypeSource");

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
        var select = document.getElementById("idCbxExchangeId");
        response.Exchanges.forEach(entry => {
            var opt = document.createElement("option");
            opt.value = entry.ExchangeId;
            opt.text = entry.ExchangeId;
            select.appendChild(opt);
        });
    }

    /**
     * Populate dropdown with owed currencies and amount types
     * @param {Object} response 
     */
    function setDropdownForInstrument(response) {
        var select = document.getElementById("idCbxCurrencyAndAmountType");
        var currency = response.Currency
        response.AmountTypes.forEach(entry => {
            var opt = document.createElement("option");
            opt.value = currency + "-" + entry["AmountTypeId"];
            opt.text = currency + " - " + entry["AmountType"] + " (" + entry["AmountTypeId"] + ")";
            select.appendChild(opt);
        })
    }

    /**
     * Clear the Dropdown specified
     * @param {string} identifier 
     */
    function resetDropdownOptions(identifier) {
        var select = document.getElementById("idCbx" + identifier);
        var sel_len = select.length;
        for (var i = 0; i < sel_len; i++) {
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
    function parseResponse(response, requestType, requestUrl, params) {
        if (requestType === "Instruments") {
            return "Instruments for which amounts are owed\n" + "Endpoint: \n\t" + requestUrl + "\nParameters: \n\t" + params + "\n";
        } else if (response === null || response.CashFlows[0] === undefined) {
            return "No Amounts Owed\n" + "Endpoint: \n\t" + requestUrl + "\nParameters: \n\t" + params + "\n";
        }
        var details = [];
        var dateRange = "Date Range is: \n\t"
            + response.CashFlows[0].ValueDate + " => "
            + response.CashFlows[response.CashFlows.length - 1].ValueDate;
        var total = response.Total + " " + response.Currency;

        response = response[requestType];
        response.forEach(elem => { details.push(elem.ExchangeId || elem.Currency) })
        total = "Total (estimated) amount owed is: \n\t" + total;
        if (requestType === "Currencies") {
            details = "Amounts are owed in these Currencies: \n\t" + details.toString();
        } else {
            details = "Amounts are owed to these Exchanges: \n\t" + details.toString();
        }
        return "Endpoint: \n\t" + requestUrl + "\nParameters: \n\t" + params + "\n" + total + "\n" + dateRange + "\n" + details + "\n\n";

    }
    /**
     * Get the unsettled amounts for a specific client, by currency or amount types
     * @return {void}
     */
    function getUnsettledAmountsByCurrency(scope) {
        let parameters = "?ClientKey=" + encodeURIComponent(demo.user.clientKey) + "&Scope=" + scope;
        AmountTypeSource = read("AmountTypeSource");
        if (AmountTypeSource !== "All") parameters += "&AmountTypeSource=" + AmountTypeSource;
        fetch(
            demo.apiUrl + "/hist/v1/unsettledamounts" + parameters,
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
                        responseJson.Currencies.forEach(elem => {
                            setDropdownForInstrument(elem);
                        })
                    }
                    console.log(parseResponse(responseJson, "Currencies", "/hist/v1/unsettledamounts", parameters) + JSON.stringify(responseJson, null, 2));
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
        if (read("CurrencyAndAmountType") === "-") {
            console.log("You must select a Currency and AmountTypeId first.\nIf the dropdown is empty, execute the 'Get amounts by amount type' first");
            return
        }
        var currency = read("CurrencyAndAmountType").split("-")[0];
        var AmountTypeId = read("CurrencyAndAmountType").split("-")[1];

        let parameters = "?ClientKey=" + encodeURIComponent(demo.user.clientKey) + "&Currency=" + currency + "&AmountTypeId=" + AmountTypeId;
        fetch(
            demo.apiUrl + "/hist/v1/unsettledamounts/instruments" + parameters,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    console.log(parseResponse(responseJson, "Instruments", "/hist/v1/unsettledamounts/instruments", parameters) + JSON.stringify(responseJson, null, 2));
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
        let parameters = "?ClientKey=" + encodeURIComponent(demo.user.clientKey);
        AmountTypeSource = read("AmountTypeSource");
        if (AmountTypeSource !== "All") parameters += "&AmountTypeSource=" + AmountTypeSource;
        fetch(
            demo.apiUrl + "/hist/v1/unsettledamounts/exchanges" + parameters,
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
                    console.log(parseResponse(responseJson, "Exchanges", "/hist/v1/unsettledamounts/exchanges", parameters) + JSON.stringify(responseJson, null, 2))
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
        let parameters = "?ClientKey=" + encodeURIComponent(demo.user.clientKey);
        AmountTypeSource = read("AmountTypeSource");
        if (read("ExchangeId") === "-") {
            console.log("You must select an ExchangeId. \nIf the dropdown is empty, execute the 'Get amounts by exchange' first");
            return;
        }
        if (AmountTypeSource !== "All") parameters += "&AmountTypeSource=" + AmountTypeSource;
        fetch(
            demo.apiUrl + "/hist/v1/unsettledamounts/exchanges/" + read("ExchangeId") + parameters,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    console.log(parseResponse(responseJson, "Currencies", "/hist/v1/unsettledamounts/exchanges/" + read("ExchangeId"), parameters) + JSON.stringify(responseJson, null, 2));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }
    demo.setupEvents([
        { "evt": "click", "elmId": "idBtnGetUnsettledAmountsByCurrency", "func": function () { getUnsettledAmountsByCurrency("Currencies") }, "funcsToDisplay": [getUnsettledAmountsByCurrency] },
        { "evt": "click", "elmId": "idBtnGetUnsettledAmountsByAmountType", "func": function () { getUnsettledAmountsByCurrency("AmountTypes") }, "funcsToDisplay": [getUnsettledAmountsByCurrency] },
        { "evt": "click", "elmId": "idBtnGetUnsettledAmountsByInstruments", "func": function () { getUnsettledAmountsByInstruments() }, "funcsToDisplay": [getUnsettledAmountsByInstruments] },
        { "evt": "click", "elmId": "idBtnGetUnsettledAmountsByExchange", "func": function () { getUnsettledAmountsByExchange() }, "funcsToDisplay": [getUnsettledAmountsByExchange] },
        { "evt": "click", "elmId": "idBtnGetUnsettledAmountsForExchange", "func": function () { getUnsettledAmountsForExchange() }, "funcsToDisplay": [getUnsettledAmountsForExchange] },
    ]);
    demo.displayVersion("hist");
}());
