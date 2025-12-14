'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { BookingsTable } from './bookings-table';
import { TutorsTable } from './tutors-table';

export function AdminDashboard() {
  return (
    <Tabs defaultValue="tutors">
      <TabsList>
        <TabsTrigger value="tutors">Tutors</TabsTrigger>
        <TabsTrigger value="bookings">Bookings</TabsTrigger>
      </TabsList>
      <TabsContent value="tutors">
        <TutorsTable />
      </TabsContent>
      <TabsContent value="bookings">
        <BookingsTable />
      </TabsContent>
    </Tabs>
  );
}
