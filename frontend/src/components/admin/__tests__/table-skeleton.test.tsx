import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TableSkeleton } from '../table-skeleton';

describe('TableSkeleton', () => {
  describe('rendering', () => {
    it('renders skeleton table with default props', () => {
      const { container } = render(<TableSkeleton />);

      expect(container.querySelector('table')).toBeInTheDocument();
    });

    it('renders search input skeleton', () => {
      const { container } = render(<TableSkeleton />);

      // Check for skeleton input before table
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('columns configuration', () => {
    it('renders default number of columns (5)', () => {
      const { container } = render(<TableSkeleton />);

      const headerCells = container.querySelectorAll('thead th');
      expect(headerCells).toHaveLength(5);
    });

    it('renders custom number of columns', () => {
      const { container } = render(<TableSkeleton columns={7} />);

      const headerCells = container.querySelectorAll('thead th');
      expect(headerCells).toHaveLength(7);
    });

    it('renders single column', () => {
      const { container } = render(<TableSkeleton columns={1} />);

      const headerCells = container.querySelectorAll('thead th');
      expect(headerCells).toHaveLength(1);
    });

    it('renders many columns', () => {
      const { container } = render(<TableSkeleton columns={10} />);

      const headerCells = container.querySelectorAll('thead th');
      expect(headerCells).toHaveLength(10);
    });
  });

  describe('rows configuration', () => {
    it('renders default number of rows (10)', () => {
      const { container } = render(<TableSkeleton />);

      const bodyRows = container.querySelectorAll('tbody tr');
      expect(bodyRows).toHaveLength(10);
    });

    it('renders custom number of rows', () => {
      const { container } = render(<TableSkeleton rows={5} />);

      const bodyRows = container.querySelectorAll('tbody tr');
      expect(bodyRows).toHaveLength(5);
    });

    it('renders single row', () => {
      const { container } = render(<TableSkeleton rows={1} />);

      const bodyRows = container.querySelectorAll('tbody tr');
      expect(bodyRows).toHaveLength(1);
    });

    it('renders many rows', () => {
      const { container } = render(<TableSkeleton rows={20} />);

      const bodyRows = container.querySelectorAll('tbody tr');
      expect(bodyRows).toHaveLength(20);
    });
  });

  describe('combined columns and rows', () => {
    it('renders correct grid with custom columns and rows', () => {
      const { container } = render(<TableSkeleton columns={3} rows={4} />);

      const headerCells = container.querySelectorAll('thead th');
      const bodyRows = container.querySelectorAll('tbody tr');

      expect(headerCells).toHaveLength(3);
      expect(bodyRows).toHaveLength(4);

      // Each body row should have 3 cells
      for (const row of bodyRows) {
        const cells = row.querySelectorAll('td');
        expect(cells).toHaveLength(3);
      }
    });

    it('renders large table correctly', () => {
      const { container } = render(<TableSkeleton columns={8} rows={15} />);

      const headerCells = container.querySelectorAll('thead th');
      const bodyRows = container.querySelectorAll('tbody tr');

      expect(headerCells).toHaveLength(8);
      expect(bodyRows).toHaveLength(15);
    });
  });

  describe('skeleton structure', () => {
    it('has skeleton in header cells', () => {
      const { container } = render(<TableSkeleton columns={3} />);

      const headerCells = container.querySelectorAll('thead th');
      for (const cell of headerCells) {
        const skeleton = cell.querySelector('[class*="animate-pulse"]');
        expect(skeleton).toBeInTheDocument();
      }
    });

    it('has skeleton in body cells', () => {
      const { container } = render(<TableSkeleton columns={3} rows={2} />);

      const bodyCells = container.querySelectorAll('tbody td');
      expect(bodyCells.length).toBe(6); // 3 columns * 2 rows

      for (const cell of bodyCells) {
        const skeleton = cell.querySelector('[class*="animate-pulse"]');
        expect(skeleton).toBeInTheDocument();
      }
    });

    it('has search input skeleton at the top', () => {
      const { container } = render(<TableSkeleton />);

      const firstSkeleton = container.querySelector('[class*="animate-pulse"]');
      expect(firstSkeleton).toBeInTheDocument();
      expect(firstSkeleton).toHaveClass('mb-4');
      expect(firstSkeleton).toHaveClass('h-10');
      expect(firstSkeleton).toHaveClass('w-64');
    });
  });

  describe('accessibility', () => {
    it('renders proper table structure', () => {
      const { container } = render(<TableSkeleton />);

      expect(container.querySelector('table')).toBeInTheDocument();
      expect(container.querySelector('thead')).toBeInTheDocument();
      expect(container.querySelector('tbody')).toBeInTheDocument();
    });

    it('uses semantic HTML elements', () => {
      const { container } = render(<TableSkeleton />);

      const thead = container.querySelector('thead');
      const tbody = container.querySelector('tbody');
      const ths = container.querySelectorAll('th');
      const tds = container.querySelectorAll('td');

      expect(thead).toBeInTheDocument();
      expect(tbody).toBeInTheDocument();
      expect(ths.length).toBeGreaterThan(0);
      expect(tds.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('handles zero columns gracefully', () => {
      const { container } = render(<TableSkeleton columns={0} />);

      const headerCells = container.querySelectorAll('thead th');
      expect(headerCells).toHaveLength(0);
    });

    it('handles zero rows gracefully', () => {
      const { container } = render(<TableSkeleton rows={0} />);

      const bodyRows = container.querySelectorAll('tbody tr');
      expect(bodyRows).toHaveLength(0);
    });

    it('handles both zero columns and rows', () => {
      const { container } = render(<TableSkeleton columns={0} rows={0} />);

      const headerCells = container.querySelectorAll('thead th');
      const bodyRows = container.querySelectorAll('tbody tr');

      expect(headerCells).toHaveLength(0);
      expect(bodyRows).toHaveLength(0);
    });
  });

  describe('visual consistency', () => {
    it('matches table component structure', () => {
      const { container } = render(<TableSkeleton />);

      // Should use Table components
      expect(container.querySelector('table')).toBeInTheDocument();
      expect(container.querySelector('thead')).toBeInTheDocument();
      expect(container.querySelector('tbody')).toBeInTheDocument();
    });

    it('has consistent skeleton sizing in headers', () => {
      const { container } = render(<TableSkeleton columns={5} />);

      const headerSkeletons = container.querySelectorAll('thead th [class*="animate-pulse"]');
      for (const skeleton of headerSkeletons) {
        expect(skeleton).toHaveClass('h-4');
        expect(skeleton).toHaveClass('w-20');
      }
    });

    it('has consistent skeleton sizing in body cells', () => {
      const { container } = render(<TableSkeleton columns={3} rows={2} />);

      const bodySkeletons = container.querySelectorAll('tbody td [class*="animate-pulse"]');
      for (const skeleton of bodySkeletons) {
        expect(skeleton).toHaveClass('h-4');
        expect(skeleton).toHaveClass('w-full');
      }
    });
  });
});
