'use client';

import { useState } from 'react';

import { useSession } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import {
  usePaymentsConfirmCreate,
  usePaymentsCreateIntentCreate,
  usePaymentsStatusRetrieve,
} from '@/generated/api/payments/payments';

interface CardData {
  number: string;
  expiry: string;
  cvc: string;
  name: string;
}

interface PaymentFormProps {
  bookingId: number;
  amount: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

type PaymentStatus = 'idle' | 'creating' | 'confirming' | 'polling' | 'success' | 'failed';

const TEST_CARDS = {
  success: '4242424242424242',
  declined: '4000000000000002',
  insufficient: '4000000000009995',
};

export function PaymentForm({ bookingId, amount, onSuccess, onError }: PaymentFormProps) {
  const { status: sessionStatus } = useSession();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [cardData, setCardData] = useState<CardData>({
    number: '',
    expiry: '',
    cvc: '',
    name: '',
  });

  const createIntent = usePaymentsCreateIntentCreate();
  const confirmPayment = usePaymentsConfirmCreate();
  const { refetch: checkStatus } = usePaymentsStatusRetrieve(paymentIntentId ?? '', {
    query: {
      enabled: false,
    },
  });

  const pollPaymentStatus = async (maxAttempts = 10) => {
    setPaymentStatus('polling');

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      try {
        const result = await checkStatus();
        const status = result.data?.data?.status;

        if (status === 'succeeded') {
          setPaymentStatus('success');
          toast({
            title: 'Payment successful',
            description: 'Your booking has been confirmed.',
            variant: 'success',
          });
          onSuccess?.();
          return;
        }

        if (status === 'failed') {
          setPaymentStatus('failed');
          const error = new Error('Payment was declined');
          toast({
            title: 'Payment failed',
            description: 'Your payment was declined. Please try a different card.',
            variant: 'error',
          });
          onError?.(error);
          return;
        }
      } catch {
        // Continue polling on error
      }
    }

    setPaymentStatus('failed');
    const error = new Error('Payment status check timed out');
    toast({
      title: 'Payment status unknown',
      description: 'Could not verify payment status. Please check your bookings.',
      variant: 'error',
    });
    onError?.(error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (sessionStatus !== 'authenticated') {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to complete your payment.',
        variant: 'error',
      });
      return;
    }

    const cleanCardNumber = cardData.number.replace(/\s/g, '');

    try {
      setPaymentStatus('creating');

      const idempotencyKey = crypto.randomUUID();

      const intentResult = await createIntent.mutateAsync({
        data: {
          booking_id: bookingId,
          amount: String(amount),
          currency: 'RUB',
          idempotency_key: idempotencyKey,
        },
      });

      const intentId = intentResult.data.payment_intent_id;
      setPaymentIntentId(intentId);

      setPaymentStatus('confirming');

      await confirmPayment.mutateAsync({
        data: {
          payment_intent_id: intentId,
          card_number: cleanCardNumber,
        },
      });

      await pollPaymentStatus();
    } catch (error) {
      setPaymentStatus('failed');
      const err = error instanceof Error ? error : new Error('Payment failed');
      toast({
        title: 'Payment error',
        description: err.message,
        variant: 'error',
      });
      onError?.(err);
    }
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 16);
    return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    return cleaned;
  };

  const isProcessing = ['creating', 'confirming', 'polling'].includes(paymentStatus);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
        <CardDescription>Enter your card information to complete the booking.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="card-name">Cardholder Name</Label>
            <Input
              id="card-name"
              placeholder="John Doe"
              value={cardData.name}
              onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
              disabled={isProcessing}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="card-number">Card Number</Label>
            <Input
              id="card-number"
              placeholder="4242 4242 4242 4242"
              value={cardData.number}
              onChange={(e) =>
                setCardData({ ...cardData, number: formatCardNumber(e.target.value) })
              }
              disabled={isProcessing}
              required
              maxLength={19}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="card-expiry">Expiry Date</Label>
              <Input
                id="card-expiry"
                placeholder="MM/YY"
                value={cardData.expiry}
                onChange={(e) => setCardData({ ...cardData, expiry: formatExpiry(e.target.value) })}
                disabled={isProcessing}
                required
                maxLength={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-cvc">CVC</Label>
              <Input
                id="card-cvc"
                placeholder="123"
                value={cardData.cvc}
                onChange={(e) =>
                  setCardData({ ...cardData, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })
                }
                disabled={isProcessing}
                required
                maxLength={4}
              />
            </div>
          </div>

          <div className="rounded-md border bg-muted/50 p-3">
            <p className="font-medium text-sm">
              Total:{' '}
              {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(
                amount
              )}
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isProcessing}>
            {paymentStatus === 'idle' && 'Pay Now'}
            {paymentStatus === 'creating' && 'Creating payment...'}
            {paymentStatus === 'confirming' && 'Processing...'}
            {paymentStatus === 'polling' && 'Verifying payment...'}
            {paymentStatus === 'success' && 'Payment successful!'}
            {paymentStatus === 'failed' && 'Try again'}
          </Button>

          <div className="space-y-1 text-muted-foreground text-xs">
            <p className="font-medium">Test Cards:</p>
            <p>Success: {formatCardNumber(TEST_CARDS.success)}</p>
            <p>Declined: {formatCardNumber(TEST_CARDS.declined)}</p>
            <p>Insufficient funds: {formatCardNumber(TEST_CARDS.insufficient)}</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
