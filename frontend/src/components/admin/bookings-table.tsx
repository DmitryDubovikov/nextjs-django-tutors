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
import { toast } from '@/components/ui/toast';
import {
  useBookingsCancelCreate,
  useBookingsConfirmCreate,
  useBookingsList,
} from '@/generated/api/bookings/bookings';
import type { Booking, BookingRequest } from '@/generated/schemas';

import { TablePagination } from './table-pagination';
import { TableSkeleton } from './table-skeleton';

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline">Pending</Badge>;
    case 'confirmed':
      return <Badge variant="success">Confirmed</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">Cancelled</Badge>;
    case 'completed':
      return <Badge>Completed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function BookingsTable() {
  const { data, isLoading, refetch } = useBookingsList();
  const { mutate: confirmBooking, isPending: isConfirming } = useBookingsConfirmCreate();
  const { mutate: cancelBooking, isPending: isCancelling } = useBookingsCancelCreate();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const handleConfirm = (id: number) => {
    // TODO: Update Orval types if confirm endpoint doesn't require body
    confirmBooking(
      { id: String(id), data: {} as BookingRequest },
      {
        onSuccess: () => {
          toast({ title: 'Booking confirmed', variant: 'success' });
          refetch();
        },
        onError: () => {
          toast({ title: 'Failed to confirm booking', variant: 'error' });
        },
      }
    );
  };

  const handleCancel = (id: number) => {
    // TODO: Update Orval types if cancel endpoint doesn't require body
    cancelBooking(
      { id: String(id), data: {} as BookingRequest },
      {
        onSuccess: () => {
          toast({ title: 'Booking cancelled', variant: 'success' });
          refetch();
        },
        onError: () => {
          toast({ title: 'Failed to cancel booking', variant: 'error' });
        },
      }
    );
  };

  const columns: ColumnDef<Booking>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.id}</span>,
    },
    {
      accessorKey: 'tutor_name',
      header: 'Tutor',
      cell: ({ row }) => <span className="font-medium">{row.original.tutor_name}</span>,
    },
    {
      accessorKey: 'student_name',
      header: 'Student',
      cell: ({ row }) => <span>{row.original.student_name}</span>,
    },
    {
      accessorKey: 'scheduled_at',
      header: 'Scheduled',
      cell: ({ row }) => (
        <span className="text-sm">{formatDateTime(row.original.scheduled_at)}</span>
      ),
    },
    {
      accessorKey: 'duration_minutes',
      header: 'Duration',
      cell: ({ row }) => <span>{row.original.duration_minutes} min</span>,
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => <span className="font-medium">${row.original.price}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.original.status ?? 'pending'),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <div className="flex gap-2">
            {status === 'pending' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleConfirm(row.original.id)}
                disabled={isConfirming}
              >
                Confirm
              </Button>
            )}
            {(status === 'pending' || status === 'confirmed') && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => handleCancel(row.original.id)}
                disabled={isCancelling}
              >
                Cancel
              </Button>
            )}
          </div>
        );
      },
    },
  ];

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

  if (isLoading) return <TableSkeleton columns={8} />;

  return (
    <div>
      <Input
        placeholder="Search bookings..."
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
                  No bookings found.
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
