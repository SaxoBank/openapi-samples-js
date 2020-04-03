const appObject = {
    "AppName": "JS Implicit Sample App",
    "AppKey": "855e09f6c7104131baed595a464baff6",
    "AuthorizationEndpoint": "https://sim.logonvalidation.net/authorize",
    "TokenEndpoint": "https://sim.logonvalidation.net/token",
    "GrantType": "Implicit",
    "OpenApiBaseUrl": "https://gateway.saxobank.com/sim/openapi/",
    "RedirectUrls": [
      "https://saxobank.github.io/openapi-samples-js/authentication/oauth2-implicit-flow/redirect.html"
    ]
  }

document.getElementById('logInBtn').onclick = startLoginFlow;


function startLoginFlow() {
    const authUrl = appObject.AuthorizationEndpoint + `?response_type=token&client_id=${appObject.AppKey}&state=123&redirect_uri=${appObject.RedirectUrls[0]}`
    
    console.log(authUrl)
}