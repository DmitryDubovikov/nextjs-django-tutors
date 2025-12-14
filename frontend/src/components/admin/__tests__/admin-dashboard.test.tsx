import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminDashboard } from '../admin-dashboard';

// Mock the table components
vi.mock('../tutors-table', () => ({
  TutorsTable: () => <div data-testid="tutors-table">Tutors Table</div>,
}));

vi.mock('../bookings-table', () => ({
  BookingsTable: () => <div data-testid="bookings-table">Bookings Table</div>,
}));

describe('AdminDashboard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  function renderWithClient(component: React.ReactElement) {
    return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
  }

  describe('rendering', () => {
    it('renders tabs component', () => {
      renderWithClient(<AdminDashboard />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('renders Tutors tab', () => {
      renderWithClient(<AdminDashboard />);

      expect(screen.getByRole('tab', { name: /tutors/i })).toBeInTheDocument();
    });

    it('renders Bookings tab', () => {
      renderWithClient(<AdminDashboard />);

      expect(screen.getByRole('tab', { name: /bookings/i })).toBeInTheDocument();
    });

    it('shows Tutors table by default', () => {
      renderWithClient(<AdminDashboard />);

      expect(screen.getByTestId('tutors-table')).toBeInTheDocument();
      expect(screen.queryByTestId('bookings-table')).not.toBeInTheDocument();
    });
  });

  describe('tab switching', () => {
    it('switches to Bookings tab when clicked', async () => {
      const user = userEvent.setup();
      renderWithClient(<AdminDashboard />);

      expect(screen.getByTestId('tutors-table')).toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: /bookings/i }));

      expect(screen.queryByTestId('tutors-table')).not.toBeInTheDocument();
      expect(screen.getByTestId('bookings-table')).toBeInTheDocument();
    });

    it('switches back to Tutors tab', async () => {
      const user = userEvent.setup();
      renderWithClient(<AdminDashboard />);

      await user.click(screen.getByRole('tab', { name: /bookings/i }));
      expect(screen.getByTestId('bookings-table')).toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: /tutors/i }));
      expect(screen.getByTestId('tutors-table')).toBeInTheDocument();
      expect(screen.queryByTestId('bookings-table')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has proper tab roles', () => {
      renderWithClient(<AdminDashboard />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(2);
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    it('sets aria-selected on active tab', () => {
      renderWithClient(<AdminDashboard />);

      const tutorsTab = screen.getByRole('tab', { name: /tutors/i });
      const bookingsTab = screen.getByRole('tab', { name: /bookings/i });

      expect(tutorsTab).toHaveAttribute('aria-selected', 'true');
      expect(bookingsTab).toHaveAttribute('aria-selected', 'false');
    });

    it('updates aria-selected when switching tabs', async () => {
      const user = userEvent.setup();
      renderWithClient(<AdminDashboard />);

      await user.click(screen.getByRole('tab', { name: /bookings/i }));

      const tutorsTab = screen.getByRole('tab', { name: /tutors/i });
      const bookingsTab = screen.getByRole('tab', { name: /bookings/i });

      expect(tutorsTab).toHaveAttribute('aria-selected', 'false');
      expect(bookingsTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('default state', () => {
    it('starts with Tutors tab selected', () => {
      renderWithClient(<AdminDashboard />);

      const tutorsTab = screen.getByRole('tab', { name: /tutors/i });
      expect(tutorsTab).toHaveAttribute('aria-selected', 'true');
    });

    it('displays correct content panel', () => {
      renderWithClient(<AdminDashboard />);

      const tabpanel = screen.getByRole('tabpanel');
      expect(tabpanel).toBeInTheDocument();
      expect(screen.getByTestId('tutors-table')).toBeInTheDocument();
    });
  });

  describe('tab content', () => {
    it('renders TutorsTable in Tutors tab', () => {
      renderWithClient(<AdminDashboard />);

      expect(screen.getByTestId('tutors-table')).toBeInTheDocument();
      expect(screen.getByText('Tutors Table')).toBeInTheDocument();
    });

    it('renders BookingsTable in Bookings tab', async () => {
      const user = userEvent.setup();
      renderWithClient(<AdminDashboard />);

      await user.click(screen.getByRole('tab', { name: /bookings/i }));

      expect(screen.getByTestId('bookings-table')).toBeInTheDocument();
      expect(screen.getByText('Bookings Table')).toBeInTheDocument();
    });

    it('only renders active tab content', async () => {
      const user = userEvent.setup();
      renderWithClient(<AdminDashboard />);

      // Initially, only Tutors tab content should be rendered
      expect(screen.getByTestId('tutors-table')).toBeInTheDocument();
      expect(screen.queryByTestId('bookings-table')).not.toBeInTheDocument();

      // After switching, only Bookings tab content should be rendered
      await user.click(screen.getByRole('tab', { name: /bookings/i }));
      expect(screen.queryByTestId('tutors-table')).not.toBeInTheDocument();
      expect(screen.getByTestId('bookings-table')).toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('allows keyboard tab selection', async () => {
      renderWithClient(<AdminDashboard />);

      const tutorsTab = screen.getByRole('tab', { name: /tutors/i });

      // Focus on the Tutors tab
      tutorsTab.focus();
      expect(tutorsTab).toHaveFocus();
    });

    it('maintains focus management', async () => {
      const user = userEvent.setup();
      renderWithClient(<AdminDashboard />);

      const bookingsTab = screen.getByRole('tab', { name: /bookings/i });

      await user.click(bookingsTab);
      expect(bookingsTab).toHaveAttribute('aria-selected', 'true');
    });
  });
});
