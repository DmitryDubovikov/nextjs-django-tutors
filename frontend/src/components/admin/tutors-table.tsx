'use client';

import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTutorsList } from '@/generated/api/tutors/tutors';
import type { Tutor } from '@/generated/schemas';

import { TablePagination } from './table-pagination';
import { TableSkeleton } from './table-skeleton';

const columns: ColumnDef<Tutor>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.id}</span>,
  },
  {
    accessorKey: 'full_name',
    header: 'Name',
    cell: ({ row }) => <span className="font-medium">{row.original.full_name}</span>,
  },
  {
    accessorKey: 'bio',
    header: 'Bio',
    cell: ({ row }) => (
      <span className="line-clamp-2 max-w-xs text-muted-foreground text-sm">
        {row.original.bio}
      </span>
    ),
  },
  {
    accessorKey: 'hourly_rate',
    header: 'Rate',
    cell: ({ row }) => `$${row.original.hourly_rate}`,
  },
  {
    accessorKey: 'is_verified',
    header: 'Verified',
    cell: ({ row }) =>
      row.original.is_verified ? (
        <Badge variant="success">Verified</Badge>
      ) : (
        <Badge variant="outline">Pending</Badge>
      ),
  },
  {
    accessorKey: 'rating',
    header: 'Rating',
    cell: ({ row }) => (
      <span>
        {row.original.rating ? `${Number.parseFloat(row.original.rating).toFixed(1)} / 5` : 'N/A'}
      </span>
    ),
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <div className="flex gap-2">
        {/* TODO: Implement edit functionality - navigate to /admin/tutors/[id]/edit */}
        <Button variant="ghost" size="sm" onClick={() => console.log('Edit', row.original.id)}>
          Edit
        </Button>
        {/* TODO: Implement delete functionality with confirmation dialog */}
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => console.log('Delete', row.original.id)}
        >
          Delete
        </Button>
      </div>
    ),
  },
];

export function TutorsTable() {
  const { data, isLoading } = useTutorsList();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data: data?.data?.results ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
  });

  if (isLoading) return <TableSkeleton columns={7} />;

  return (
    <div>
      <Input
        placeholder="Search tutors..."
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        className="mb-4 max-w-sm"
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && ' ↑'}
                      {header.column.getIsSorted() === 'desc' && ' ↓'}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No tutors found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <TablePagination table={table} />
    </div>
  );
}
