Within SaxoTraderGo on SIM (use Chrome / language en) this certificate has been downloaded, with the message:

The certificate with serial number 6B000007CA3413AA65FEA7F1230002000007CA has been created and saved on your computer.

The certificate is valid until: 08-May-2022

The certificate password is GdhqABCD

This password is required when generating the PKCS private key, using the command:

```cmd
  openssl pkcs12 -in 6B000007CA3413AA65FEA7F1230002000007CA.p12 -out private-key-with-cert.pem -clcerts -nodes
```

This file will be the input for the NodeJs example, together with the userId generating this certificate, the appKey and appSecret.

Setup and run:
1. Download the dependencies with the command 'npm install', from within this folder.
2. Change the 5 constants in the example.js, so your app and secrets are used.
3. Run the sample with 'node example.js'.
