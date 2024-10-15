# Sample for authentication using Certificate Based Authentication using NodeJs

Within [SaxoTraderGo on SIM](https://www.saxotrader.com/sim/account/) (or [Live](https://www.saxotrader.com/account/)) (use Chrome and English language) the certificate can be downloaded, which can be used to generate a JWT to get server2server access.

This is the message you see after generation:
> The certificate with serial number {serial number} has been created and saved on your computer.\
> The certificate is valid until: {expiry}\
> The certificate password is {password}

The password is required when generating the private key, using the command:

```cmd
path_to_downloaded="path/to/your/downloaded/file.p12"
output_file="path/to/your/output/certificate.pem"
password="your_password"

openssl pkcs12 -in "$path_to_downloaded" -out "$output_file" -clcerts -nodes -passin pass:"$password"
```

This PEM file will be the input for the NodeJs example, together with the userId generating this certificate, the appKey and appSecret.

Setup and run:
1. Download the dependencies with the command ``` npm install ```, from within this folder.
2. Create a .env file with the variables required for example.js (all the variables instantiated with process.env.)
3. Run the sample with ``` node example.js ```.

This example reads the certificate from a file, but better is to install the certificate on the host itself. There is a [C# example](https://github.com/SaxoBank/openapi-samples-csharp/tree/master/authentication/Authentication_Cba) on that.

> **_NOTE:_** The CBA flow is not available for most apps. You need to contact SaxoBank to apply for approval.
