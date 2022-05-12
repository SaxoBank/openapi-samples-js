/*jslint this: true, browser: true, for: true, long: true, unordered: true */
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
    var AmountTypeSource = readAmountTypeSource()

    function readAmountTypeSource() {
        return document.getElementById("idCbxAmountTypeSource").selectedOptions[0].value
    }
    function readExchangeId() {
        return document.getElementById("idCbxExchangeId").selectedOptions[0].value
    }
    function setExchangeIds(response) {
        document.getElementById("idBtnGetUnsettledAmountsForExchange").disabled = false
        var select = document.getElementById("idCbxExchangeId");
        var sel_len = select.length
        for (var i = 0; i < sel_len; i++) {
            select.remove(0)
        }
        response.Exchanges.forEach(entry => {
            var opt = document.createElement("option");
            opt.value = entry.ExchangeId
            opt.text = entry.ExchangeId
            select.appendChild(opt)
        })
    }
    /**
     * Get the unsettled amounts for a specific client, by currency or amount types
     * @return {void}
     */
    function getUnsettledAmountsByCurrency(entity_key, scope) {

        let parameters = "?ClientKey=" + encodeURIComponent(demo.user.clientKey)
        AmountTypeSource = readAmountTypeSource()
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
                    console.log("/hist/v1/unsettledamounts\n" + parameters + "\n\n" + JSON.stringify(responseJson, null, 2))
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
    function getUnsettledAmountsByExchange(entity_key, scope) {

        let parameters = "?ClientKey=" + encodeURIComponent(demo.user.clientKey)
        AmountTypeSource = readAmountTypeSource()
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
                    setExchangeIds(responseJson)
                    console.log("/hist/v1/unsettledamounts/exchanges\n" + parameters + "\n" + JSON.stringify(responseJson, null, 2))
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
    function getUnsettledAmountsForExchange(entity_key, scope) {

        let parameters = "?ClientKey=" + encodeURIComponent(demo.user.clientKey)
        AmountTypeSource = readAmountTypeSource()
        if (AmountTypeSource !== "All") parameters += "&AmountTypeSource=" + AmountTypeSource
        fetch(
            demo.apiUrl + "/hist/v1/unsettledamounts/exchanges/" + readExchangeId() + parameters,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    JSON.stringify(responseJson)
                    console.log("/hist/v1/unsettledamounts/exchanges/" + readExchangeId() + "\n" + parameters + "\n" + JSON.stringify(responseJson, null, 2))
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
        { "evt": "click", "elmId": "idBtnGetUnsettledAmountsByCurrency", "func": function () { getUnsettledAmountsByCurrency("ClientKey", "AmountTypes") }, "funcsToDisplay": [getUnsettledAmountsByCurrency], "functionToRun": getUnsettledAmountsByCurrency },
        { "evt": "click", "elmId": "idBtnGetUnsettledAmountsByAmountType", "func": function () { getUnsettledAmountsByCurrency("ClientKey", "Currencies") }, "funcsToDisplay": [getUnsettledAmountsByCurrency], "functionToRun": getUnsettledAmountsByCurrency },
        { "evt": "click", "elmId": "idBtnGetUnsettledAmountsByExchange", "func": function () { getUnsettledAmountsByExchange("ClientKey") }, "funcsToDisplay": [getUnsettledAmountsByExchange], "functionToRun": getUnsettledAmountsByExchange },
        { "evt": "click", "elmId": "idBtnGetUnsettledAmountsForExchange", "func": function () { getUnsettledAmountsForExchange("ClientKey", "NYSE") }, "funcsToDisplay": [getUnsettledAmountsForExchange], "functionToRun": getUnsettledAmountsForExchange },
    ]);
    demo.displayVersion("atr");
}());
