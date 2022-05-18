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
    var AmountTypeSource = read("AmountTypeSource")

    //reads the selected value of the dropdowns with relevant Currency-AmountTypeId, ExchangeId, or AmountTypeSource values. 
    function read(identifier) {
        return document.getElementById("idCbx" + identifier).selectedOptions[0].value
    }

    function setDropdown(response, identifier, field) {
        var select = document.getElementById("idCbx" + identifier);
        response[field].forEach(entry => {
            var opt = document.createElement("option");
            opt.value = entry[identifier]
            opt.text = entry[identifier]
            select.appendChild(opt)
        })
    }

    function setDropdownForInstrument(response) {
        var select = document.getElementById("idCbxCurrencyAndAmountType");
        var currency = response.Currency
        response["AmountTypes"].forEach(entry => {
            var opt = document.createElement("option");
            opt.value = currency + "-" + entry["AmountTypeId"]
            opt.text = currency + " - " + entry["AmountType"] + " (" + entry["AmountTypeId"] + ")"
            select.appendChild(opt)
        })
    }

    function resetDropdownOptions(identifier) {
        var select = document.getElementById("idCbx" + identifier)
        var sel_len = select.length
        for (var i = 0; i < sel_len; i++) {
            select.remove(0)
        }
    }

    function parseResponse(response, requestType, requestUrl, params) {
        if (requestType === "Instruments") {
            return "Instruments for which amounts are owed\n" + "Endpoint: \n\t" + requestUrl + "\nParameters: \n\t" + params + "\n"
        } else if (response === null || response.CashFlows[0] === undefined) {
            return "No Amounts Owed\n" + "Endpoint: \n\t" + requestUrl + "\nParameters: \n\t" + params + "\n"
        }
        var details = []
        var dateRange = "Date Range is: \n\t"
            + response.CashFlows[0].ValueDate + " => "
            + response.CashFlows[response.CashFlows.length - 1].ValueDate
        var total = response.Total + " " + response.Currency

        response = response[requestType]
        response.forEach(elem => { details.push(elem.ExchangeId || elem.Currency) })
        total = "Total (estimated) amount owed is: \n\t" + total
        if (requestType === "Currencies") {
            details = "Owed Currencies: \n\t" + details.toString()
        } else {
            details = "Exchanges: \n\t" + details.toString()
        }
        return "Endpoint: \n\t" + requestUrl + "\nParameters: \n\t" + params + "\n" + total + "\n" + dateRange + "\n" + details + "\n\n"

    }
    /**
     * Get the unsettled amounts for a specific client, by currency or amount types
     * @return {void}
     */
    function getUnsettledAmountsByCurrency(scope) {

        let parameters = "?ClientKey=" + encodeURIComponent(demo.user.clientKey) + "&Scope=" + scope
        AmountTypeSource = read("AmountTypeSource")
        if (AmountTypeSource !== "All") parameters += "&AmountTypeSource=" + AmountTypeSource
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
                        resetDropdownOptions("CurrencyAndAmountType")
                        responseJson.Currencies.forEach(elem => {
                            setDropdownForInstrument(elem)
                        })
                    }
                    console.log(parseResponse(responseJson, "Currencies", "/hist/v1/unsettledamounts", parameters) + JSON.stringify(responseJson, null, 2))

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

        let parameters = "?ClientKey=" + encodeURIComponent(demo.user.clientKey)
        AmountTypeSource = read("AmountTypeSource")
        if (AmountTypeSource !== "All") parameters += "&AmountTypeSource=" + AmountTypeSource
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
                        resetDropdownOptions("ExchangeId")
                        setDropdown(responseJson, "ExchangeId", "Exchanges")
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
    ''
    /**
     * Get the unsettled amounts for a specific client, for a specific exchange
     * @return {void}
     */
    function getUnsettledAmountsForExchange() {

        let parameters = "?ClientKey=" + encodeURIComponent(demo.user.clientKey)
        AmountTypeSource = read("AmountTypeSource")
        if (read("ExchangeId") === "-") {
            console.log("You must select an ExchangeId. \nIf the dropdown is empty, execute the 'Get amounts by exchange' first")
            return
        }
        if (AmountTypeSource !== "All") parameters += "&AmountTypeSource=" + AmountTypeSource
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
                    console.log(parseResponse(responseJson, "Currencies", "/hist/v1/unsettledamounts/exchanges/" + read("ExchangeId"), parameters) + JSON.stringify(responseJson, null, 2))
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }
    /**
     * Get the unsettled isntruments for which amounts are owed, for a specific client, currency, and amount type.
     * @return {void}
     */
    function getUnsettledAmountsByInstruments() {
        if (read("CurrencyAndAmountType") === "-") {
            console.log("")
            console.log("You must select a Currency and AmountTypeId first.\nIf the dropdown is empty, execute the 'Get amounts by amount type' first")
            return
        }
        var currency = read("CurrencyAndAmountType").split("-")[0]
        var AmountTypeId = read("CurrencyAndAmountType").split("-")[1]

        let parameters = "?ClientKey=" + encodeURIComponent(demo.user.clientKey) + "&Currency=" + currency + "&AmountTypeId=" + AmountTypeId
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
                    console.log(parseResponse(responseJson, "Instruments", "/hist/v1/unsettledamounts/instruments", parameters) + JSON.stringify(responseJson, null, 2))
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }
    //this should be good inspiration for looping over response!

    // for (i = 0; i < responseJson.Data.length; i += 1) {
    //     option = document.createElement("option");
    //     option.text = responseJson.Data[i].BeneficiaryDetails.AccountNumber + " (" + responseJson.Data[i].Currency + ") " + responseJson.Data[i].Name;
    //     option.value = responseJson.Data[i].BeneficiaryInstructionId;
    //     cbxBeneficiaryAccount.add(option);
    // }

    demo.setupEvents([
        { "evt": "click", "elmId": "idBtnGetUnsettledAmountsByCurrency", "func": function () { getUnsettledAmountsByCurrency("Currencies") }, "funcsToDisplay": [getUnsettledAmountsByCurrency], "functionToRun": getUnsettledAmountsByCurrency },
        { "evt": "click", "elmId": "idBtnGetUnsettledAmountsByAmountType", "func": function () { getUnsettledAmountsByCurrency("AmountTypes") }, "funcsToDisplay": [getUnsettledAmountsByCurrency], "functionToRun": getUnsettledAmountsByCurrency },
        { "evt": "click", "elmId": "idBtnGetUnsettledAmountsByInstruments", "func": function () { getUnsettledAmountsByInstruments() }, "funcsToDisplay": [getUnsettledAmountsByInstruments], "functionToRun": getUnsettledAmountsByInstruments },
        { "evt": "click", "elmId": "idBtnGetUnsettledAmountsByExchange", "func": function () { getUnsettledAmountsByExchange() }, "funcsToDisplay": [getUnsettledAmountsByExchange], "functionToRun": getUnsettledAmountsByExchange },
        { "evt": "click", "elmId": "idBtnGetUnsettledAmountsForExchange", "func": function () { getUnsettledAmountsForExchange() }, "funcsToDisplay": [getUnsettledAmountsForExchange], "functionToRun": getUnsettledAmountsForExchange },
    ]);
    demo.displayVersion("hist");
}());
