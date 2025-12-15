'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { TutorWizard } from '@/components/features/tutor-wizard';
import { toast } from '@/components/ui/toast';
import { useTutorDraftsCreate } from '@/generated/api/tutor-drafts/tutor-drafts';
import type { TutorProfileData } from '@/lib/schemas/tutor-profile';

/**
 * Page for creating a new tutor profile using the multi-step wizard.
 */
export default function CreateTutorPage() {
  const router = useRouter();
  const { mutateAsync: createDraft } = useTutorDraftsCreate();

  const handleSubmit = useCallback(
    async (data: TutorProfileData) => {
      try {
        await createDraft({
          data: {
            data: data,
            current_step: 4,
          },
        });

        localStorage.removeItem('tutor-profile-draft');

        toast({
          title: 'Profile Created!',
          description: 'Your tutor profile has been created successfully. Redirecting...',
          variant: 'success',
        });

        setTimeout(() => {
          router.push('/tutors');
        }, 2000);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create profile';
        toast({
          title: 'Error',
          description: message,
          variant: 'error',
        });
      }
    },
    [router, createDraft]
  );

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="font-bold text-3xl tracking-tight">Become a Tutor</h1>
          <p className="mt-2 text-muted-foreground">
            Create your tutor profile and start teaching students.
          </p>
        </div>

        <TutorWizard onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
