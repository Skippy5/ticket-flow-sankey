# IT Ticket Flow Sankey Analyzer

A static GitHub Pages tool for analyzing IT ticket handoffs between Service Desk and resolver teams.

## Features

- Interactive Sankey diagram powered by D3
- Three built-in sample datasets
- CSV upload for real ticket flow data
- Duplicate path aggregation
- Minimum-flow filter
- Summary metrics and routing insights
- SVG and CSV export

## CSV format

Required columns: `source,target,count`

Optional columns: `category,priority`

```csv
source,target,count,category,priority
Service Desk,Desktop Support,420,Hardware,P2
Desktop Support,Endpoint Engineering,95,Hardware,P3
```

## Deploy

This repo is designed for GitHub Pages. Serve from the `main` branch root.
