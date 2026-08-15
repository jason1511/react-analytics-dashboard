/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useCallback, useMemo, useState } from "react";

export type DataRow = Record<string, string>;

export type DatasetState = {
  datasetId?: string;
  columns: string[];
  rows: DataRow[];
  fileName?: string;
  setDataset: (args: {
    datasetId?: string;
    columns: string[];
    rows: DataRow[];
    fileName?: string;
  }) => void;
  clear: () => void;
};

export const DatasetContext = createContext<DatasetState | null>(null);

export function DatasetProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [datasetId, setDatasetId] = useState<string | undefined>(undefined);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<DataRow[]>([]);
  const [fileName, setFileName] = useState<string | undefined>(undefined);

  const updateDataset = useCallback((args: {
    datasetId?: string;
    columns: string[];
    rows: DataRow[];
    fileName?: string;
  }) => {
    setDatasetId(args.datasetId);
    setColumns(args.columns);
    setRows(args.rows);
    setFileName(args.fileName);
  }, []);

  const clear = useCallback(() => {
    setDatasetId(undefined);
    setColumns([]);
    setRows([]);
    setFileName(undefined);
  }, []);

  const value = useMemo<DatasetState>(
    () => ({
      datasetId,
      columns,
      rows,
      fileName,
      setDataset: updateDataset,
      clear,
    }),
    [datasetId, columns, rows, fileName, updateDataset, clear]
  );

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}
