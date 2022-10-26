# Sample for authentication using Certificate Based Authentication using NodeJs

Within [SaxoTraderGo on SIM](https://www.saxotrader.com/sim/account/) (or [Live](https://www.saxotrader.com/account/)) (use Chrome and English language) the certificate can be downloaded, which can be used to generate a JWT to get server2server access.

This is the message you see after generation:
> The certificate with serial number 6B000007CA3413AA65FEA7F1230002000007CA has been created and saved on your computer.\
> The certificate is valid until: 08-May-2022\
> The certificate password is GdhqABCD

The password is required when generating the PKCS private key, using the command:

```cmd
  openssl pkcs12 -in 6B000007CA3413AA65FEA7F1230002000007CA.p12 -out private-key-with-cert.pem -clcerts -nodes -passin pass:GdhqABCD
```

This PEM file will be the input for the NodeJs example, together with the userId generating this certificate, the appKey and appSecret.

Setup and run:
1. Download the dependencies with the command ``` npm install ```, from within this folder.
2. Change the 5 constants in the example.js, so your app and secrets are used.
3. Run the sample with ``` node example.js ```.

This example reads the certificate from a file, but better is to install the certificate on the host itself. There is a [C# example](https://github.com/SaxoBank/openapi-samples-csharp/tree/master/authentication/Authentication_Cba) on that.

> **_NOTE:_** The CBA flow is not available for most apps. You need to contact SaxoBank to apply for approval.
