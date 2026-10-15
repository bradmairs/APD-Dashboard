import { autoCsv } from "../csvExport";
import ExportCsvButton from "./ExportCsvButton";

export default function AutoExportCsvButton({ filename, rows }: { filename: string; rows: object[] }) {
  const csv = autoCsv(rows);
  return <ExportCsvButton filename={filename} columns={csv.columns} rows={csv.rows} />;
}
