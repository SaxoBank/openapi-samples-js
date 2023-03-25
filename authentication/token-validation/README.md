# Sample for validating the token

OIDC tokens contain hashes, which can be used to validate the token, the code and the state.
Validating them mitigates the Authorization response parameter injection attack.
<https://openid.net/specs/openid-financial-api-part-2-1_0.html#authorization-response-parameter-injection-attack>

This sample shows how to do this using PHP.

## Code hash value (claim c_hash)
Its value is the base64url encoding of the left-most half of the hash of the octets of the ASCII representation of the code value, where the hash algorithm used is the hash algorithm used in the alg Header Parameter of the ID Token's JOSE Header.
For instance, if the alg is HS512, hash the code value with SHA-512, then take the left-most 256 bits and base64url encode them.
The c_hash value is a case sensitive string.
If the ID Token is issued from the Authorization Endpoint with a code, which is the case for the response_type values code id_token and code id_token token, this is REQUIRED; otherwise, its inclusion is OPTIONAL.

Source: <https://openid.net/specs/openid-connect-core-1_0.html#CodeValidation>

## State hash value (claim s_hash)
Its value is the base64url encoding of the left-most half of the hash of the octets of the ASCII representation of the state value, where the hash algorithm used is the hash algorithm used in the alg header parameter of the ID Token's JOSE header.
For instance, if the alg is HS512, hash the state value with SHA-512, then take the left-most 256 bits and base64url encode them.
The s_hash value is a case sensitive string.

Source: <https://openid.net/specs/openid-financial-api-part-2-1_0.html#id-token-as-detached-signature>

## Access Token hash value (claim at_hash)
Its value is the base64url encoding of the left-most half of the hash of the octets of the ASCII representation of the access_token value, where the hash algorithm used is the hash algorithm used in the alg Header Parameter of the ID Token's JOSE Header.
For instance, if the alg is RS256, hash the access_token value with SHA-256, then take the left-most 128 bits and base64url encode them.
The at_hash value is a case sensitive string.
If the ID Token is issued from the Authorization Endpoint with an access_token value, which is the case for the response_type value code id_token token, this is REQUIRED; otherwise, its inclusion is OPTIONAL.

Source: <https://openid.net/specs/openid-connect-core-1_0.html#CodeIDToken>
