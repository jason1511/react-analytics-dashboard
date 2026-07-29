# React Analytics Dashboard

A responsive browser-based analytics application for uploading, exploring, validating, and visualising CSV datasets.

The project was built with **React**, **TypeScript**, **Vite**, **Tailwind CSS**, **PapaParse**, and **Recharts**. It focuses on transforming raw tabular data into practical summaries, quality indicators, filters, and interactive charts without requiring a backend.

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

All dataset processing is performed client-side.

## Key Features

### CSV Upload and Parsing

- Upload CSV datasets directly from the browser
- Parse files with PapaParse
- Extract column headers and row data
- Handle parsing errors and invalid input
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
| `/upload` | Upload and parse a CSV dataset |
| `/dashboard` | View KPIs, quality metrics, aggregations, and charts |
| `/explore` | Search, filter, and inspect dataset records |

The root route redirects to `/dashboard`.

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

### Development Tooling

- Vite
- ESLint
- PostCSS
- npm

## Architecture

```text
CSV file
   |
   v
PapaParse
   |
   v
Shared dataset state
   |
   +-----------------------+
   |                       |
   v                       v
Dashboard page         Explore page
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

1. PapaParse reads and parses the file.
2. Column names and records are extracted.
3. The dataset is stored in shared React state.
4. The dashboard samples values to identify numeric columns.
5. Missing values and completeness are calculated.
6. A likely grouping column is selected.
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

Start the development server:

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

Uploaded CSV data is processed in the browser.

The current application does not require users to upload datasets to an external application server. Users should still avoid loading sensitive information on shared or untrusted devices.

## Engineering Decisions

### Client-Side Processing

The project performs parsing, filtering, aggregation, and analysis in the browser.

This keeps the architecture simple and provides immediate results without requiring a backend. It is best suited to small and moderate CSV datasets.

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
- No persistent user accounts
- No server-side dataset storage
- No collaborative dashboards
- No scheduled data refresh
- Type detection is heuristic rather than schema-driven
- Automated test coverage can be expanded

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
- Automated unit and component tests
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

## Author

**Jason Leonard**

Graduate Full Stack Developer based in Melbourne, Australia.

- GitHub: [github.com/jason1511](https://github.com/jason1511)
- LinkedIn: [linkedin.com/in/jason-leonard-197230163](https://linkedin.com/in/jason-leonard-197230163)

## Licence

This project is currently provided as a portfolio and learning project.

Unless a separate licence file is added, the source code should not be treated as licensed for redistribution or commercial reuse.
