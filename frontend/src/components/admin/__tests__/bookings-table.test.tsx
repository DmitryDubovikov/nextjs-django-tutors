import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Booking } from '@/generated/schemas';

import { BookingsTable } from '../bookings-table';

// Mock the API hooks
vi.mock('@/generated/api/admin/admin', () => ({
  useAdminBookingsList: vi.fn(),
  useAdminBookingsConfirmCreate: vi.fn(),
  useAdminBookingsCancelCreate: vi.fn(),
}));

vi.mock('@/components/ui/toast', () => ({
  toast: vi.fn(),
}));

import { toast } from '@/components/ui/toast';
import {
  useAdminBookingsCancelCreate,
  useAdminBookingsConfirmCreate,
  useAdminBookingsList,
} from '@/generated/api/admin/admin';

describe('BookingsTable', () => {
  const mockBookings: Booking[] = [
    {
      id: 1,
      tutor_name: 'John Doe',
      student_name: 'Alice Student',
      scheduled_at: '2024-12-20T10:00:00Z',
      duration_minutes: 60,
      price: '50.00',
      status: 'pending',
      notes: 'Need help with calculus',
      tutor_slug: 'john-doe',
      tutor: 1,
      student: 1,
      created_at: '2024-12-01T00:00:00Z',
      updated_at: '2024-12-01T00:00:00Z',
    },
    {
      id: 2,
      tutor_name: 'Jane Smith',
      student_name: 'Bob Student',
      scheduled_at: '2024-12-21T14:00:00Z',
      duration_minutes: 90,
      price: '67.50',
      status: 'confirmed',
      notes: undefined,
      tutor_slug: 'jane-smith',
      tutor: 2,
      student: 2,
      created_at: '2024-12-02T00:00:00Z',
      updated_at: '2024-12-02T00:00:00Z',
    },
    {
      id: 3,
      tutor_name: 'Mike Teacher',
      student_name: 'Carol Student',
      scheduled_at: '2024-12-15T09:00:00Z',
      duration_minutes: 60,
      price: '45.00',
      status: 'completed',
      notes: undefined,
      tutor_slug: 'mike-teacher',
      tutor: 3,
      student: 3,
      created_at: '2024-11-20T00:00:00Z',
      updated_at: '2024-12-15T10:00:00Z',
    },
  ];

  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();

    // Default mocks for mutation hooks
    vi.mocked(useAdminBookingsConfirmCreate).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
    vi.mocked(useAdminBookingsCancelCreate).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
  });

  function renderWithClient(component: React.ReactElement) {
    return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
  }

  describe('loading state', () => {
    it('shows skeleton when loading', () => {
      vi.mocked(useAdminBookingsList).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithClient(<BookingsTable />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });
  });

  describe('data rendering', () => {
    beforeEach(() => {
      vi.mocked(useAdminBookingsList).mockReturnValue({
        data: { data: { results: mockBookings } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useAdminBookingsConfirmCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useAdminBookingsCancelCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);
    });

    it('renders table with bookings data', () => {
      renderWithClient(<BookingsTable />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Mike Teacher')).toBeInTheDocument();
    });

    it('displays all column headers', () => {
      renderWithClient(<BookingsTable />);

      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Tutor')).toBeInTheDocument();
      expect(screen.getByText('Student')).toBeInTheDocument();
      expect(screen.getByText('Scheduled')).toBeInTheDocument();
      expect(screen.getByText('Duration')).toBeInTheDocument();
      expect(screen.getByText('Price')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('displays booking IDs', () => {
      renderWithClient(<BookingsTable />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('displays student names', () => {
      renderWithClient(<BookingsTable />);

      expect(screen.getByText('Alice Student')).toBeInTheDocument();
      expect(screen.getByText('Bob Student')).toBeInTheDocument();
      expect(screen.getByText('Carol Student')).toBeInTheDocument();
    });

    it('displays duration in minutes', () => {
      renderWithClient(<BookingsTable />);

      // Multiple bookings may have the same duration
      expect(screen.getAllByText('60 min').length).toBeGreaterThan(0);
      expect(screen.getAllByText('90 min').length).toBeGreaterThan(0);
    });

    it('displays prices formatted', () => {
      renderWithClient(<BookingsTable />);

      expect(screen.getByText('$50.00')).toBeInTheDocument();
      expect(screen.getByText('$67.50')).toBeInTheDocument();
      expect(screen.getByText('$45.00')).toBeInTheDocument();
    });

    it('displays status badges correctly', () => {
      renderWithClient(<BookingsTable />);

      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    beforeEach(() => {
      vi.mocked(useAdminBookingsList).mockReturnValue({
        data: { data: { results: mockBookings } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useAdminBookingsConfirmCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useAdminBookingsCancelCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);
    });

    it('renders search input', () => {
      renderWithClient(<BookingsTable />);

      expect(screen.getByPlaceholderText('Search bookings...')).toBeInTheDocument();
    });

    it('filters bookings by tutor name', async () => {
      const user = userEvent.setup();
      renderWithClient(<BookingsTable />);

      const searchInput = screen.getByPlaceholderText('Search bookings...');
      await user.type(searchInput, 'John');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      });
    });

    it('filters bookings by student name', async () => {
      const user = userEvent.setup();
      renderWithClient(<BookingsTable />);

      const searchInput = screen.getByPlaceholderText('Search bookings...');
      await user.type(searchInput, 'Bob');

      await waitFor(() => {
        expect(screen.getByText('Bob Student')).toBeInTheDocument();
        expect(screen.queryByText('Alice Student')).not.toBeInTheDocument();
      });
    });

    it('filters bookings by status', async () => {
      const user = userEvent.setup();
      renderWithClient(<BookingsTable />);

      const searchInput = screen.getByPlaceholderText('Search bookings...');
      await user.type(searchInput, 'completed');

      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.queryByText('Pending')).not.toBeInTheDocument();
      });
    });
  });

  describe('action buttons visibility', () => {
    beforeEach(() => {
      vi.mocked(useAdminBookingsConfirmCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useAdminBookingsCancelCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);
    });

    it('shows Confirm button for pending bookings', () => {
      vi.mocked(useAdminBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[0]] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithClient(<BookingsTable />);

      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });

    it('shows Cancel button for pending bookings', () => {
      vi.mocked(useAdminBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[0]] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithClient(<BookingsTable />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('does not show Confirm button for confirmed bookings', () => {
      vi.mocked(useAdminBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[1]] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithClient(<BookingsTable />);

      expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('does not show action buttons for completed bookings', () => {
      vi.mocked(useAdminBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[2]] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithClient(<BookingsTable />);

      expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });
  });

  describe('confirm booking', () => {
    it('calls confirm mutation when Confirm button clicked', async () => {
      const user = userEvent.setup();
      const confirmMutate = vi.fn();

      vi.mocked(useAdminBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[0]] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useAdminBookingsConfirmCreate).mockReturnValue({
        mutate: confirmMutate,
        isPending: false,
      } as any);

      vi.mocked(useAdminBookingsCancelCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderWithClient(<BookingsTable />);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(confirmMutate).toHaveBeenCalled();
    });

    it('shows success toast on confirm success', async () => {
      const user = userEvent.setup();
      const refetch = vi.fn();

      vi.mocked(useAdminBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[0]] } },
        isLoading: false,
        error: null,
        refetch,
      } as any);

      vi.mocked(useAdminBookingsConfirmCreate).mockReturnValue({
        mutate: (_: unknown, options: { onSuccess?: () => void }) => {
          options?.onSuccess?.();
        },
        isPending: false,
      } as any);

      vi.mocked(useAdminBookingsCancelCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderWithClient(<BookingsTable />);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(toast).toHaveBeenCalledWith({
        title: 'Booking confirmed',
        variant: 'success',
      });
      expect(refetch).toHaveBeenCalled();
    });

    it('shows error toast on confirm failure', async () => {
      const user = userEvent.setup();

      vi.mocked(useAdminBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[0]] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useAdminBookingsConfirmCreate).mockReturnValue({
        mutate: (_: unknown, options: { onError?: () => void }) => {
          options?.onError?.();
        },
        isPending: false,
      } as any);

      vi.mocked(useAdminBookingsCancelCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderWithClient(<BookingsTable />);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(toast).toHaveBeenCalledWith({
        title: 'Failed to confirm booking',
        variant: 'error',
      });
    });

    it('disables Confirm button when confirming', () => {
      vi.mocked(useAdminBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[0]] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useAdminBookingsConfirmCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
      } as any);

      vi.mocked(useAdminBookingsCancelCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderWithClient(<BookingsTable />);

      expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled();
    });
  });

  describe('cancel booking', () => {
    it('calls cancel mutation when Cancel button clicked', async () => {
      const user = userEvent.setup();
      const cancelMutate = vi.fn();

      vi.mocked(useAdminBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[0]] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useAdminBookingsConfirmCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useAdminBookingsCancelCreate).mockReturnValue({
        mutate: cancelMutate,
        isPending: false,
      } as any);

      renderWithClient(<BookingsTable />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(cancelMutate).toHaveBeenCalled();
    });

    it('shows success toast on cancel success', async () => {
      const user = userEvent.setup();
      const refetch = vi.fn();

      vi.mocked(useAdminBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[0]] } },
        isLoading: false,
        error: null,
        refetch,
      } as any);

      vi.mocked(useAdminBookingsConfirmCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useAdminBookingsCancelCreate).mockReturnValue({
        mutate: (_: unknown, options: { onSuccess?: () => void }) => {
          options?.onSuccess?.();
        },
        isPending: false,
      } as any);

      renderWithClient(<BookingsTable />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(toast).toHaveBeenCalledWith({
        title: 'Booking cancelled',
        variant: 'success',
      });
      expect(refetch).toHaveBeenCalled();
    });

    it('disables Cancel button when cancelling', () => {
      vi.mocked(useAdminBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[0]] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useAdminBookingsConfirmCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useAdminBookingsCancelCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
      } as any);

      renderWithClient(<BookingsTable />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });
  });

  describe('empty state', () => {
    it('shows empty message when no bookings', () => {
      vi.mocked(useAdminBookingsList).mockReturnValue({
        data: { data: { results: [] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useAdminBookingsConfirmCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useAdminBookingsCancelCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderWithClient(<BookingsTable />);

      expect(screen.getByText('No bookings found.')).toBeInTheDocument();
    });
  });

  describe('sorting functionality', () => {
    beforeEach(() => {
      vi.mocked(useAdminBookingsList).mockReturnValue({
        data: { data: { results: mockBookings } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useAdminBookingsConfirmCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useAdminBookingsCancelCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);
    });

    it('shows sort indicators on headers', async () => {
      const user = userEvent.setup();
      renderWithClient(<BookingsTable />);

      const tutorHeader = screen.getByText('Tutor');
      await user.click(tutorHeader);

      await waitFor(() => {
        const headerWithSort = tutorHeader.closest('th');
        expect(headerWithSort?.textContent).toContain('↑');
      });
    });

    it('toggles sort direction when clicking header', async () => {
      const user = userEvent.setup();
      renderWithClient(<BookingsTable />);

      const tutorHeader = screen.getByText('Tutor');

      await user.click(tutorHeader);
      await waitFor(() => {
        const headerWithSort = tutorHeader.closest('th');
        expect(headerWithSort?.textContent).toContain('↑');
      });

      await user.click(tutorHeader);
      await waitFor(() => {
        const headerWithSort = tutorHeader.closest('th');
        expect(headerWithSort?.textContent).toContain('↓');
      });
    });
  });
});
