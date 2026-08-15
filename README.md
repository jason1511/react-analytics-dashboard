# React Analytics Dashboard

A responsive browser-based analytics application for uploading, exploring, validating, and visualising CSV datasets.

The project combines a **React** and **TypeScript** frontend with an **ASP.NET Core 8** API,
**PostgreSQL**, and **Entity Framework Core**. It transforms raw tabular data into practical
summaries, quality indicators, filters, and interactive charts while keeping uploaded datasets
available between sessions.

## Overview

The dashboard allows users to upload a CSV file and immediately inspect its structure and contents.

It automatically:

- Parses CSV data in the browser
- Detects columns and records
- Identifies numeric-like fields
- Calculates dataset quality metrics
- Suggests useful grouping columns
- Aggregates category counts and numeric totals
- Displays interactive charts
- Supports search and multi-column filtering
- Provides a responsive light and dark interface

Uploaded CSV files and their metadata are persisted by the API. Interactive filtering,
aggregation, and chart calculations remain client-side for fast feedback.

## Key Features

### CSV Upload and Parsing

- Upload CSV datasets through the ASP.NET Core API
- Parse files with PapaParse
- Validate CSV structure on both the client and server
- Extract column headers and row data
- Handle parsing errors and invalid input
- Reopen or delete previously uploaded datasets
- Register and sign in with a private account
- Restrict every dataset operation to its owner
- Store the active dataset in shared application state
- Navigate between upload, dashboard, and exploration views

### Automatic Dataset Analysis

The dashboard inspects uploaded data and calculates:

- Total row count
- Total column count
- Number of detected numeric columns
- Distinct grouped values
- Missing cell count
- Overall dataset completeness
- Per-column distinct-value counts
- Per-column missing-value counts
- Basic numeric or categorical type classification

Numeric detection samples dataset values and classifies a column as numeric when most non-empty values can be converted safely.

### Smart Grouping

The application selects a useful default grouping column by considering:

- Number of distinct values
- Ratio of unique values to total values
- Whether the column resembles an ID
- Whether the column resembles a date or timestamp
- Whether the column contains a practical number of categories

Users can change the grouping column at any time.

### Aggregation and Visualisation

The dashboard can:

- Count records by category
- Sum a selected numeric field by category
- Rank the largest groups
- Display the top results in interactive bar charts
- Generate quick insights from the leading category
- Format large values for easier reading

### Dataset Exploration

The exploration view supports:

- Debounced text search
- Multi-column filter chips
- Filtering records by selected values
- Inspecting tabular data
- Reviewing uploaded datasets without reloading the page

### Data Quality Indicators

The dashboard helps users evaluate dataset quality through:

- Missing-cell totals
- Completeness percentage
- Column-level missing values
- Column-level distinct values
- Numeric and categorical classification
- Prioritised summaries of useful columns

### Responsive Interface

- Responsive sidebar and page layout
- Desktop and mobile-friendly views
- Light and dark themes
- Reusable cards, filters, charts, and layout components
- React Router navigation between application sections

## Application Routes

| Route | Purpose |
|---|---|
| `/datasets` | View, reopen, and delete persistent datasets |
| `/login` | Sign in to a dataset account |
| `/register` | Create a private dataset account |
| `/upload` | Upload and parse a CSV dataset |
| `/dashboard` | View KPIs, quality metrics, aggregations, and charts |
| `/explore` | Search, filter, and inspect dataset records |

The root route redirects to `/datasets`.

## Tech Stack

### Frontend

- React 19
- TypeScript
- React Router
- Tailwind CSS
- HTML5
- Responsive web design

### Data Processing

- PapaParse
- JavaScript `Map` and `Set`
- Client-side filtering
- Client-side aggregation
- Numeric-field detection
- Missing-value analysis

### Visualisation

- Recharts
- Reusable chart components

### Backend

- ASP.NET Core 8 Web API
- PostgreSQL
- Entity Framework Core migrations
- CsvHelper server-side validation
- Local file-storage abstraction
- Swagger and health checks

### Development Tooling

- Vite
- ESLint
- PostCSS
- npm

## Architecture

```text
React upload
   |
   v
JWT-authenticated request
   |
   v
ASP.NET Core API
   |
   v
PostgreSQL metadata + CSV storage
   |
   v
Datasets page
   |
   +-- reopen CSV --> shared dataset state
                           |
                 +---------+---------+
                 |                   |
                 v                   v
            Dashboard page       Explore page
   |                       |
   +-- KPI calculations    +-- Search
   +-- Type detection      +-- Column filters
   +-- Data quality        +-- Table inspection
   +-- Grouping
   +-- Aggregation
   +-- Recharts
```

The application separates responsibilities across:

- Page components
- Shared dataset state
- Theme state
- Layout components
- Empty states
- Filter controls
- Chart components
- Data-processing helpers

## Data Processing Flow

When a user uploads a CSV file:

1. PapaParse validates and previews the selected file in React.
2. The API authenticates the user, validates the file again, and inspects its rows and columns.
3. PostgreSQL stores owner-scoped metadata and the storage layer saves the CSV.
4. The active dataset is placed in shared React state.
5. The dashboard samples values to identify numeric columns.
6. Missing values, completeness, grouping, and aggregations are calculated.
7. Category counts and numeric sums are generated.
8. Recharts renders the results.
9. The same dataset becomes available in the exploration view.

## Example Analytics

For a dataset containing fields such as:

```text
Region,Product,Revenue,Units
North,Bike A,1200,4
South,Bike B,950,3
North,Bike C,1800,5
```

The dashboard can produce:

- Record count by region
- Revenue sum by region
- Units sum by product
- Dataset completeness
- Numeric-column detection
- Distinct-value summaries
- Searchable and filterable records

## Project Structure

A simplified view of the application:

```text
src/
├── components/
│   ├── charts/
│   ├── AppShell.tsx
│   └── EmptyState.tsx
├── pages/
│   ├── DashboardPage.tsx
│   ├── ExplorePage.tsx
│   └── UploadPage.tsx
├── state/
│   ├── use-dataset.tsx
│   └── use-theme.tsx
├── App.tsx
└── main.tsx
```

The exact structure may evolve as features are added.

## Getting Started

### Prerequisites

- Node.js
- npm
- .NET 8 SDK
- PostgreSQL 16 (or Docker)

### Installation

Clone the repository:

```bash
git clone https://github.com/jason1511/react-analytics-dashboard.git
cd react-analytics-dashboard
```

Install dependencies:

```bash
npm install
```

Copy `.env.example` values into your local environment. Set a unique database password and a
random JWT signing key of at least 32 bytes; never commit real credentials.

Start PostgreSQL, then the API:

```bash
POSTGRES_PASSWORD=your-local-password docker compose up -d
export ConnectionStrings__AnalyticsDatabase='Host=localhost;Port=5432;Database=analytics_dashboard;Username=analytics;Password=your-local-password'
export Jwt__SigningKey='replace-with-a-long-random-development-key'
dotnet run --project server/AnalyticsDashboard.Api
```

Start the frontend in a second terminal:

```bash
npm run dev
```

Open the local address displayed by Vite.

## Available Scripts

```bash
npm run dev
```

Starts the Vite development server.

```bash
npm run build
```

Runs the TypeScript build and creates a production bundle.

```bash
npm run lint
```

Runs ESLint across the project.

```bash
npm run preview
```

Previews the production build locally.

## Building for Production

Create a production build:

```bash
npm run build
```

The generated files will be placed in the `dist` directory.

The project can be deployed to static hosting platforms such as:

- Cloudflare Pages
- Netlify
- Vercel
- GitHub Pages

## Privacy

Uploaded CSV data is stored by the configured application server and processed in the browser
when opened. Accounts use hashed passwords and short-lived signed access tokens. Dataset list,
download, rename, and delete queries all require the authenticated owner's identifier. Existing
anonymous records from older versions remain unowned and are not exposed to any account.

## Engineering Decisions

### Hybrid Processing

The server owns persistence and validates every uploaded CSV. React performs interactive
filtering, aggregation, and analysis after loading a selected dataset. This keeps the current
experience responsive while the project remains focused on small and moderate datasets.

### Sample-Based Numeric Detection

Numeric types are inferred from a sample of non-empty values rather than requiring a predefined schema.

This allows the dashboard to work with different datasets while avoiding expensive full-column analysis for every type decision.

### Memoised Calculations

React memoisation is used for derived information such as:

- Numeric columns
- Category counts
- Numeric aggregations
- Distinct groups
- Completeness metrics
- Column summaries

This avoids unnecessary recalculation when unrelated interface state changes.

### Reusable Components

Charts, KPI cards, navigation, layouts, and empty states are separated into reusable components to keep page logic manageable.

## Current Limitations

- Designed primarily for small and moderate datasets
- CSV only
- No password-reset or email-verification flow yet
- No collaborative dashboards
- No scheduled data refresh
- Type detection is heuristic rather than schema-driven
- Local file storage should be replaced with object storage for multi-instance deployment

## Planned Improvements

Potential future improvements include:

- Support for Excel and JSON files
- Additional chart types
- Date and time-series detection
- Saved dashboard configurations
- Exportable filtered datasets
- More advanced descriptive statistics
- Column renaming and data cleaning
- Larger-file processing with Web Workers
- Refresh tokens and password-reset email flows
- Object storage for production deployments
- Accessibility improvements
- Deployment preview and screenshots

## What I Learned

This project strengthened my experience in:

- React and TypeScript application design
- Client-side data transformation
- CSV parsing and validation
- Numeric and categorical type detection
- Data aggregation and grouping
- Data-quality analysis
- Reusable component development
- Interactive chart visualisation
- Shared state management
- Responsive interface design
- Performance-aware derived calculations
- Error and empty-state handling
- ASP.NET Core REST API design
- PostgreSQL persistence and Entity Framework migrations
- Multipart upload handling and secure file storage
- JWT authentication, password hashing, and ownership isolation
- Frontend and backend continuous integration

## Author

**Jason Leonard**

Graduate Full Stack Developer based in Melbourne, Australia.

- GitHub: [github.com/jason1511](https://github.com/jason1511)
- LinkedIn: [linkedin.com/in/jason-leonard-197230163](https://linkedin.com/in/jason-leonard-197230163)

## Licence

This project is currently provided as a portfolio and learning project.

Unless a separate licence file is added, the source code should not be treated as licensed for redistribution or commercial reuse.
