/*jslint this: true, browser: true, for: true, long: true */
/*global window console run processError processNetworkError */

/**
 * If login failed, the error can be found as a query parameter.
 * @return {void}
 */
function generateLink() {
    let url = "https://sim.logonvalidation.net/authorize" +
        "?client_id=" + document.getElementById("idEdtAppKey").value +
        "&response_type=code" +
        "&redirect_uri=" + encodeURIComponent(document.getElementById("idEdtRedirectUrl").value);
    if (document.getElementById("idEdtState").value !== "") {
        url += "&state=" + encodeURIComponent(document.getElementById("idEdtState").value);
    }
    if (document.getElementById("idCbxCulture").value !== "-") {
        url += "&lang=" + encodeURIComponent(document.getElementById("idCbxCulture").value);
    }
    document.getElementById("idResponse").innerHTML = '<a href="' + url + '">' + url + "</a>";
}

(function () {
    document.getElementById("idBtnGenerateLink").addEventListener("click", function () {
        run(generateLink);
    });
}());
