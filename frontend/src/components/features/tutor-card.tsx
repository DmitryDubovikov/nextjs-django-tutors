import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Tutor } from '@/generated/schemas';
import { cn } from '@/lib/utils';

interface TutorCardProps {
  tutor: Tutor;
  className?: string;
}

/**
 * TutorCard displays a tutor's profile information in a card format.
 */
export function TutorCard({ tutor, className }: TutorCardProps) {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(tutor.hourly_rate));

  return (
    <Card className={cn('h-full transition-shadow hover:shadow-dropdown', className)}>
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        <Avatar size="lg">
          <AvatarImage src={tutor.avatar_url} alt={tutor.full_name} />
          <AvatarFallback name={tutor.full_name} />
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{tutor.full_name}</CardTitle>
            {tutor.is_verified && (
              <Badge variant="success" className="text-[10px]">
                Verified
              </Badge>
            )}
          </div>
          <CardDescription className="line-clamp-2">{tutor.headline}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {tutor.subjects.slice(0, 4).map((subject) => (
            <Badge key={subject} variant="secondary" className="capitalize">
              {subject.replace('-', ' ')}
            </Badge>
          ))}
          {tutor.subjects.length > 4 && (
            <Badge variant="outline">+{tutor.subjects.length - 4}</Badge>
          )}
        </div>
        <div className="flex items-center justify-between border-t pt-4">
          <span className="text-muted-foreground text-sm">per hour</span>
          <span className="font-semibold text-lg text-primary">{formattedPrice}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * TutorCardSkeleton displays a loading placeholder for TutorCard.
 */
export function TutorCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          ))}
        </div>
        <div className="flex items-center justify-between border-t pt-4">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-6 w-20 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}
