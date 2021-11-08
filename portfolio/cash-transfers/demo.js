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

    /**
     * Get the currency of the selected account.
     * @return {void}
     */
    function getAccountCurrency() {
        fetch(
            demo.apiUrl + "/port/v1/accounts/" + encodeURIComponent(demo.user.accountKey),
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
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

    /**
     * Example of getting options for the transfer.
     * @return {void}
     */
    function getBeneficiaryInstructions() {
        fetch(
            demo.apiUrl + "/atr/v1/cashmanagement/beneficiaryinstructions?ClientKey=" + encodeURIComponent(demo.user.clientKey),
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const cbxBeneficiaryAccount = document.getElementById("idCbxBeneficiaryAccount");
                    let i;
                    let option;
                    for (i = cbxBeneficiaryAccount.options.length - 1; i >= 0; i -= 1) {
                        cbxBeneficiaryAccount.remove(i);
                    }
                    for (i = 0; i < responseJson.Data.length; i += 1) {
                        option = document.createElement("option");
                        option.text = responseJson.Data[i].BeneficiaryDetails.AccountNumber + " (" + responseJson.Data[i].Currency + ") " + responseJson.Data[i].Name;
                        option.value = responseJson.Data[i].BeneficiaryInstructionId;
                        cbxBeneficiaryAccount.add(option);
                    }
                    console.log("Result: " + JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Example of requesting a money withdrawal.
     * @return {void}
     */
    function transferMoney() {
        let result = "Description contains " + document.getElementById("idEdtDescription").value.length + " characters\n\n";
        fetch(
            demo.apiUrl + "/atr/v1/cashmanagement/withdrawals",
            {
                "method": "POST",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                    "Content-Type": "application/json; charset=utf-8"
                },
                "body": JSON.stringify({
                    "AccountKey": demo.user.accountKey,
                    "BeneficiaryInstructionId": document.getElementById("idCbxBeneficiaryAccount").value,
                    "Currency": document.getElementById("idEdtCurrency").value,
                    "Amount": document.getElementById("idEdtAmount").value,
                    "MessageToBeneficiary": document.getElementById("idEdtDescription").value
                })
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    result += "Response has code " + response.status + " " + response.statusText + ": " + JSON.stringify(responseJson, null, 4);
                    console.log(result);
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    demo.setupEvents([
        {"evt": "change", "elmId": "idCbxAccount", "func": getAccountCurrency, "funcsToDisplay": [getAccountCurrency], "isDelayedRun": true},
        {"evt": "click", "elmId": "idBtnGetBeneficiaryInstructions", "func": getBeneficiaryInstructions, "funcsToDisplay": [getBeneficiaryInstructions]},//]);
        {"evt": "click", "elmId": "idBtnTransferMoney", "func": transferMoney, "funcsToDisplay": [transferMoney]},//]);
    ]);
    demo.displayVersion("atr");
}());
