# ADR 0005: JWT Authentication Strategy

## Status
Accepted

## Context
The WEX Purchase API needs to be secured to prevent unauthorized creation and retrieval of purchase transactions. At the same time, the health check endpoints (`/health/**`) must remain public for monitoring tools, and the identity/authentication strategy should be flexible enough to accommodate future integrations with Single Sign-On (SSO) providers (e.g., Auth0, Keycloak) with minimal refactoring of business logic. Since this is an API intended for machine-to-machine (M2M) communication right now, we need a simple yet secure way to issue and validate tokens without introducing a complex user database.

## Decision
We decided to implement **Stateless JWT-based Authentication** using static M2M credentials, strictly adhering to our Hexagonal Architecture:

1. **Authentication Ports**: We defined `ITokenValidator` and `ITokenIssuer` ports in the Application layer.
2. **JWT Adapters**: We implemented `JwtTokenValidatorAdapter` and `JwtTokenIssuerAdapter` in the Infrastructure layer, wrapping `@nestjs/jwt`. This isolates the dependency on the JWT library to a single layer.
3. **Guard**: We introduced a `JwtGuard` at the Interfaces (HTTP) layer that depends *only* on the `ITokenValidator` port, not on the underlying JWT implementation.
4. **Login Endpoint**: A new `POST /auth/token` endpoint was created, which accepts a `clientId` and `clientSecret`. These are validated against static environment variables (`AUTH_CLIENT_ID` and `AUTH_CLIENT_SECRET`), eliminating the need for a database.
5. **Public Decorator**: We added a `@Public()` decorator to easily whitelist specific routes (like `/health` and `/auth/token`) from the global `JwtGuard`.

## Consequences
- **Security**: The API is now protected, and tokens are stateless, avoiding database lookups on every request.
- **Maintainability**: The `JwtGuard` and controllers are decoupled from the token generation and validation mechanisms.
- **Simplicity**: No user database or complex user management is required for this M2M scenario. Rotating credentials is as simple as updating environment variables.
- **Extensibility for SSO**: If SSO is required in the future:
  - We simply implement a new `OidcTokenValidatorAdapter` (e.g., validating against a JWKS endpoint).
  - We swap the adapter binding in the `AuthModule`.
  - The `POST /auth/token` endpoint can be removed or deprecated.
  - **Zero changes** are needed in the guard, controllers, or domain logic.

## Usage Instructions
1. **Via Swagger UI**: 
   - Open the Swagger UI (`/api`).
   - Click the **Authorize 🔓** button.
   - Enter your `AUTH_CLIENT_ID` in the `username` field and `AUTH_CLIENT_SECRET` in the `password` field.
   - Click "Authorize". Swagger will automatically fetch the JWT and apply it as a Bearer token to all subsequent requests.
2. **Via Direct HTTP Request**:
   - Make a `POST` request to `/auth/token` with the JSON payload `{ "clientId": "...", "clientSecret": "..." }`.
   - Extract the `access_token` from the response.
   - Pass the token in the `Authorization` header as `Bearer <access_token>` in your requests to the `/purchase` endpoints.
