import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { tutorsBySlugRetrieve, tutorsList } from '@/generated/api/tutors/tutors';
import type { Tutor } from '@/generated/schemas';

interface TutorDetailPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generate static params for all tutors at build time.
 */
export async function generateStaticParams() {
  try {
    const response = await tutorsList();
    const tutors = response.data.results ?? [];
    return tutors.map((tutor) => ({ slug: tutor.slug }));
  } catch {
    return [];
  }
}

/**
 * Generate metadata for the tutor detail page.
 */
export async function generateMetadata({ params }: TutorDetailPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const response = await tutorsBySlugRetrieve(slug);
    const tutor = response.data;

    return {
      title: `${tutor.full_name} - Tutor | Tutors Marketplace`,
      description: tutor.bio.slice(0, 160),
      openGraph: {
        title: `${tutor.full_name} - Tutor`,
        description: tutor.headline,
        images: tutor.avatar_url ? [tutor.avatar_url] : [],
      },
    };
  } catch {
    return {
      title: 'Tutor Not Found | Tutors Marketplace',
    };
  }
}

/**
 * Star rating component for displaying tutor ratings.
 */
function StarRating({ rating, reviewsCount }: { rating: number; reviewsCount: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-2">
      <div className="flex" aria-label={`Rating: ${rating.toFixed(1)} out of 5`}>
        {[...Array(5)].map((_, i) => (
          <svg
            key={`star-${i}-${rating}`}
            className={`h-5 w-5 ${
              i < fullStars
                ? 'fill-yellow-400 text-yellow-400'
                : i === fullStars && hasHalfStar
                  ? 'fill-yellow-400/50 text-yellow-400'
                  : 'fill-gray-200 text-gray-200'
            }`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
      <span className="font-semibold text-lg">{rating > 0 ? rating.toFixed(1) : 'New'}</span>
      {reviewsCount > 0 && <span className="text-muted-foreground">({reviewsCount} reviews)</span>}
    </div>
  );
}

/**
 * Tutor profile header component.
 */
function TutorHeader({ tutor }: { tutor: Tutor }) {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(tutor.hourly_rate));

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      <Avatar size="xl" className="h-32 w-32">
        <AvatarImage src={tutor.avatar_url} alt={tutor.full_name} />
        <AvatarFallback name={tutor.full_name} className="text-3xl" />
      </Avatar>

      <div className="flex-1 space-y-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-3xl">{tutor.full_name}</h1>
            {tutor.is_verified && <Badge variant="success">Verified</Badge>}
          </div>
          <p className="mt-1 text-lg text-muted-foreground">{tutor.headline}</p>
        </div>

        <StarRating rating={Number(tutor.rating)} reviewsCount={tutor.reviews_count ?? 0} />

        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
          {tutor.location && (
            <span className="flex items-center gap-1">
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {tutor.location}
            </span>
          )}
          {tutor.formats.length > 0 && (
            <span className="flex items-center gap-2">
              {tutor.formats.includes('online') && <Badge variant="outline">Online</Badge>}
              {tutor.formats.includes('offline') && <Badge variant="outline">In-person</Badge>}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 pt-2">
          <div>
            <span className="text-muted-foreground text-sm">Price per hour</span>
            <p className="font-bold text-2xl text-primary">{formattedPrice}</p>
          </div>
          <Button size="lg">Book a Lesson</Button>
        </div>
      </div>
    </div>
  );
}

export default async function TutorDetailPage({ params }: TutorDetailPageProps) {
  const { slug } = await params;

  let tutor: Tutor;
  try {
    const response = await tutorsBySlugRetrieve(slug);
    tutor = response.data;
  } catch {
    notFound();
  }

  // TypeScript doesn't know notFound() never returns, so we need this check
  if (!tutor) {
    notFound();
  }

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              Home
            </Link>
          </li>
          <li className="text-muted-foreground">/</li>
          <li>
            <Link href="/tutors" className="text-muted-foreground hover:text-foreground">
              Tutors
            </Link>
          </li>
          <li className="text-muted-foreground">/</li>
          <li className="text-foreground">{tutor.full_name}</li>
        </ol>
      </nav>

      <TutorHeader tutor={tutor} />

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-8 lg:col-span-2">
          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-muted-foreground">{tutor.bio}</p>
            </CardContent>
          </Card>

          {/* Subjects */}
          <Card>
            <CardHeader>
              <CardTitle>Subjects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {tutor.subjects.map((subject) => (
                  <Badge key={subject} variant="secondary" className="text-sm capitalize">
                    {subject.replace('-', ' ')}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick booking card */}
          <Card>
            <CardHeader>
              <CardTitle>Book a Lesson</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Select a time slot and book a lesson with {tutor.full_name}.
              </p>
              <Button className="w-full">View Available Times</Button>
            </CardContent>
          </Card>

          {/* Contact info */}
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-muted-foreground text-sm">
                Have questions? Send a message to {tutor.full_name}.
              </p>
              <Button variant="outline" className="w-full">
                Send Message
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
