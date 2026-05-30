'use client';

import { Fragment, useState, useMemo, type ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type Row,
  type Table,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Columns3,
  Download,
  Rows3,
  Rows4,
  X,
  RefreshCw,
} from 'lucide-react';
import Papa from 'papaparse';

export type DataTableSort = { sortBy: string; sortDir: 'asc' | 'desc' };

export type DataTableProps<T extends { id: string }> = {
  data: T[];
  columns: ColumnDef<T, unknown>[];

  /** Loading state — shows skeleton rows. */
  isLoading?: boolean;
  /** Background refetch — dims existing data slightly. */
  isFetching?: boolean;
  /** Manual refresh callback. */
  onRefresh?: () => void;

  /** Server-controlled sort. When set, header arrows render. */
  sort?: DataTableSort;
  onSortChange?: (next: DataTableSort) => void;
  /** Server columns that support sorting. Headers without sort just render plain. */
  sortableColumns?: string[];

  /** Optional toolbar slot (filters form etc) rendered above the table. */
  toolbar?: ReactNode;

  /** Per-page custom action bar when rows selected. Receives ids + clearSelection. */
  enableSelection?: boolean;
  bulkActions?: (selectedIds: string[], clearSelection: () => void) => ReactNode;

  /** Pagination — page owns cursor state. */
  hasNextPage?: boolean;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  hasPrevPage?: boolean;

  /** CSV export filename + flag. Set to false to hide export button. */
  csvFilename?: string | false;

  /** Empty + error UI overrides */
  emptyMessage?: string;
  errorMessage?: string;
  hasError?: boolean;

  /** Density override — default starts compact. */
  defaultDensity?: 'compact' | 'comfortable';
};

export function DataTable<T extends { id: string }>(props: DataTableProps<T>) {
  const {
    data,
    columns,
    isLoading,
    isFetching,
    onRefresh,
    sort,
    onSortChange,
    sortableColumns = [],
    toolbar,
    enableSelection,
    bulkActions,
    hasNextPage,
    onNextPage,
    onPrevPage,
    hasPrevPage,
    csvFilename,
    emptyMessage = 'No results match these filters.',
    errorMessage = 'Failed to load. Try again.',
    hasError,
    defaultDensity = 'compact',
  } = props;

  const [density, setDensity] = useState<'compact' | 'comfortable'>(defaultDensity);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [columnsOpen, setColumnsOpen] = useState(false);

  // TanStack Table sortingState is local; we surface changes via onSortChange
  // for server-side sorting. Mirror it from props so external changes win.
  const sortingState: SortingState = sort
    ? [{ id: sort.sortBy, desc: sort.sortDir === 'desc' }]
    : [];

  // Prepend a selection column if enabled. Memoised so column refs stay stable.
  const finalColumns = useMemo<ColumnDef<T, unknown>[]>(() => {
    if (!enableSelection) return columns;
    return [
      {
        id: '__select',
        size: 36,
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllRowsSelected()
                ? true
                : table.getIsSomeRowsSelected()
                  ? 'indeterminate'
                  : false
            }
            onChange={(v) => table.toggleAllRowsSelected(v)}
            aria-label="Select all rows"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onChange={(v) => row.toggleSelected(v)}
            aria-label={`Select row ${row.id}`}
          />
        ),
        enableSorting: false,
      },
      ...columns,
    ];
  }, [columns, enableSelection]);

  const table = useReactTable({
    data,
    columns: finalColumns,
    state: {
      sorting: sortingState,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection: enableSelection,
    getRowId: (row) => row.id,
    onSortingChange: (updater) => {
      if (!onSortChange) return;
      const next = typeof updater === 'function' ? updater(sortingState) : updater;
      const first = next[0];
      if (first) {
        onSortChange({ sortBy: first.id, sortDir: first.desc ? 'desc' : 'asc' });
      }
    },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: !!onSortChange,
  });

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);
  const clearSelection = () => setRowSelection({});

  const allCols = table.getAllLeafColumns().filter((c) => c.id !== '__select');

  function exportCsv() {
    if (!csvFilename) return;
    const visibleCols = table.getVisibleLeafColumns().filter((c) => c.id !== '__select');
    const headers = visibleCols.map((c) =>
      typeof c.columnDef.header === 'string' ? c.columnDef.header : c.id,
    );
    const rows = table.getRowModel().rows.map((row) => {
      const obj: Record<string, string> = {};
      visibleCols.forEach((col, i) => {
        const v = row.getValue(col.id);
        obj[headers[i] ?? col.id] = csvSafe(v);
      });
      return obj;
    });
    const csv = Papa.unparse(rows, { columns: headers });
    triggerDownload(csv, csvFilename, 'text/csv');
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="space-y-3">
        {toolbar}

        <div className="flex flex-wrap items-center gap-2">
          {enableSelection && selectedIds.length > 0 ? (
            <div className="flex flex-1 items-center gap-3 rounded-card bg-brand px-4 py-2 text-ink-inverse shadow-card">
              <span className="text-small font-semibold">{selectedIds.length} selected</span>
              <button
                onClick={clearSelection}
                className="inline-flex items-center gap-1 text-small text-brand-100 hover:text-ink-inverse"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
              <div className="ml-auto flex items-center gap-2">
                {bulkActions?.(selectedIds, clearSelection)}
              </div>
            </div>
          ) : (
            <>
              <p className="text-small text-ink-muted">
                {isLoading ? 'Loading…' : `${data.length} result${data.length === 1 ? '' : 's'}`}
                {isFetching && !isLoading && (
                  <RefreshCw className="ml-2 inline h-3 w-3 animate-spin align-[-2px]" />
                )}
              </p>
              <div className="ml-auto flex items-center gap-1.5">
                {onRefresh && (
                  <IconButton onClick={onRefresh} title="Refresh">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </IconButton>
                )}
                {/* Density + column controls only affect the desktop table —
                    hide them on the mobile card view to keep the bar clean. */}
                <div className="hidden items-center gap-1.5 lg:flex">
                  <DensityToggle density={density} onChange={setDensity} />
                  <ColumnsMenu
                    open={columnsOpen}
                    onOpenChange={setColumnsOpen}
                    table={table}
                    allCols={allCols}
                  />
                </div>
                {csvFilename && data.length > 0 && (
                  <button
                    onClick={exportCsv}
                    className="inline-flex items-center gap-1.5 rounded-card border border-border bg-surface px-2.5 py-1.5 text-small font-medium text-ink hover:bg-surface-muted"
                    title="Export visible rows as CSV"
                  >
                    <Download className="h-3.5 w-3.5" />
                    CSV
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile card list (< lg). Driven by the same column defs so every
          table page gets a phone-friendly layout for free. Hidden on desktop. */}
      <div className="lg:hidden">
        {isLoading ? (
          <CardSkeletons rows={6} />
        ) : hasError ? (
          <div className="card p-8 text-center text-body text-danger">{errorMessage}</div>
        ) : data.length === 0 ? (
          <div className="card p-8 text-center text-body text-ink-subtle">{emptyMessage}</div>
        ) : (
          <div className={'space-y-3 ' + (isFetching ? 'opacity-70' : '')}>
            {table.getRowModel().rows.map((row) => (
              <MobileCard key={row.id} row={row} enableSelection={enableSelection} />
            ))}
          </div>
        )}
        {(hasPrevPage || hasNextPage) && (
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={onPrevPage}
              disabled={!hasPrevPage}
              className="rounded-card border border-border bg-surface px-3 py-2 text-small font-medium text-ink disabled:opacity-40 hover:bg-surface-muted"
            >
              ← Prev
            </button>
            <span className="text-small text-ink-muted">{data.length} on this page</span>
            <button
              onClick={onNextPage}
              disabled={!hasNextPage}
              className="rounded-card border border-border bg-surface px-3 py-2 text-small font-medium text-ink disabled:opacity-40 hover:bg-surface-muted"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Table (lg+). Horizontal scroll is a desktop-only fallback for wide
          tables; phones get the card list above instead. */}
      <div className="card hidden overflow-hidden lg:block">
        <div className="overflow-x-auto">
          <table className={'w-full ' + (isFetching && !isLoading ? 'opacity-70' : '')}>
            <thead className="border-b border-border bg-surface-muted/40">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => {
                    const colId = header.column.id;
                    const sortable = sortableColumns.includes(colId);
                    const currentSort = sort?.sortBy === colId ? sort.sortDir : null;
                    return (
                      <th
                        key={header.id}
                        className={
                          'px-3 py-2.5 text-left text-caption font-semibold uppercase tracking-wider text-ink-muted ' +
                          (colId === '__select' ? 'w-9' : '')
                        }
                        style={
                          header.column.columnDef.size
                            ? { width: header.column.columnDef.size }
                            : undefined
                        }
                      >
                        {header.isPlaceholder ? null : sortable && onSortChange ? (
                          <button
                            onClick={() =>
                              onSortChange({
                                sortBy: colId,
                                sortDir: currentSort === 'asc' ? 'desc' : 'asc',
                              })
                            }
                            className="group inline-flex items-center gap-1 hover:text-ink"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <SortIcon dir={currentSort} />
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            <tbody>
              {isLoading ? (
                <SkeletonRows cols={finalColumns.length} rows={8} density={density} />
              ) : hasError ? (
                <FullRow cols={finalColumns.length}>
                  <p className="py-12 text-center text-body text-danger">{errorMessage}</p>
                </FullRow>
              ) : data.length === 0 ? (
                <FullRow cols={finalColumns.length}>
                  <p className="py-12 text-center text-body text-ink-subtle">{emptyMessage}</p>
                </FullRow>
              ) : (
                table
                  .getRowModel()
                  .rows.map((row) => <RowView key={row.id} row={row} density={density} />)
              )}
            </tbody>
          </table>
        </div>

        {/* Footer pagination */}
        {(hasPrevPage || hasNextPage) && (
          <div className="flex items-center justify-between border-t border-border bg-surface-muted/30 px-4 py-2.5">
            <p className="text-small text-ink-muted">Showing {data.length} on this page</p>
            <div className="flex items-center gap-2">
              <button
                onClick={onPrevPage}
                disabled={!hasPrevPage}
                className="rounded-card border border-border bg-surface px-3 py-1.5 text-small font-medium text-ink disabled:opacity-40 hover:bg-surface-muted"
              >
                ← Prev
              </button>
              <button
                onClick={onNextPage}
                disabled={!hasNextPage}
                className="rounded-card border border-border bg-surface px-3 py-1.5 text-small font-medium text-ink disabled:opacity-40 hover:bg-surface-muted"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Row view ─────────────────────────────────────────────────────────

function RowView<T>({ row, density }: { row: Row<T>; density: 'compact' | 'comfortable' }) {
  const pad = density === 'compact' ? 'py-2' : 'py-3.5';
  return (
    <tr
      className={
        'border-b border-border/60 transition hover:bg-surface-muted/50 ' +
        (row.getIsSelected() ? 'bg-accent/5' : '')
      }
    >
      {row.getVisibleCells().map((cell) => (
        <td key={cell.id} className={`px-3 ${pad} align-middle text-small text-ink`}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
}

// ─── Mobile card view ─────────────────────────────────────────────────

function MobileCard<T>({ row, enableSelection }: { row: Row<T>; enableSelection?: boolean }) {
  // Skip the synthetic selection column — its checkbox is surfaced separately
  // in the card header so the layout stays clean.
  const cells = row.getVisibleCells().filter((c) => c.column.id !== '__select');
  const [first, ...rest] = cells;

  return (
    <div className={'card p-4 transition ' + (row.getIsSelected() ? 'ring-2 ring-accent/50' : '')}>
      <div className="mb-3 flex items-center gap-3 border-b border-border/60 pb-3">
        {enableSelection && (
          <Checkbox
            checked={row.getIsSelected()}
            onChange={(v) => row.toggleSelected(v)}
            aria-label="Select row"
          />
        )}
        {first && (
          <div className="min-w-0 flex-1 text-body font-semibold text-ink">
            {flexRender(first.column.columnDef.cell, first.getContext())}
          </div>
        )}
      </div>
      <dl className="space-y-2">
        {rest.map((cell) => {
          const header = cell.column.columnDef.header;
          const label = typeof header === 'string' ? header : cell.column.id;
          return (
            <div key={cell.id} className="flex items-start justify-between gap-3">
              <dt className="text-caption font-semibold uppercase tracking-wider text-ink-subtle">
                {label}
              </dt>
              <dd className="min-w-0 text-right text-small text-ink">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

function CardSkeletons({ rows }: { rows: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card space-y-3 p-4">
          <div className="h-5 w-2/3 animate-pulse rounded bg-surface-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-surface-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-surface-muted" />
        </div>
      ))}
    </div>
  );
}

function SkeletonRows({
  cols,
  rows,
  density,
}: {
  cols: number;
  rows: number;
  density: 'compact' | 'comfortable';
}) {
  const pad = density === 'compact' ? 'py-2' : 'py-3.5';
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-border/60">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className={`px-3 ${pad}`}>
              <div className="h-4 animate-pulse rounded bg-surface-muted" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function FullRow({ cols, children }: { cols: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={cols} className="bg-surface text-center">
        {children}
      </td>
    </tr>
  );
}

// ─── Toolbar bits ─────────────────────────────────────────────────────

function SortIcon({ dir }: { dir: 'asc' | 'desc' | null }) {
  if (dir === 'asc') return <ChevronUp className="h-3.5 w-3.5 text-ink" />;
  if (dir === 'desc') return <ChevronDown className="h-3.5 w-3.5 text-ink" />;
  return <ArrowUpDown className="h-3.5 w-3.5 text-ink-subtle opacity-60 group-hover:opacity-100" />;
}

function DensityToggle({
  density,
  onChange,
}: {
  density: 'compact' | 'comfortable';
  onChange: (d: 'compact' | 'comfortable') => void;
}) {
  return (
    <button
      onClick={() => onChange(density === 'compact' ? 'comfortable' : 'compact')}
      className="inline-flex items-center gap-1.5 rounded-card border border-border bg-surface px-2.5 py-1.5 text-small font-medium text-ink hover:bg-surface-muted"
      title={density === 'compact' ? 'Comfortable density' : 'Compact density'}
    >
      {density === 'compact' ? (
        <Rows4 className="h-3.5 w-3.5" />
      ) : (
        <Rows3 className="h-3.5 w-3.5" />
      )}
      {density === 'compact' ? 'Compact' : 'Comfortable'}
    </button>
  );
}

function ColumnsMenu<T>({
  open,
  onOpenChange,
  table,
  allCols,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  table: Table<T>;
  allCols: ReturnType<Table<T>['getAllLeafColumns']>;
}) {
  return (
    <div className="relative">
      <button
        onClick={() => onOpenChange(!open)}
        className="inline-flex items-center gap-1.5 rounded-card border border-border bg-surface px-2.5 py-1.5 text-small font-medium text-ink hover:bg-surface-muted"
      >
        <Columns3 className="h-3.5 w-3.5" />
        Columns
      </button>
      {open && (
        <Fragment>
          <button
            aria-hidden
            tabIndex={-1}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-10 cursor-default bg-transparent"
          />
          <div className="absolute right-0 top-full z-20 mt-1.5 w-56 rounded-card border border-border bg-surface p-2 shadow-card">
            <p className="px-2 py-1 text-caption font-semibold uppercase tracking-wider text-ink-subtle">
              Visible columns
            </p>
            <ul className="max-h-72 space-y-0.5 overflow-y-auto">
              {allCols.map((col) => (
                <li key={col.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-small text-ink hover:bg-surface-muted">
                    <Checkbox
                      checked={col.getIsVisible()}
                      onChange={(v) => col.toggleVisibility(v)}
                    />
                    {typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-end border-t border-border pt-2">
              <button
                onClick={() => table.resetColumnVisibility()}
                className="text-caption font-semibold text-brand hover:text-brand-700"
              >
                Reset
              </button>
            </div>
          </div>
        </Fragment>
      )}
    </div>
  );
}

function IconButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="inline-flex h-8 w-8 items-center justify-center rounded-card border border-border bg-surface text-ink hover:bg-surface-muted"
    >
      {children}
    </button>
  );
}

export function Checkbox({
  checked,
  onChange,
  ...rest
}: {
  checked: boolean | 'indeterminate';
  onChange: (next: boolean) => void;
} & React.AriaAttributes) {
  return (
    <input
      type="checkbox"
      checked={checked === true}
      ref={(el) => {
        if (el) el.indeterminate = checked === 'indeterminate';
      }}
      onChange={(e) => onChange(e.target.checked)}
      className="h-[15px] w-[15px] cursor-pointer rounded border-border accent-brand"
      {...rest}
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

function csvSafe(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v instanceof Date) return v.toISOString();
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime + ';charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
