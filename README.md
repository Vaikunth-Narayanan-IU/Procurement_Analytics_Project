# Supplier Risk Cockpit

A Next.js 14 procurement KPI dashboard that ingests CSV data, maps columns to a canonical schema, and computes deterministic supplier risk scores.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Sample data (default experience)

Place the sample CSV at:

```
public/sample/procurement.csv
```

The app ships with a sample file copied from `Procurement KPI Analysis Dataset.csv` for convenience.
On first load, the dashboard automatically loads `/sample/procurement.csv`, auto-maps columns, and
renders KPIs without requiring any upload.

To replace the default dataset, overwrite `public/sample/procurement.csv` with a CSV that uses the
expected procurement fields. Refresh the browser to load the new sample data.

## Column mapping

CSV headers can vary. The **Column Mapper** only appears when you upload a CSV and auto-mapping
confidence is low. Mappings are saved to `localStorage` and keyed by filename + header hash so the
next upload can be mapped automatically.

**Required fields**
- PO ID
- Supplier

**Optional fields**
- PO date, promised/actual delivery dates, delivery status
- Defects, compliance gaps, partial orders
- Qty ordered/received, unit price, total cost
- Category, region

## Disclaimer

Do not upload confidential or sensitive data to public deployments. The app processes data in the
browser and stores mappings locally. Sample data is sourced from a public Kaggle dataset and is
intended for demo purposes only.
