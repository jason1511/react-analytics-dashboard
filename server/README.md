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
dotnet run --project server/AnalyticsDashboard.Api
```

In PowerShell, use `$env:POSTGRES_PASSWORD` and
`$env:ConnectionStrings__AnalyticsDatabase` instead. Keep real credentials in environment
variables or a local untracked `.env` file; do not commit them.

The API applies pending migrations on startup. In development, Swagger is available at
`http://localhost:5000/swagger` or the HTTPS address printed by `dotnet run`.

## Initial endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Application health check |
| `GET` | `/api/datasets` | List dataset records with pagination |
| `GET` | `/api/datasets/{id}` | Get one dataset record |
| `POST` | `/api/datasets` | Create dataset metadata |
| `PATCH` | `/api/datasets/{id}/name` | Rename a dataset |
| `DELETE` | `/api/datasets/{id}` | Delete a dataset record |

This first backend slice stores dataset metadata. CSV file storage, parsing jobs, and frontend
integration are the next milestones.
