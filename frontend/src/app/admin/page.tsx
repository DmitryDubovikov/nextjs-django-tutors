import type { Metadata } from 'next';

import { AdminDashboard } from '@/components/admin/admin-dashboard';

export const metadata: Metadata = {
  title: 'Admin Dashboard | Tutors Marketplace',
  description: 'Manage tutors and bookings',
};

export default function AdminPage() {
  return (
    <main className="container py-8">
      <h1 className="mb-6 font-bold text-3xl">Admin Dashboard</h1>
      <AdminDashboard />
    </main>
  );
}
