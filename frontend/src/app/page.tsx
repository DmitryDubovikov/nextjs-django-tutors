import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="font-bold text-4xl text-foreground">Tutors Marketplace</h1>
      <p className="mt-4 text-lg text-muted-foreground">Find and book tutors for any subject</p>
      <Link
        href="/tutors"
        className="mt-8 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary-600"
      >
        Browse Tutors
      </Link>
    </main>
  );
}
