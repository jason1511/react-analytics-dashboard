/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useCallback, useMemo, useState } from "react";
import type { ColumnOverride } from "../lib/profiling";

export type DataRow = Record<string, string>;

export type DatasetState = {
  datasetId?: string;
  columns: string[];
  rows: DataRow[];
  fileName?: string;
  columnOverrides: Record<string, ColumnOverride>;
  setColumnOverride: (column: string, override: ColumnOverride) => void;
  resetColumnOverride: (column: string) => void;
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
  const [columnOverrides, setColumnOverrides] = useState<Record<string, ColumnOverride>>({});

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
    setColumnOverrides({});
  }, []);

  const updateColumnOverride = useCallback((column: string, override: ColumnOverride) => {
    setColumnOverrides((current) => ({
      ...current,
      [column]: { ...current[column], ...override },
    }));
  }, []);

  const resetColumnOverride = useCallback((column: string) => {
    setColumnOverrides((current) => {
      const next = { ...current };
      delete next[column];
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setDatasetId(undefined);
    setColumns([]);
    setRows([]);
    setFileName(undefined);
    setColumnOverrides({});
  }, []);

  const value = useMemo<DatasetState>(
    () => ({
      datasetId,
      columns,
      rows,
      fileName,
      columnOverrides,
      setColumnOverride: updateColumnOverride,
      resetColumnOverride,
      setDataset: updateDataset,
      clear,
    }),
    [
      datasetId,
      columns,
      rows,
      fileName,
      columnOverrides,
      updateColumnOverride,
      resetColumnOverride,
      updateDataset,
      clear,
    ]
  );

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}
