import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
}

export function TableSkeleton({ columns = 5, rows = 10 }: TableSkeletonProps) {
  return (
    <div>
      <Skeleton className="mb-4 h-10 w-64" />
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton elements don't reorder
              <TableHead key={i}>
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton elements don't reorder
            <TableRow key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton elements don't reorder
                <TableCell key={colIndex}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
