import React, { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  getSortedRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/reusable/Skeleton";

export interface TableListColumn<T> {
  header: React.ReactNode;
  accessor: keyof T | string;
  className?: string;
  render?: (item: T, rowIndex: number) => React.ReactNode;
  sortable?: boolean;
  expandedContent?: (item: T) => React.ReactNode;
  headerClassName?: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
}

interface TableListProps<T> {
  columns: TableListColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: React.ReactNode;
  selectedIds?: string[];
  onSelectRow?: (id: string) => void;
  onSelectAll?: () => void;
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
  getItemId?: (item: T) => string;
  className?: string;
  expandedRowIds?: string[];
  onToggleExpand?: (itemId: string) => void;
  editingCell?: { rowId: string; columnAccessor: string; } | null;
  onCellClick?: (item: T, columnAccessor: string) => void;
  onCellChange?: (rowId: string, columnAccessor: string, value: any) => void;
  sortState?: { field: string; order: 'asc' | 'desc' } | null;
  onSort?: (accessor: string) => void;
}

const defaultColumn = {
  minSize: 60,
  size: 120,
  maxSize: 400,
};

export function TableList<T extends object>({
  columns,
  data,
  loading = false,
  emptyMessage = "No data found.",
  selectedIds = [],
  onSelectRow,
  onSelectAll,
  isAllSelected = false,
  isIndeterminate = false,
  getItemId = (item: any) => item.id,
  className = "",
  expandedRowIds = [],
  onToggleExpand,
  editingCell,
  onCellClick,
  onCellChange,
  sortState,
  onSort,
}: TableListProps<T>) {
  // Build react-table columns
  const tableColumns = useMemo<ColumnDef<T, any>[]>(() =>
    columns.map((col, colIdx) => ({
      id: String(col.accessor),
      accessorKey: col.accessor,
      header: () => (
        <div className={`flex items-center ${col.headerClassName ?? 'justify-start'} ${col.className || ''}`.trim()}>
          {col.sortable && onSort ? (
            <button className="flex items-center gap-2" onClick={() => onSort(col.accessor as string)}>
              {col.header}
              {sortState && sortState.field === col.accessor ? (
                sortState.order === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4 text-gray-300" />
              )}
            </button>
          ) : col.accessor === 'select' && onSelectAll ? (
            <div className={`flex ${col.headerClassName ?? 'justify-start'}`}>
              <Checkbox
                checked={isAllSelected}
                indeterminate={isIndeterminate}
                onCheckedChange={onSelectAll}
                aria-label="Select all rows"
              />
            </div>
          ) : (
            col.header
          )}
        </div>
      ),
      cell: ({ row, getValue }) => {
        const item = row.original;
        const itemId = getItemId(item);
        const isEditing = editingCell?.rowId === itemId && editingCell?.columnAccessor === col.accessor;
        if (col.accessor === 'expander' && onToggleExpand) {
          return (
            <button 
              onClick={() => onToggleExpand(itemId)} 
              className="group relative w-8 h-8 rounded-full hover:bg-blue-100 transition-all duration-200 flex items-center justify-center"
              aria-label={expandedRowIds.includes(itemId) ? 'Collapse details' : 'Expand details'}
            >
              <div className={`transition-transform duration-200 ${expandedRowIds.includes(itemId) ? 'rotate-180' : ''}`}>
                <ChevronDown size={16} className="text-blue-600 group-hover:text-blue-700" />
              </div>
              <div className="absolute inset-0 rounded-full bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </button>
          );
        }
        if (col.accessor === 'select' && onSelectRow) {
          return (
            <div className="px-2 py-1 flex justify-center items-center">
              <Checkbox
                checked={selectedIds.includes(itemId)}
                onCheckedChange={() => onSelectRow(itemId)}
                aria-label={`Select row ${itemId}`}
              />
            </div>
          );
        }
        return isEditing && onCellChange ? (
          <Input
            autoFocus
            defaultValue={item[col.accessor as keyof T] as any}
            onBlur={(e) => onCellChange(itemId, col.accessor as string, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onCellChange(itemId, col.accessor as string, (e.target as HTMLInputElement).value);
              }
              if (e.key === 'Escape') {
                onCellChange(itemId, col.accessor as string, item[col.accessor as keyof T]);
              }
            }}
          />
        ) : col.render ? (
          col.render(item, row.index)
        ) : (
          getValue() as React.ReactNode
        );
      },
      size: col.width,
      minSize: col.minWidth,
      maxSize: col.maxWidth,
      enableResizing: true,
      meta: { className: col.className },
    })),
    [columns, onSort, sortState, onSelectAll, isAllSelected, isIndeterminate, onToggleExpand, expandedRowIds, onSelectRow, selectedIds, editingCell, onCellChange, getItemId]
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    defaultColumn,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {},
    columnResizeMode: "onChange",
    enableRowSelection: !!onSelectRow,
    enableMultiRowSelection: !!onSelectAll,
    enableSorting: !!onSort,
    enableExpanding: !!onToggleExpand,
    getRowId: getItemId,
    meta: {},
  });

  return (
    <div className={`table-list-container overflow-x-auto border border-blue-100 bg-white/70 shadow-md relative ${className}`}>
      {/* Fully responsive: no fixed width, table fills container. */}
      <div>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className={`bg-blue-50 text-blue-900 font-semibold text-sm border-b border-blue-100 ${(header.column.columnDef.meta as any)?.className || ''}`}
                    style={{ position: 'relative', width: header.getSize() }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className="resizer"
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          height: "100%",
                          width: "5px",
                          cursor: "col-resize",
                          userSelect: "none",
                          zIndex: 1,
                        }}
                      />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton columns={columns.length} rows={5} />
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map(row => (
                <React.Fragment key={row.id}>
                  <TableRow>
                    {row.getVisibleCells().map(cell => (
                      <TableCell
                        key={cell.id}
                        className={`text-blue-900 ${(cell.column.columnDef.meta as any)?.className || ''}`}
                        onClick={() => onCellClick && onCellClick(row.original, cell.column.id)}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {/* Expanded row rendering */}
                  {onToggleExpand && expandedRowIds.includes(getItemId(row.original)) && (() => {
                    const expanderCol = columns.find(col => col.accessor === 'expander');
                    if (expanderCol && expanderCol.expandedContent) {
                      return (
                        <TableRow key={`expanded-row-${row.id}`}>
                          {expanderCol.expandedContent(row.original)}
                        </TableRow>
                      );
                    }
                    return null;
                  })()}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-blue-400">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}