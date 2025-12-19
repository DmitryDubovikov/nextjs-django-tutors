import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSession } from 'next-auth/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Booking } from '@/generated/schemas';

import { BookingsClient } from '../bookings-client';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

// Mock dependencies
vi.mock('@/generated/api/bookings/bookings', () => ({
  useBookingsList: vi.fn(),
  useBookingsCancelCreate: vi.fn(),
}));

vi.mock('@/components/ui/toast', () => ({
  toast: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock PaymentForm to avoid complex payment API mocking
vi.mock('../checkout', () => ({
  PaymentForm: ({ bookingId, amount }: { bookingId: number; amount: number }) => (
    <div data-testid="payment-form" data-booking-id={bookingId} data-amount={amount}>
      Mock Payment Form
    </div>
  ),
}));

import { toast } from '@/components/ui/toast';
import { useBookingsCancelCreate, useBookingsList } from '@/generated/api/bookings/bookings';

describe('BookingsClient', () => {
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
    {
      id: 4,
      tutor_name: 'Sarah Jones',
      student_name: 'David Student',
      scheduled_at: '2024-12-10T11:00:00Z',
      duration_minutes: 45,
      price: '40.00',
      status: 'cancelled',
      notes: undefined,
      tutor_slug: 'sarah-jones',
      tutor: 4,
      student: 4,
      created_at: '2024-11-25T00:00:00Z',
      updated_at: '2024-12-09T15:00:00Z',
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

    // Default mock for useSession - authenticated user
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        expires: '2099-12-31',
      },
      status: 'authenticated',
      update: vi.fn(),
    } as any);

    // Default mock for useBookingsCancelCreate
    vi.mocked(useBookingsCancelCreate).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
  });

  function renderWithClient(component: React.ReactElement) {
    return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
  }

  describe('loading state', () => {
    it('shows loading skeleton when data is loading', () => {
      vi.mocked(useBookingsList).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { container } = renderWithClient(<BookingsClient />);

      // Should show skeleton cards
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('empty state', () => {
    it('shows empty state when no bookings', () => {
      vi.mocked(useBookingsList).mockReturnValue({
        data: { data: { results: [] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithClient(<BookingsClient />);

      expect(screen.getByText('No bookings yet')).toBeInTheDocument();
      expect(screen.getByText(/browse our tutors and book your first lesson/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /find a tutor/i })).toBeInTheDocument();
    });

    it('has link to tutors page in empty state', () => {
      vi.mocked(useBookingsList).mockReturnValue({
        data: { data: { results: [] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithClient(<BookingsClient />);

      const link = screen.getByRole('link', { name: /find a tutor/i });
      expect(link).toHaveAttribute('href', '/tutors');
    });
  });

  describe('error state', () => {
    it('shows error message when fetch fails', () => {
      vi.mocked(useBookingsList).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        refetch: vi.fn(),
      } as any);

      renderWithClient(<BookingsClient />);

      expect(screen.getByText('Failed to load bookings. Please try again.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('calls refetch when Retry button clicked', async () => {
      const user = userEvent.setup();
      const refetchMock = vi.fn();

      vi.mocked(useBookingsList).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        refetch: refetchMock,
      } as any);

      renderWithClient(<BookingsClient />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(refetchMock).toHaveBeenCalled();
    });
  });

  describe('data rendering', () => {
    beforeEach(() => {
      vi.mocked(useBookingsList).mockReturnValue({
        data: { data: { results: mockBookings } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useBookingsCancelCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);
    });

    it('renders all bookings', () => {
      renderWithClient(<BookingsClient />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Mike Teacher')).toBeInTheDocument();
      expect(screen.getByText('Sarah Jones')).toBeInTheDocument();
    });

    it('displays formatted date and time', () => {
      renderWithClient(<BookingsClient />);

      // Check that dates are formatted (exact format depends on locale)
      // Multiple bookings have Dec dates, so use getAllByText
      expect(screen.getAllByText(/dec/i).length).toBeGreaterThan(0);
    });

    it('displays duration', () => {
      renderWithClient(<BookingsClient />);

      // Multiple bookings may have the same duration, so use getAllByText
      expect(screen.getAllByText(/60 min/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/90 min/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/45 min/i).length).toBeGreaterThan(0);
    });

    it('displays formatted prices', () => {
      renderWithClient(<BookingsClient />);

      expect(screen.getByText('$50')).toBeInTheDocument();
      expect(screen.getByText('$68')).toBeInTheDocument(); // Rounded from 67.50
      expect(screen.getByText('$45')).toBeInTheDocument();
      expect(screen.getByText('$40')).toBeInTheDocument();
    });

    it('displays booking notes when available', () => {
      renderWithClient(<BookingsClient />);

      expect(screen.getByText('Need help with calculus')).toBeInTheDocument();
    });

    it('displays status badges', () => {
      renderWithClient(<BookingsClient />);

      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });

    it('links tutor name to tutor profile', () => {
      renderWithClient(<BookingsClient />);

      const link = screen.getByRole('link', { name: 'John Doe' });
      expect(link).toHaveAttribute('href', '/tutors/john-doe');
    });

    it('renders bookings in grid layout', () => {
      const { container } = renderWithClient(<BookingsClient />);

      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveClass('md:grid-cols-2');
    });
  });

  describe('cancel functionality', () => {
    beforeEach(() => {
      vi.mocked(useBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[0], mockBookings[1]] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);
    });

    it('shows Cancel button for pending bookings', () => {
      vi.mocked(useBookingsCancelCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderWithClient(<BookingsClient />);

      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      expect(cancelButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('shows Cancel button for confirmed bookings', () => {
      vi.mocked(useBookingsCancelCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderWithClient(<BookingsClient />);

      // Both pending and confirmed should have cancel buttons
      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      expect(cancelButtons.length).toBeGreaterThanOrEqual(2);
    });

    it('does not show Cancel button for completed bookings', () => {
      vi.mocked(useBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[2]] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useBookingsCancelCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderWithClient(<BookingsClient />);

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    it('does not show Cancel button for already cancelled bookings', () => {
      vi.mocked(useBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[3]] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useBookingsCancelCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderWithClient(<BookingsClient />);

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    it('calls cancel mutation when Cancel clicked', async () => {
      const user = userEvent.setup();
      const cancelMutate = vi.fn();

      vi.mocked(useBookingsCancelCreate).mockReturnValue({
        mutate: cancelMutate,
        isPending: false,
      } as any);

      renderWithClient(<BookingsClient />);

      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      expect(cancelButtons.length).toBeGreaterThan(0);
      await user.click(cancelButtons[0] as HTMLElement);

      expect(cancelMutate).toHaveBeenCalled();
    });

    it('shows success toast on cancel success', async () => {
      const user = userEvent.setup();
      const refetchMock = vi.fn();

      vi.mocked(useBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[0]] } },
        isLoading: false,
        error: null,
        refetch: refetchMock,
      } as any);

      vi.mocked(useBookingsCancelCreate).mockReturnValue({
        mutate: (_: unknown, options: { onSuccess?: () => void }) => {
          options?.onSuccess?.();
        },
        isPending: false,
      } as any);

      renderWithClient(<BookingsClient />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(toast).toHaveBeenCalledWith({
        title: 'Booking cancelled',
        description: 'Your booking has been cancelled successfully.',
        variant: 'success',
      });
      expect(refetchMock).toHaveBeenCalled();
    });

    it('shows error toast on cancel failure', async () => {
      const user = userEvent.setup();

      vi.mocked(useBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[0]] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useBookingsCancelCreate).mockReturnValue({
        mutate: (_: unknown, options: { onError?: () => void }) => {
          options?.onError?.();
        },
        isPending: false,
      } as any);

      renderWithClient(<BookingsClient />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(toast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to cancel booking. Please try again.',
        variant: 'error',
      });
    });

    it('shows loading text when cancelling', () => {
      vi.mocked(useBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[0]] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useBookingsCancelCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
      } as any);

      renderWithClient(<BookingsClient />);

      expect(screen.getByText('Cancelling...')).toBeInTheDocument();
    });

    it('disables Cancel button when cancelling', () => {
      vi.mocked(useBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[0]] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useBookingsCancelCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
      } as any);

      renderWithClient(<BookingsClient />);

      const cancelButton = screen.getByRole('button', { name: /cancelling/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('status badges styling', () => {
    it('renders different badge variants for different statuses', () => {
      vi.mocked(useBookingsList).mockReturnValue({
        data: { data: { results: mockBookings } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useBookingsCancelCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderWithClient(<BookingsClient />);

      // All status badges should be present
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      vi.mocked(useBookingsList).mockReturnValue({
        data: { data: { results: mockBookings } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useBookingsCancelCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);
    });

    it('has accessible links to tutor profiles', () => {
      renderWithClient(<BookingsClient />);

      const links = screen.getAllByRole('link');
      for (const link of links) {
        expect(link).toHaveAttribute('href');
      }
    });

    it('has accessible cancel buttons', () => {
      renderWithClient(<BookingsClient />);

      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      for (const button of cancelButtons) {
        expect(button).toBeInTheDocument();
      }
    });
  });

  describe('payment functionality', () => {
    beforeEach(() => {
      vi.mocked(useBookingsCancelCreate).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);
    });

    it('shows Pay Now button for pending bookings', () => {
      vi.mocked(useBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[0]] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithClient(<BookingsClient />);

      expect(screen.getByRole('button', { name: /pay now/i })).toBeInTheDocument();
    });

    it('does not show Pay Now button for confirmed bookings', () => {
      vi.mocked(useBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[1]] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithClient(<BookingsClient />);

      expect(screen.queryByRole('button', { name: /pay now/i })).not.toBeInTheDocument();
    });

    it('does not show Pay Now button for completed bookings', () => {
      vi.mocked(useBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[2]] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithClient(<BookingsClient />);

      expect(screen.queryByRole('button', { name: /pay now/i })).not.toBeInTheDocument();
    });

    it('does not show Pay Now button for cancelled bookings', () => {
      vi.mocked(useBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[3]] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithClient(<BookingsClient />);

      expect(screen.queryByRole('button', { name: /pay now/i })).not.toBeInTheDocument();
    });

    it('opens payment dialog when Pay Now clicked', async () => {
      const user = userEvent.setup();

      vi.mocked(useBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[0]] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithClient(<BookingsClient />);

      const payButton = screen.getByRole('button', { name: /pay now/i });
      await user.click(payButton);

      expect(screen.getByText('Complete Payment')).toBeInTheDocument();
      expect(screen.getByTestId('payment-form')).toBeInTheDocument();
    });

    it('passes correct booking id and amount to PaymentForm', async () => {
      const user = userEvent.setup();

      vi.mocked(useBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[0]] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithClient(<BookingsClient />);

      const payButton = screen.getByRole('button', { name: /pay now/i });
      await user.click(payButton);

      const paymentForm = screen.getByTestId('payment-form');
      expect(paymentForm).toHaveAttribute('data-booking-id', '1');
      expect(paymentForm).toHaveAttribute('data-amount', '50');
    });

    it('shows tutor name in payment dialog', async () => {
      const user = userEvent.setup();

      vi.mocked(useBookingsList).mockReturnValue({
        data: { data: { results: [mockBookings[0]] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithClient(<BookingsClient />);

      const payButton = screen.getByRole('button', { name: /pay now/i });
      await user.click(payButton);

      expect(screen.getByText(/pay for your lesson with john doe/i)).toBeInTheDocument();
    });
  });
});
