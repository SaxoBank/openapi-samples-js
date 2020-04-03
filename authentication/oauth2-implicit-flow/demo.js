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

// localStorage.removeItem("access_token")
localStorage.removeItem("expires_in")
localStorage.removeItem("state")

document.getElementById('logInBtn').onclick = startLoginFlow


async function startLoginFlow() {
    const authUrl = appObject.AuthorizationEndpoint + `?response_type=token&client_id=${appObject.AppKey}&state=123&redirect_uri=${appObject.RedirectUrls[0]}`
    const loginwindow = window.open(authUrl)
    
    await waitForLogin()

    loginwindow.close()
    getUserData()
}


async function waitForLogin() {
    let token
    while(!token) {
      token = localStorage.getItem("access_token")
      await sleep(50)
    }
    return token
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getUserData() {
    const token = localStorage.getItem("access_token")
    const response = await fetch(
        "https://gateway.saxobank.com/sim/openapi/port/v1/users/me",
        {
            "headers": {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": "Bearer " + token
            },
            "method": "GET"
        }
    ).then(response => response.json())
    
    console.log(response)

}