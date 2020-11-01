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
     * Example of getting the allowed AssetTypes for an account, with or without using Extended AssetTypes.
     * @return {void}
     */
    function getLegalAssetTypes() {
        const headers = {
            "Authorization": "Bearer " + document.getElementById("idBearerToken").value
        };
        if (document.getElementById("idChkExtAsset").checked) {
            headers.Pragma = "oapi-x-extasset";
        }
        fetch(
            demo.apiUrl + "/port/v1/accounts/" + encodeURIComponent(demo.user.accountKey),
            {
                "method": "GET",
                "headers": headers
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    responseJson.LegalAssetTypes.sort();
                    console.log(JSON.stringify(responseJson.LegalAssetTypes, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * Example of a search for an instrument with the name iShares, in general an ETF.
     * @return {void}
     */
    function findIshares() {
        const headers = {
            "Authorization": "Bearer " + document.getElementById("idBearerToken").value
        };
        if (document.getElementById("idChkExtAsset").checked) {
            headers.Pragma = "oapi-x-extasset";
        }
        fetch(
            demo.apiUrl + "/ref/v1/instruments?AccountKey=" + encodeURIComponent(demo.user.accountKey) + "&Keywords=ishares",
            {
                "method": "GET",
                "headers": headers
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
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
     * Example of a search for an ETF, with or without using Extended AssetTypes.
     * @return {void}
     */
    function findEtf() {
        const headers = {
            "Authorization": "Bearer " + document.getElementById("idBearerToken").value
        };
        if (document.getElementById("idChkExtAsset").checked) {
            headers.Pragma = "oapi-x-extasset";
        }
        fetch(
            demo.apiUrl + "/ref/v1/instruments?AccountKey=" + encodeURIComponent(demo.user.accountKey) + "&AssetTypes=Etf",
            {
                "method": "GET",
                "headers": headers
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
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
     * Example of getting the historical orders, with or without using Extended AssetTypes.
     * @return {void}
     */
    function getHistOrders() {
        const headers = {
            "Authorization": "Bearer " + document.getElementById("idBearerToken").value
        };
        if (document.getElementById("idChkExtAsset").checked) {
            headers.Pragma = "oapi-x-extasset";
        }
        // A better example of this request can be found here: https://saxobank.github.io/openapi-samples-js/portfolio/positions-orders/
        fetch(
            demo.apiUrl + "/cs/v1/audit/orderactivities?FromDateTime=2020-10-11T00:00:00.000Z",
            {
                "method": "GET",
                "headers": headers
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
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
        {"evt": "click", "elmId": "idBtnGetLegalAssetTypes", "func": getLegalAssetTypes, "funcsToDisplay": [getLegalAssetTypes]},
        {"evt": "click", "elmId": "idBtnSearchIshares", "func": findIshares, "funcsToDisplay": [findIshares]},
        {"evt": "click", "elmId": "idBtnFindEtf", "func": findEtf, "funcsToDisplay": [findEtf]},
        {"evt": "click", "elmId": "idBtnGetHistOrders", "func": getHistOrders, "funcsToDisplay": [getHistOrders]}
    ]);
    demo.displayVersion("ref");
}());
