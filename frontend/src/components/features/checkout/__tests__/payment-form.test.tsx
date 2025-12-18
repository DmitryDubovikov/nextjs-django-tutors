import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PaymentForm } from '../payment-form';

const mockCreateIntent = vi.fn();
const mockConfirmPayment = vi.fn();
const mockCheckStatus = vi.fn();

vi.mock('@/generated/api/payments/payments', () => ({
  usePaymentsCreateIntentCreate: () => ({
    mutateAsync: mockCreateIntent,
  }),
  usePaymentsConfirmCreate: () => ({
    mutateAsync: mockConfirmPayment,
  }),
  usePaymentsStatusRetrieve: () => ({
    refetch: mockCheckStatus,
  }),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    status: 'authenticated',
  }),
}));

vi.mock('@/components/ui/toast', () => ({
  toast: vi.fn(),
}));

describe('PaymentForm', () => {
  const defaultProps = {
    bookingId: 1,
    amount: 1500,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders all form fields', () => {
      render(<PaymentForm {...defaultProps} />);

      expect(screen.getByLabelText(/cardholder name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/card number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/expiry date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cvc/i)).toBeInTheDocument();
    });

    it('renders formatted amount', () => {
      render(<PaymentForm {...defaultProps} />);

      expect(screen.getByText(/total/i)).toBeInTheDocument();
    });

    it('renders test cards info', () => {
      render(<PaymentForm {...defaultProps} />);

      expect(screen.getByText(/4242 4242 4242 4242/)).toBeInTheDocument();
    });

    it('renders pay now button', () => {
      render(<PaymentForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: /pay now/i })).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('formats card number with spaces', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      const input = screen.getByLabelText(/card number/i);
      await user.type(input, '4242424242424242');

      expect(input).toHaveValue('4242 4242 4242 4242');
    });

    it('limits card number to 16 digits', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      const input = screen.getByLabelText(/card number/i);
      await user.type(input, '42424242424242429999');

      expect(input).toHaveValue('4242 4242 4242 4242');
    });

    it('formats expiry with slash', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      const input = screen.getByLabelText(/expiry date/i);
      await user.type(input, '1225');

      expect(input).toHaveValue('12/25');
    });

    it('limits CVC to 4 digits', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      const input = screen.getByLabelText(/cvc/i);
      await user.type(input, '12345');

      expect(input).toHaveValue('1234');
    });

    it('removes non-numeric characters from card number', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      const input = screen.getByLabelText(/card number/i);
      await user.type(input, '4242-4242-4242-4242');

      expect(input).toHaveValue('4242 4242 4242 4242');
    });
  });

  describe('payment flow', () => {
    it('calls create intent and confirm on submit', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();

      mockCreateIntent.mockResolvedValueOnce({
        data: {
          payment_intent_id: 'pi_test123',
          client_secret: 'pi_test123_secret_abc',
        },
      });

      mockConfirmPayment.mockResolvedValueOnce({
        data: { status: 'processing' },
      });

      mockCheckStatus.mockResolvedValueOnce({
        data: { data: { status: 'succeeded' } },
      });

      render(<PaymentForm {...defaultProps} onSuccess={onSuccess} />);

      await user.type(screen.getByLabelText(/cardholder name/i), 'John Doe');
      await user.type(screen.getByLabelText(/card number/i), '4242424242424242');
      await user.type(screen.getByLabelText(/expiry date/i), '1225');
      await user.type(screen.getByLabelText(/cvc/i), '123');

      await user.click(screen.getByRole('button', { name: /pay now/i }));

      await waitFor(() => {
        expect(mockCreateIntent).toHaveBeenCalledWith({
          data: expect.objectContaining({
            booking_id: 1,
            amount: '1500',
            currency: 'RUB',
          }),
        });
      });

      await waitFor(() => {
        expect(mockConfirmPayment).toHaveBeenCalledWith({
          data: {
            payment_intent_id: 'pi_test123',
            card_number: '4242424242424242',
          },
        });
      });
    });

    it('calls onError on failed payment', async () => {
      const user = userEvent.setup();
      const onError = vi.fn();

      mockCreateIntent.mockResolvedValueOnce({
        data: {
          payment_intent_id: 'pi_test123',
          client_secret: 'pi_test123_secret_abc',
        },
      });

      mockConfirmPayment.mockResolvedValueOnce({
        data: { status: 'processing' },
      });

      mockCheckStatus.mockResolvedValueOnce({
        data: { data: { status: 'failed' } },
      });

      render(<PaymentForm {...defaultProps} onError={onError} />);

      await user.type(screen.getByLabelText(/cardholder name/i), 'John Doe');
      await user.type(screen.getByLabelText(/card number/i), '4000000000000002');
      await user.type(screen.getByLabelText(/expiry date/i), '1225');
      await user.type(screen.getByLabelText(/cvc/i), '123');

      await user.click(screen.getByRole('button', { name: /pay now/i }));

      await waitFor(
        () => {
          expect(onError).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    });

    it('disables form during processing', async () => {
      const user = userEvent.setup();

      mockCreateIntent.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(<PaymentForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/cardholder name/i), 'John Doe');
      await user.type(screen.getByLabelText(/card number/i), '4242424242424242');
      await user.type(screen.getByLabelText(/expiry date/i), '1225');
      await user.type(screen.getByLabelText(/cvc/i), '123');

      await user.click(screen.getByRole('button', { name: /pay now/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/cardholder name/i)).toBeDisabled();
        expect(screen.getByLabelText(/card number/i)).toBeDisabled();
      });
    });
  });
});
