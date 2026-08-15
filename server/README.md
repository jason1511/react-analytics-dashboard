# Analytics Dashboard API

The backend is an ASP.NET Core 8 Web API backed by PostgreSQL and Entity Framework Core.

## Local setup

Start PostgreSQL from the repository root:

```bash
export POSTGRES_PASSWORD="choose-a-local-development-password"
docker compose up -d postgres
```

Start the API:

```bash
export ConnectionStrings__AnalyticsDatabase="Host=localhost;Port=5432;Database=analytics_dashboard;Username=analytics;Password=$POSTGRES_PASSWORD"
export Jwt__SigningKey="replace-with-a-long-random-development-key"
dotnet run --project server/AnalyticsDashboard.Api
```

In PowerShell, use `$env:POSTGRES_PASSWORD` and
`$env:ConnectionStrings__AnalyticsDatabase` instead. Keep real credentials in environment
variables or a local untracked `.env` file; do not commit them. The JWT signing key must contain
at least 32 bytes and should be unique in every deployed environment.

The API applies pending migrations on startup. In development, Swagger is available at
`http://localhost:5000/swagger` or the HTTPS address printed by `dotnet run`.

## Initial endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Application health check |
| `POST` | `/api/auth/register` | Create an account and receive an access token |
| `POST` | `/api/auth/login` | Sign in and receive an access token |
| `GET` | `/api/auth/me` | Restore the authenticated user |
| `GET` | `/api/datasets` | List dataset records with pagination |
| `GET` | `/api/datasets/{id}` | Get one dataset record |
| `POST` | `/api/datasets` | Create dataset metadata |
| `POST` | `/api/datasets/upload` | Validate, inspect, and store a CSV dataset |
| `GET` | `/api/datasets/{id}/content` | Reopen the stored CSV |
| `PATCH` | `/api/datasets/{id}/name` | Rename a dataset |
| `DELETE` | `/api/datasets/{id}` | Delete dataset metadata and its stored CSV |

Uploaded files are limited to 10 MB, assigned generated storage keys, and kept outside the web
root. Every dataset endpoint requires a bearer token and scopes queries to the authenticated
owner. The React application uses `VITE_API_URL` to upload files and reopen them after refresh.
