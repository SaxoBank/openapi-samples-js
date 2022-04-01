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

    /**
     * Get the transactions for a specific client  or account
     * @return {void}
     */
    function getTransactions(start_date, end_date, entity_key, transaction_type, transaction_event) {
        let parameters = "?"

        if(entity_key == "AccountKey"){
            parameters += "AccountKey=" + encodeURIComponent(demo.user.accountKey)
        }else{
            parameters += "Client=" + encodeURIComponent(demo.user.clientKey)
        }

        parameters += encodeURIComponent(demo.user.accountKey) +"&StartDate="+encodeURIComponent(start_date)+"&EndDate="+encodeURIComponent(end_date)

        if(transaction_type){
            parameters += "&Type="+encodeURIComponent(transaction_type)
        }

        if(transaction_event){
            parameters += "&Event="+encodeURIComponent(transaction_event)
        }

        fetch(
            demo.apiUrl + "/hist/v1/transactions" + parameters,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {

                    //todo, figure out how I want to parse...
                    document.getElementById("idEdtCurrency").value = responseJson.Currency;
                    console.debug("Set currency to: " + responseJson.Currency);
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
        {"evt": "change", "elmId": "idCbxAccount", "func": getAccountCurrency, "funcsToDisplay": [getAccountCurrency], "isDelayedRun": true},
        {"evt": "click", "elmId": "idBtnGetBeneficiaryInstructions", "func": getBeneficiaryInstructions, "funcsToDisplay": [getBeneficiaryInstructions]},
        {"evt": "click", "elmId": "idBtnTransferMoney", "func": transferMoney, "funcsToDisplay": [transferMoney]}
    ]);
    demo.displayVersion("atr");
}());
