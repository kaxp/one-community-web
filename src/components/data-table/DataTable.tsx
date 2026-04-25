import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table';
import { cn } from '@/lib/cn';

interface Props<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getRowId?: (row: TData) => string;
  onRowClick?: (row: TData) => void;
  emptyState?: React.ReactNode;
  className?: string;
}

// Generic TanStack Table v8 wrapper. Sort / filter / pagination handled by
// callers (or extended here per-feature). Keeps the shadcn aesthetic and uses
// `flexRender` so column.cell renderers can return any ReactNode.
export function DataTable<TData, TValue>({
  columns,
  data,
  getRowId,
  onRowClick,
  emptyState,
  className,
}: Props<TData, TValue>) {
  const tableOptions: Parameters<typeof useReactTable<TData>>[0] = {
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  };
  if (getRowId) tableOptions.getRowId = (row) => getRowId(row);
  const table = useReactTable(tableOptions);

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div
      className={cn(
        'w-full overflow-x-auto rounded-lg border border-border bg-surface shadow-sm',
        className,
      )}
    >
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-surface-muted">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted"
                  scope="col"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row: Row<TData>) => (
            <tr
              key={row.id}
              className={cn(
                'border-b border-border last:border-b-0 hover:bg-surface-muted/50',
                onRowClick && 'cursor-pointer',
              )}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 align-top text-ink-body">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
