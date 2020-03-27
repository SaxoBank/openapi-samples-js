// placing listeners at top of file for lookup

function onload() {
    document.getElementById("checkTokenButton").addEventListener("click", function () {
        checkToken();
    });
    document.getElementById("getAccountsButton").addEventListener("click", function () {
        getAccounts();
    });
    document.getElementById("accountListSelector").addEventListener("change", function () {
        updateAssetTypes(document.getElementById("accountListSelector").value)
    });
    document.getElementById("searchButton").addEventListener("click", function () {
        performSearch();
    });
    document.getElementById("tokenField").focus()  // automatically place the curson in the tokenField so you can immediately paste the token in
};

window.onload = onload();

// global variables that will be used between functions
var token = ""
var accounts = {}


function checkToken() {
    btn = document.getElementById("checkTokenButton")
    token = document.getElementById("tokenField").value
    btn.value = "Checking..."
    fetch(
        "https://gateway.saxobank.com/sim/openapi/port/v1/users/me",
        {
            "headers": {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": "Bearer " + token
            },
            "method": "GET"
        }
    ).then(function (response) {
        if (response.ok) {
            response.json().then(function (data) {
                document.getElementById("userDataBlock").innerText = `Hello, ${data.Name} \
(ID: ${data.UserId})
UserKey: ${data.UserKey}
ClientKey: ${data.ClientKey}`
            });
            btn.value = "Verified!";
            btn.disabled = true;
        } else {
            btn.value = "Try again...";
            processError(response);
        }
    })
}


function getAccounts() {
    let select = document.getElementById("accountListSelector")

    fetch(
        "https://gateway.saxobank.com/sim/openapi/port/v1/accounts/me",
        {
            "headers": {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": "Bearer " + token
            },
            "method": "GET"
        }
    ).then(function (response) {
        if (response.ok) {
            response.json().then(function (data) {
                accounts = data.Data
                select.innerHTML = ""
                data.Data.forEach(acc => {
                    let opt = document.createElement('option');
                    opt.value = acc.AccountKey;
                    opt.innerHTML = `${acc.AccountId} (${acc.Currency}) - AccountKey: ${acc.AccountKey}`;
                    select.appendChild(opt);
                });
                updateAssetTypes(document.getElementById("accountListSelector").value);
            });
            document.getElementById("getAccountsButton").disabled = true;
        } else {
            processError(response);
        }
    })
}


function updateAssetTypes(acckey) {
    let select = document.getElementById("assetTypeSelector")
    select.innerHTML = ""
    accounts.forEach(acc => {
        if (acc.AccountKey == acckey) {
            acc.LegalAssetTypes.forEach(assettype => {
                let opt = document.createElement('option');
                opt.value = assettype;
                opt.innerHTML = assettype;
                select.appendChild(opt);
            })
        }
    })
}


function performSearch() {
    let ak = document.getElementById("accountListSelector").value
    let at = document.getElementById("assetTypeSelector").value
    let kw = document.getElementById("searchField").value
    let sr = document.getElementById("searchResultBlock")

    fetch(
        `https://gateway.saxobank.com/sim/openapi/ref/v1/instruments/?$top=10&AccountKey=${ak}&AssetTypes=${at}&Keywords=${kw}`,
        {
            "headers": {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": "Bearer " + token
            },
            "method": "GET"
        }
    ).then(function (response) {
        if (response.ok) {
            response.json().then(function (data) {
                sr.innerHTML = ""
                if (data.Data.length == 0) {
                    sr.innerHTML = "No results found. Please try a different keyword..."
                }
                else {
                    sr.innerHTML = "Search results: <br/>"
                    data.Data.forEach(r => {
                        sr.innerHTML += r.Description + ", Symbol: " + r.Symbol + ", Exchange: " + r.ExchangeId + ", UIC: " + r.Identifier + "<br/>"
                    })
                }
            });
        } else {
            processError(response);
        }
    })
}


function processError(error) {
    console.error(error);
    alert("Error occurred - please check if you are using a valid token.\nMore information is available in the console.")
}