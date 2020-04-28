/*jslint this: true, browser: true, for: true, long: true */
/*global window console accountKey run processError displayVersion apiUrl */

let instrumentId;

/**
 * This is an example of getting all exchanges.
 * @return {void}
 */
function getExchanges() {
    const cbxExchange = document.getElementById("idCbxExchange");
    let option;
    let i;
    for (i = cbxExchange.options.length - 1; i > 0; i -= 1) {
        cbxExchange.remove(i);  // Remove all, except the first
    }
    fetch(
        apiUrl + "/ref/v1/exchanges?$top=1000",
        {
            "headers": {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": "Bearer " + document.getElementById("idBearerToken").value
            },
            "method": "GET"
        }
    ).then(function (response) {
        if (response.ok) {
            response.json().then(function (responseJson) {
                let j;
                for (j = 0; j < responseJson.Data.length; j += 1) {
                    option = document.createElement("option");
                    option.text = responseJson.Data[j].ExchangeId + " (" + responseJson.Data[j].Name + ")";
                    option.value = responseJson.Data[j].ExchangeId;
                    cbxExchange.add(option);
                }
                console.log("Found " + responseJson.Data.length + " exchanges");
            });
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

/**
 * This function collects all available AssetTypes for the active account, so you don't search for something you won't find because it is not available.
 * @param {Function=} callback An optional function to run after a successfull request.
 * @return {void}
 */
function getLegalAssetTypes(callback) {
    const cbxAssetType = document.getElementById("idCbxAssetType");
    let option;
    let i;
    for (i = cbxAssetType.options.length - 1; i >= 0; i -= 1) {
        cbxAssetType.remove(i);
    }
    fetch(
        apiUrl + "/port/v1/accounts/" + encodeURIComponent(accountKey),
        {
            "headers": {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": "Bearer " + document.getElementById("idBearerToken").value
            },
            "method": "GET"
        }
    ).then(function (response) {
        if (response.ok) {
            response.json().then(function (responseJson) {
                let j;
                for (j = 0; j < responseJson.LegalAssetTypes.length; j += 1) {
                    option = document.createElement("option");
                    option.text = responseJson.LegalAssetTypes[j];
                    option.value = responseJson.LegalAssetTypes[j];
                    if (option.value === "Stock") {
                        // Make the most regular type the default one
                        option.setAttribute("selected", true);
                    }
                    cbxAssetType.add(option);
                }
                if (callback !== undefined) {
                    callback();
                }
            });
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

/**
 * This is an example of instrument search.
 * @return {void}
 */
function findInstrument() {
    const keywords = encodeURIComponent(document.getElementById("idInstrumentName").value);
    let url;
    if (document.getElementById("idCbxAssetType").value === "-") {
        getLegalAssetTypes(findInstrument);
    } else {
        url = apiUrl + "/ref/v1/instruments?AssetTypes=" + document.getElementById("idCbxAssetType").value + "&$top=5" + "&AccountKey=" + encodeURIComponent(accountKey) + "&Keywords=" + keywords;
        if (document.getElementById("idCbxExchange").value !== "-") {
            url += "&ExchangeId=" + encodeURIComponent(document.getElementById("idCbxExchange").value);
        }
        if (document.getElementById("idChkMultiLeg").checked) {
            url += "&CanParticipateInMultiLegOrder=" + true;
        }
        fetch(
            url,
            {
                "headers": {
                    "Content-Type": "application/json; charset=utf-8",
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                },
                "method": "GET"
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    if (responseJson.Data.length > 0) {
                        // Remember the first Uic for the details request
                        if (responseJson.Data[0].hasOwnProperty("PrimaryListing")) {
                            // Stocks might have a primary listing on another market
                            instrumentId = responseJson.Data[0].PrimaryListing;
                        } else {
                            // This is not called "Uic", because is can identify an OptionRoot as well
                            instrumentId = responseJson.Data[0].Identifier;
                        }
                    }
                    console.log(JSON.stringify(responseJson, null, 4));
                });
            } else {
                processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }
}

/**
 * This is an example of getting instrument details.
 * @return {void}
 */
function getDetails() {
    fetch(
        apiUrl + "/ref/v1/instruments/details?Uics=" + instrumentId + "&AssetTypes=" + document.getElementById("idCbxAssetType").value + "&AccountKey=" + encodeURIComponent(accountKey),
        {
            "headers": {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": "Bearer " + document.getElementById("idBearerToken").value
            },
            "method": "GET"
        }
    ).then(function (response) {
        if (response.ok) {
            response.json().then(function (responseJson) {
                console.log(JSON.stringify(responseJson.Data, null, 4));
            });
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

(function () {
    document.getElementById("idCbxAccount").addEventListener("change", function () {
        run(getLegalAssetTypes);
    });
    document.getElementById("idBtnGetExchanges").addEventListener("click", function () {
        run(getExchanges);
    });
    document.getElementById("idBtnFind").addEventListener("click", function () {
        run(findInstrument);
    });
    document.getElementById("idBtnGetDetails").addEventListener("click", function () {
        run(getDetails);
    });
    displayVersion("ref");
}());
