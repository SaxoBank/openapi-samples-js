/*jslint this: true, browser: true, for: true, long: true */
/*global window console accountKey run processError */

let requestCount = 0;
let requestQueue = [];
let timer;
let instrumentIds = [];

function processDetailResponse(assetType, responseJson) {
    for (let i = 0; i < responseJson.Data.length; i += 1) {
        instrumentIds.push(responseJson.Data[i].Uic);
    }
    document.getElementById("idInstruments").value = instrumentIds.join(",");
    console.log("Found in total " + instrumentIds.length + " instruments..");
    console.log("Added " + responseJson.OptionSpace.length + " instruments type " + assetType + ", total " + instrumentIds.length + " instruments..");
}

function processContractOptionSpace(assetType, responseJson) {
    for (let i = 0; i < responseJson.OptionSpace.length; i += 1) {
        for (let j = 0; j < responseJson.OptionSpace[i].SpecificOptions.length; j += 1) {
            instrumentIds.push(responseJson.OptionSpace[i].SpecificOptions[j].Uic);
        }
    }
    document.getElementById("idInstruments").value = instrumentIds.join(",");
    console.log("Added " + responseJson.OptionSpace.length + " instruments type " + assetType + ", total " + instrumentIds.length + " instruments..");
}

function processSearchResponse(assetType, responseJson) {
    const baseUrl = apiUrl + "/ref/v1/instruments/details?AccountKey=" + encodeURIComponent(accountKey) + "&$top=1000&AssetTypes=" + assetType + "&Uics=";
    const separator = encodeURIComponent(",");
    let url = "";

    function addToQueue() {
        requestQueue.push({
            "assetType": assetType,
            "url": url,
            "callback": processDetailResponse
        });
    }

    console.log("Found " + responseJson.Data.length + " instruments on this exchange");
    // We have the Uic - collect the details
    for (let i = 0; i < responseJson.Data.length; i += 1) {
        if (assetType === "StockOption" || assetType === "StockIndexOption") {
            // We found an OptionRoot - this must be converted to Uic
            requestQueue.push({
                "assetType": assetType,
                "url": apiUrl + "/ref/v1/instruments/contractoptionspaces/" + responseJson.Data[i].Identifier + "?OptionSpaceSegment=AllDates",
                "callback": processContractOptionSpace
            });
        } else {
            url += (
                url === ""
                ? baseUrl
                : separator
            ) + responseJson.Data[i].Identifier;
            if (url.length > 2000) {
                addToQueue();
                url = "";
            }
        }
    }
    if (url !== "") {
        addToQueue();
    }
    if (responseJson.hasOwnProperty("__next")) {
        // Recursively get next bulk
        console.log("Found '__next': " + responseJson.__next);
        requestQueue.push({
            "assetType": assetType,
            "url": responseJson.__next,
            "callback": processSearchResponse
        });
    }
}

function processExchangesResponse(assetType, responseJson) {
    console.log("Found " + responseJson.Data.length + " exchanges, starting to collect instrument ids");
    for (let i = 0; i < responseJson.Data.length; i += 1) {
        requestQueue.push({
            "assetType": assetType,
            "url": apiUrl + "/ref/v1/instruments?ExchangeId=" + encodeURIComponent(responseJson.Data[i].ExchangeId) + "&AssetTypes=" + assetType + "&IncludeNonTradable=false&$top=1000&AccountKey=" + encodeURIComponent(accountKey),
            "callback": processSearchResponse
        });
    }
}

/**
 * This is an example of getting all instruments.
 * @return {void}
 */
function start() {
    requestQueue.push({
        "assetType": "ContractFutures",
        "url": apiUrl + "/ref/v1/exchanges?$top=1000",
        "callback": processExchangesResponse
    });
    requestQueue.push({
        "assetType": "Stock",
        "url": apiUrl + "/ref/v1/exchanges?$top=1000",
        "callback": processExchangesResponse
    });
    requestQueue.push({
        "assetType": "StockOption",
        "url": apiUrl + "/ref/v1/exchanges?$top=1000",
        "callback": processExchangesResponse
    });
    requestQueue.push({
        "assetType": "StockIndexOption",
        "url": apiUrl + "/ref/v1/exchanges?$top=1000",
        "callback": processExchangesResponse
    });
}

function runJobFromQueue() {
    let job;
    if (requestQueue.length > 0) {
        job = requestQueue.shift();
        document.getElementById("idResponse").innerText = "Processing job for AssetType " + job.assetType + ":\r\n" + job.url + "\r\nRequests: " + requestCount + "\r\nJobs in queue: " + requestQueue.length;
        fetch(
            job.url,
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
                    job.callback(job.assetType, responseJson);
                });
            } else {
                processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
        requestCount += 1;
    }
}

(function () {
    const refLimitPerMinute = 60;
    timer = setInterval(runJobFromQueue, (refLimitPerMinute / 60 * 1000) + 25);  // A little more, to prevent risk of 429 TooManyRequests

    document.getElementById("idBtnStart").addEventListener("click", function () {
        run(start);
    });
}());
