import {
  type ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { TablePagination } from '../table-pagination';

interface TestData {
  id: number;
  name: string;
}

function TestWrapper({ data, pageSize = 10 }: { data: TestData[]; pageSize?: number }) {
  const columns: ColumnDef<TestData>[] = [
    { accessorKey: 'id', header: 'ID' },
    { accessorKey: 'name', header: 'Name' },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize,
        pageIndex: 0,
      },
    },
  });

  return <TablePagination table={table} />;
}

describe('TablePagination', () => {
  const generateData = (count: number): TestData[] =>
    Array.from({ length: count }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));

  describe('rendering', () => {
    it('renders pagination controls', () => {
      const data = generateData(30);
      render(<TestWrapper data={data} />);

      expect(screen.getByText(/rows per page/i)).toBeInTheDocument();
      expect(screen.getByText(/page \d+ of \d+/i)).toBeInTheDocument();
    });

    it('displays current page and total pages', () => {
      const data = generateData(30);
      render(<TestWrapper data={data} pageSize={10} />);

      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    });

    it('displays row count', () => {
      const data = generateData(30);
      render(<TestWrapper data={data} />);

      // Component shows "X row(s) total." when no rows are selected
      expect(screen.getByText(/30 row\(s\) total/i)).toBeInTheDocument();
    });

    it('shows all navigation buttons', () => {
      const data = generateData(30);
      render(<TestWrapper data={data} />);

      expect(screen.getByRole('button', { name: '<<' })).toBeInTheDocument(); // First page
      expect(screen.getByRole('button', { name: '<' })).toBeInTheDocument(); // Previous
      expect(screen.getByRole('button', { name: '>' })).toBeInTheDocument(); // Next
      expect(screen.getByRole('button', { name: '>>' })).toBeInTheDocument(); // Last page
    });

    it('shows page size selector', () => {
      const data = generateData(30);
      const { container } = render(<TestWrapper data={data} />);

      const select = container.querySelector('select');
      expect(select).toBeInTheDocument();
      expect(select).toHaveValue('10');
    });
  });

  describe('page size selection', () => {
    it('displays all page size options', () => {
      const data = generateData(100);
      const { container } = render(<TestWrapper data={data} />);

      const select = container.querySelector('select');
      const options = select?.querySelectorAll('option');

      expect(options).toHaveLength(5);
      expect(options?.[0]).toHaveValue('10');
      expect(options?.[1]).toHaveValue('20');
      expect(options?.[2]).toHaveValue('30');
      expect(options?.[3]).toHaveValue('40');
      expect(options?.[4]).toHaveValue('50');
    });

    it('changes page size when option is selected', async () => {
      const user = userEvent.setup();
      const data = generateData(100);
      const { container } = render(<TestWrapper data={data} />);

      const select = container.querySelector('select') as HTMLSelectElement;

      expect(screen.getByText('Page 1 of 10')).toBeInTheDocument();

      await user.selectOptions(select, '20');

      expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();
    });

    it('resets to first page when page size changes', async () => {
      const user = userEvent.setup();
      const data = generateData(100);
      const { container } = render(<TestWrapper data={data} pageSize={10} />);

      // Go to page 3
      const nextButton = screen.getByRole('button', { name: '>' });
      await user.click(nextButton);
      await user.click(nextButton);

      expect(screen.getByText('Page 3 of 10')).toBeInTheDocument();

      // Change page size
      const select = container.querySelector('select') as HTMLSelectElement;
      await user.selectOptions(select, '50');

      // Should reset to page 1
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    });
  });

  describe('navigation buttons', () => {
    it('navigates to next page', async () => {
      const user = userEvent.setup();
      const data = generateData(30);
      render(<TestWrapper data={data} pageSize={10} />);

      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: '>' }));

      expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    });

    it('navigates to previous page', async () => {
      const user = userEvent.setup();
      const data = generateData(30);
      render(<TestWrapper data={data} pageSize={10} />);

      // Go to page 2
      await user.click(screen.getByRole('button', { name: '>' }));
      expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();

      // Go back to page 1
      await user.click(screen.getByRole('button', { name: '<' }));
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    });

    it('navigates to first page', async () => {
      const user = userEvent.setup();
      const data = generateData(50);
      render(<TestWrapper data={data} pageSize={10} />);

      // Go to page 3
      const nextButton = screen.getByRole('button', { name: '>' });
      await user.click(nextButton);
      await user.click(nextButton);
      expect(screen.getByText('Page 3 of 5')).toBeInTheDocument();

      // Jump to first page
      await user.click(screen.getByRole('button', { name: '<<' }));
      expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();
    });

    it('navigates to last page', async () => {
      const user = userEvent.setup();
      const data = generateData(50);
      render(<TestWrapper data={data} pageSize={10} />);

      expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: '>>' }));
      expect(screen.getByText('Page 5 of 5')).toBeInTheDocument();
    });
  });

  describe('button disabled states', () => {
    it('disables previous buttons on first page', () => {
      const data = generateData(30);
      render(<TestWrapper data={data} pageSize={10} />);

      expect(screen.getByRole('button', { name: '<<' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '<' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '>' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: '>>' })).not.toBeDisabled();
    });

    it('disables next buttons on last page', async () => {
      const user = userEvent.setup();
      const data = generateData(30);
      render(<TestWrapper data={data} pageSize={10} />);

      // Navigate to last page
      await user.click(screen.getByRole('button', { name: '>>' }));

      expect(screen.getByRole('button', { name: '<<' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: '<' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: '>' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '>>' })).toBeDisabled();
    });

    it('enables all buttons on middle page', async () => {
      const user = userEvent.setup();
      const data = generateData(50);
      render(<TestWrapper data={data} pageSize={10} />);

      // Navigate to middle page
      await user.click(screen.getByRole('button', { name: '>' }));
      await user.click(screen.getByRole('button', { name: '>' }));

      expect(screen.getByText('Page 3 of 5')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '<<' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: '<' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: '>' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: '>>' })).not.toBeDisabled();
    });
  });

  describe('edge cases', () => {
    it('handles single page correctly', () => {
      const data = generateData(5);
      render(<TestWrapper data={data} pageSize={10} />);

      expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '<<' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '<' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '>' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '>>' })).toBeDisabled();
    });

    it('handles empty data', () => {
      const data: TestData[] = [];
      render(<TestWrapper data={data} />);

      expect(screen.getByText('Page 1 of 0')).toBeInTheDocument();
      // Component shows "0 row(s) total." when no rows exist
      expect(screen.getByText(/0 row\(s\) total/i)).toBeInTheDocument();
    });

    it('handles exact multiple of page size', () => {
      const data = generateData(30);
      render(<TestWrapper data={data} pageSize={10} />);

      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    });

    it('handles data not exactly divisible by page size', () => {
      const data = generateData(35);
      render(<TestWrapper data={data} pageSize={10} />);

      expect(screen.getByText('Page 1 of 4')).toBeInTheDocument();
    });
  });

  describe('large datasets', () => {
    it('handles large number of pages', () => {
      const data = generateData(1000);
      render(<TestWrapper data={data} pageSize={10} />);

      expect(screen.getByText('Page 1 of 100')).toBeInTheDocument();
    });

    it('navigates correctly in large dataset', async () => {
      const user = userEvent.setup();
      const data = generateData(1000);
      render(<TestWrapper data={data} pageSize={10} />);

      await user.click(screen.getByRole('button', { name: '>>' }));
      expect(screen.getByText('Page 100 of 100')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: '<<' }));
      expect(screen.getByText('Page 1 of 100')).toBeInTheDocument();
    });
  });

  describe('responsive design', () => {
    it('shows desktop spacing classes', () => {
      const data = generateData(30);
      const { container } = render(<TestWrapper data={data} />);

      const spacingDiv = container.querySelector('.lg\\:space-x-8');
      expect(spacingDiv).toBeInTheDocument();
    });

    it('maintains consistent layout', () => {
      const data = generateData(30);
      const { container } = render(<TestWrapper data={data} />);

      const mainContainer = container.querySelector('.flex.items-center.justify-between');
      expect(mainContainer).toBeInTheDocument();
    });
  });
});
