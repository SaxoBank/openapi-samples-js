/*jslint this: true, browser: true, for: true, long: true */
/*global window console accountKey run processError */

let instrumentId;

/**
 * This is an example of getting all exchanges.
 * @return {void}
 */
function getExchanges() {
    // https://www.developer.saxo/openapi/referencedocs/endpoint?apiVersion=v1&serviceGroup=referencedata&service=exchanges&endpoint=getallexchanges
    const cbxExchange = document.getElementById("idCbxExchange");
    let option;
    for (let i = cbxExchange.options.length - 1; i > 0; i -= 1) {
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
                for (let j = 0; j < responseJson.Data.length; j += 1) {
                    option = document.createElement("option");
                    option.text = responseJson.Data[j].ExchangeId + " (" + responseJson.Data[j].Name + ")";
                    option.value = responseJson.Data[j].ExchangeId;
                    cbxExchange.add(option);
                }
                document.getElementById("idResponse").innerText = "Found " + responseJson.Data.length + " exchanges";
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
    // https://www.developer.saxo/openapi/referencedocs/endpoint?apiVersion=v1&serviceGroup=referencedata&service=instruments&endpoint=getsummaries
    const keywords = encodeURIComponent(document.getElementById("idInstrumentName").value);
    let url = apiUrl + "/ref/v1/instruments?AssetTypes=" + document.getElementById("idCbxAssetType").value + "&$top=5" + "&AccountKey=" + encodeURIComponent(accountKey) + "&Keywords=" + keywords;
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
                    instrumentId = responseJson.Data[0].PrimaryListing;
                }
                document.getElementById("idResponse").innerText = JSON.stringify(responseJson);
            });
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
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
                document.getElementById("idResponse").innerText = JSON.stringify(responseJson.Data[0]);
            });
        } else {
            processError(response);
        }
    }).catch(function (error) {
        console.error(error);
    });
}

(function () {
    document.getElementById("idBtnGetExchanges").addEventListener("click", function () {
        run(getExchanges);
    });
    document.getElementById("idBtnFind").addEventListener("click", function () {
        run(findInstrument);
    });
    document.getElementById("idBtnGetDetails").addEventListener("click", function () {
        run(getDetails);
    });
}());
