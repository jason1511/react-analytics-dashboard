/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useCallback, useMemo, useState } from "react";
import type { ColumnOverride } from "../lib/profiling";
import type { ChartConfig } from "../lib/charts";

export type DataRow = Record<string, string>;

export type DatasetState = {
  datasetId?: string;
  columns: string[];
  rows: DataRow[];
  fileName?: string;
  columnOverrides: Record<string, ColumnOverride>;
  setColumnOverride: (column: string, override: ColumnOverride) => void;
  resetColumnOverride: (column: string) => void;
  pinnedCharts: ChartConfig[];
  pinChart: (chart: ChartConfig) => void;
  unpinChart: (id: string) => void;
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
  const [pinnedCharts, setPinnedCharts] = useState<ChartConfig[]>([]);

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
    setPinnedCharts([]);
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

  const pinChart = useCallback((chart: ChartConfig) => {
    setPinnedCharts((current) => {
      const withoutExisting = current.filter((item) => item.id !== chart.id);
      return [...withoutExisting, chart].slice(-12);
    });
  }, []);

  const unpinChart = useCallback((id: string) => {
    setPinnedCharts((current) => current.filter((chart) => chart.id !== id));
  }, []);

  const clear = useCallback(() => {
    setDatasetId(undefined);
    setColumns([]);
    setRows([]);
    setFileName(undefined);
    setColumnOverrides({});
    setPinnedCharts([]);
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
      pinnedCharts,
      pinChart,
      unpinChart,
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
      pinnedCharts,
      pinChart,
      unpinChart,
      updateDataset,
      clear,
    ]
  );

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}
