'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useChatRoomsCreate } from '@/generated/api/chat/chat';

interface SendMessageButtonProps {
  tutorUserId: number;
}

export function SendMessageButton({ tutorUserId }: SendMessageButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending } = useChatRoomsCreate({
    mutation: {
      onSuccess: (response) => {
        router.push(`/chat/${response.data.id}`);
      },
      onError: () => {
        setError('Failed to start chat. Please try again.');
      },
    },
  });

  const handleClick = () => {
    setError(null);
    mutate({ data: { tutor_id: tutorUserId } });
  };

  return (
    <div className="space-y-2">
      <Button variant="outline" className="w-full" onClick={handleClick} disabled={isPending}>
        {isPending ? 'Starting chat...' : 'Send Message'}
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
