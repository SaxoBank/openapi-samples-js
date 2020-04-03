const urlParams = new URLSearchParams(window.location.hash.replace("#","?"));
const access_token = urlParams.get('access_token');
const expires_in = urlParams.get('expires_in');
const state = urlParams.get('state');

localStorage.setItem("access_token", access_token)
localStorage.setItem("expires_in", expires_in)
localStorage.setItem("state", state)