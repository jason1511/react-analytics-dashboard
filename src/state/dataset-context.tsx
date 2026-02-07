/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useMemo, useState } from "react";

export type DataRow = Record<string, string>;

export type DatasetState = {
  columns: string[];
  rows: DataRow[];
  fileName?: string;
  setDataset: (args: { columns: string[]; rows: DataRow[]; fileName?: string }) => void;
  clear: () => void;
};

export const DatasetContext = createContext<DatasetState | null>(null);

export function DatasetProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<DataRow[]>([]);
  const [fileName, setFileName] = useState<string | undefined>(undefined);

  const value = useMemo<DatasetState>(
    () => ({
      columns,
      rows,
      fileName,
      setDataset: ({ columns, rows, fileName }) => {
        setColumns(columns);
        setRows(rows);
        setFileName(fileName);
      },
      clear: () => {
        setColumns([]);
        setRows([]);
        setFileName(undefined);
      },
    }),
    [columns, rows, fileName]
  );

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}
