import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '../table';

describe('Table components', () => {
  describe('Table', () => {
    it('renders a table element', () => {
      const { container } = render(
        <Table>
          <tbody>
            <tr>
              <td>Cell</td>
            </tr>
          </tbody>
        </Table>
      );

      expect(container.querySelector('table')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <Table className="custom-table">
          <tbody>
            <tr>
              <td>Cell</td>
            </tr>
          </tbody>
        </Table>
      );

      const table = container.querySelector('table');
      expect(table).toHaveClass('custom-table');
    });

    it('has default table styles', () => {
      const { container } = render(
        <Table>
          <tbody>
            <tr>
              <td>Cell</td>
            </tr>
          </tbody>
        </Table>
      );

      const table = container.querySelector('table');
      expect(table).toHaveClass('w-full');
      expect(table).toHaveClass('caption-bottom');
      expect(table).toHaveClass('text-sm');
    });

    it('wraps table in overflow container', () => {
      const { container } = render(
        <Table>
          <tbody>
            <tr>
              <td>Cell</td>
            </tr>
          </tbody>
        </Table>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('relative');
      expect(wrapper).toHaveClass('w-full');
      expect(wrapper).toHaveClass('overflow-auto');
    });
  });

  describe('TableHeader', () => {
    it('renders a thead element', () => {
      const { container } = render(
        <table>
          <TableHeader>
            <tr>
              <th>Header</th>
            </tr>
          </TableHeader>
        </table>
      );

      expect(container.querySelector('thead')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <table>
          <TableHeader className="custom-header">
            <tr>
              <th>Header</th>
            </tr>
          </TableHeader>
        </table>
      );

      const thead = container.querySelector('thead');
      expect(thead).toHaveClass('custom-header');
    });

    it('has default header styles', () => {
      const { container } = render(
        <table>
          <TableHeader>
            <tr>
              <th>Header</th>
            </tr>
          </TableHeader>
        </table>
      );

      const thead = container.querySelector('thead');
      expect(thead).toHaveClass('[&_tr]:border-b');
    });
  });

  describe('TableBody', () => {
    it('renders a tbody element', () => {
      const { container } = render(
        <table>
          <TableBody>
            <tr>
              <td>Cell</td>
            </tr>
          </TableBody>
        </table>
      );

      expect(container.querySelector('tbody')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <table>
          <TableBody className="custom-body">
            <tr>
              <td>Cell</td>
            </tr>
          </TableBody>
        </table>
      );

      const tbody = container.querySelector('tbody');
      expect(tbody).toHaveClass('custom-body');
    });

    it('has default body styles', () => {
      const { container } = render(
        <table>
          <TableBody>
            <tr>
              <td>Cell</td>
            </tr>
          </TableBody>
        </table>
      );

      const tbody = container.querySelector('tbody');
      expect(tbody).toHaveClass('[&_tr:last-child]:border-0');
    });
  });

  describe('TableFooter', () => {
    it('renders a tfoot element', () => {
      const { container } = render(
        <table>
          <TableFooter>
            <tr>
              <td>Footer</td>
            </tr>
          </TableFooter>
        </table>
      );

      expect(container.querySelector('tfoot')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <table>
          <TableFooter className="custom-footer">
            <tr>
              <td>Footer</td>
            </tr>
          </TableFooter>
        </table>
      );

      const tfoot = container.querySelector('tfoot');
      expect(tfoot).toHaveClass('custom-footer');
    });

    it('has default footer styles', () => {
      const { container } = render(
        <table>
          <TableFooter>
            <tr>
              <td>Footer</td>
            </tr>
          </TableFooter>
        </table>
      );

      const tfoot = container.querySelector('tfoot');
      expect(tfoot).toHaveClass('border-t');
      expect(tfoot).toHaveClass('bg-muted/50');
      expect(tfoot).toHaveClass('font-medium');
    });
  });

  describe('TableRow', () => {
    it('renders a tr element', () => {
      const { container } = render(
        <table>
          <tbody>
            <TableRow>
              <td>Cell</td>
            </TableRow>
          </tbody>
        </table>
      );

      expect(container.querySelector('tr')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <table>
          <tbody>
            <TableRow className="custom-row">
              <td>Cell</td>
            </TableRow>
          </tbody>
        </table>
      );

      const tr = container.querySelector('tr');
      expect(tr).toHaveClass('custom-row');
    });

    it('has default row styles', () => {
      const { container } = render(
        <table>
          <tbody>
            <TableRow>
              <td>Cell</td>
            </TableRow>
          </tbody>
        </table>
      );

      const tr = container.querySelector('tr');
      expect(tr).toHaveClass('border-b');
      expect(tr).toHaveClass('transition-colors');
      expect(tr).toHaveClass('hover:bg-muted/50');
    });

    it('supports data-state attribute for selection', () => {
      const { container } = render(
        <table>
          <tbody>
            <TableRow data-state="selected">
              <td>Cell</td>
            </TableRow>
          </tbody>
        </table>
      );

      const tr = container.querySelector('tr');
      expect(tr).toHaveClass('data-[state=selected]:bg-muted');
    });
  });

  describe('TableHead', () => {
    it('renders a th element', () => {
      const { container } = render(
        <table>
          <thead>
            <tr>
              <TableHead>Header</TableHead>
            </tr>
          </thead>
        </table>
      );

      expect(container.querySelector('th')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <table>
          <thead>
            <tr>
              <TableHead className="custom-head">Header</TableHead>
            </tr>
          </thead>
        </table>
      );

      const th = container.querySelector('th');
      expect(th).toHaveClass('custom-head');
    });

    it('has default head styles', () => {
      const { container } = render(
        <table>
          <thead>
            <tr>
              <TableHead>Header</TableHead>
            </tr>
          </thead>
        </table>
      );

      const th = container.querySelector('th');
      expect(th).toHaveClass('h-12');
      expect(th).toHaveClass('px-4');
      expect(th).toHaveClass('text-left');
      expect(th).toHaveClass('align-middle');
      expect(th).toHaveClass('font-medium');
      expect(th).toHaveClass('text-muted-foreground');
    });

    it('renders content correctly', () => {
      render(
        <table>
          <thead>
            <tr>
              <TableHead>Column Header</TableHead>
            </tr>
          </thead>
        </table>
      );

      expect(screen.getByText('Column Header')).toBeInTheDocument();
    });
  });

  describe('TableCell', () => {
    it('renders a td element', () => {
      const { container } = render(
        <table>
          <tbody>
            <tr>
              <TableCell>Cell content</TableCell>
            </tr>
          </tbody>
        </table>
      );

      expect(container.querySelector('td')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <table>
          <tbody>
            <tr>
              <TableCell className="custom-cell">Cell</TableCell>
            </tr>
          </tbody>
        </table>
      );

      const td = container.querySelector('td');
      expect(td).toHaveClass('custom-cell');
    });

    it('has default cell styles', () => {
      const { container } = render(
        <table>
          <tbody>
            <tr>
              <TableCell>Cell</TableCell>
            </tr>
          </tbody>
        </table>
      );

      const td = container.querySelector('td');
      expect(td).toHaveClass('p-4');
      expect(td).toHaveClass('align-middle');
    });

    it('renders content correctly', () => {
      render(
        <table>
          <tbody>
            <tr>
              <TableCell>Cell content</TableCell>
            </tr>
          </tbody>
        </table>
      );

      expect(screen.getByText('Cell content')).toBeInTheDocument();
    });
  });

  describe('TableCaption', () => {
    it('renders a caption element', () => {
      const { container } = render(
        <table>
          <TableCaption>Table caption</TableCaption>
          <tbody>
            <tr>
              <td>Cell</td>
            </tr>
          </tbody>
        </table>
      );

      expect(container.querySelector('caption')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <table>
          <TableCaption className="custom-caption">Caption</TableCaption>
          <tbody>
            <tr>
              <td>Cell</td>
            </tr>
          </tbody>
        </table>
      );

      const caption = container.querySelector('caption');
      expect(caption).toHaveClass('custom-caption');
    });

    it('has default caption styles', () => {
      const { container } = render(
        <table>
          <TableCaption>Caption</TableCaption>
          <tbody>
            <tr>
              <td>Cell</td>
            </tr>
          </tbody>
        </table>
      );

      const caption = container.querySelector('caption');
      expect(caption).toHaveClass('mt-4');
      expect(caption).toHaveClass('text-muted-foreground');
      expect(caption).toHaveClass('text-sm');
    });

    it('renders caption text', () => {
      render(
        <table>
          <TableCaption>A list of users</TableCaption>
          <tbody>
            <tr>
              <td>Cell</td>
            </tr>
          </tbody>
        </table>
      );

      expect(screen.getByText('A list of users')).toBeInTheDocument();
    });
  });

  describe('complete table structure', () => {
    it('renders a complete table with all components', () => {
      render(
        <Table>
          <TableCaption>A list of items</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>1</TableCell>
              <TableCell>Item 1</TableCell>
              <TableCell>Active</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>2</TableCell>
              <TableCell>Item 2</TableCell>
              <TableCell>Inactive</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3}>Total: 2 items</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      expect(screen.getByText('A list of items')).toBeInTheDocument();
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
      expect(screen.getByText('Total: 2 items')).toBeInTheDocument();
    });

    it('renders empty table with no data message', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-center">No data available</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });
});
