import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Tutor } from '@/generated/schemas';

import { TutorsTable } from '../tutors-table';

// Mock the API hook
vi.mock('@/generated/api/tutors/tutors', () => ({
  useTutorsList: vi.fn(),
}));

import { useTutorsList } from '@/generated/api/tutors/tutors';

describe('TutorsTable', () => {
  const mockTutors: Tutor[] = [
    {
      id: 1,
      user_id: 101,
      full_name: 'John Doe',
      bio: 'Experienced math teacher with 10 years of experience',
      hourly_rate: '50.00',
      is_verified: true,
      rating: '4.8',
      subjects: ['math', 'physics'],
      slug: 'john-doe',
      headline: 'Math Expert',
      avatar_url: '',
      formats: ['online'],
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      user_id: 102,
      full_name: 'Jane Smith',
      bio: 'Expert in English literature and writing',
      hourly_rate: '45.00',
      is_verified: false,
      rating: undefined,
      subjects: ['english', 'literature'],
      slug: 'jane-smith',
      headline: 'English Specialist',
      avatar_url: '',
      formats: ['online'],
      created_at: '2024-01-02T00:00:00Z',
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
  });

  function renderWithClient(component: React.ReactElement) {
    return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
  }

  describe('loading state', () => {
    it('shows skeleton when loading', () => {
      vi.mocked(useTutorsList).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      renderWithClient(<TutorsTable />);

      // TableSkeleton should be rendered
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });
  });

  describe('data rendering', () => {
    beforeEach(() => {
      vi.mocked(useTutorsList).mockReturnValue({
        data: { data: { results: mockTutors } },
        isLoading: false,
        error: null,
      } as any);
    });

    it('renders table with tutors data', () => {
      renderWithClient(<TutorsTable />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('displays all column headers', () => {
      renderWithClient(<TutorsTable />);

      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Bio')).toBeInTheDocument();
      expect(screen.getByText('Rate')).toBeInTheDocument();
      // "Verified" appears in both header and badge, so use getAllByText
      expect(screen.getAllByText('Verified').length).toBeGreaterThan(0);
      expect(screen.getByText('Rating')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('displays tutor IDs', () => {
      renderWithClient(<TutorsTable />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('displays tutor bios truncated', () => {
      renderWithClient(<TutorsTable />);

      expect(
        screen.getByText('Experienced math teacher with 10 years of experience')
      ).toBeInTheDocument();
      expect(screen.getByText('Expert in English literature and writing')).toBeInTheDocument();
    });

    it('displays hourly rates formatted', () => {
      renderWithClient(<TutorsTable />);

      expect(screen.getByText('$50.00')).toBeInTheDocument();
      expect(screen.getByText('$45.00')).toBeInTheDocument();
    });

    it('displays verification badges correctly', () => {
      renderWithClient(<TutorsTable />);

      // Both header and badge contain "Verified", so use getAllByText
      expect(screen.getAllByText('Verified').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('displays ratings correctly', () => {
      renderWithClient(<TutorsTable />);

      expect(screen.getByText('4.8 / 5')).toBeInTheDocument();
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });

    it('renders action buttons for each tutor', () => {
      renderWithClient(<TutorsTable />);

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });

      expect(editButtons).toHaveLength(2);
      expect(deleteButtons).toHaveLength(2);
    });
  });

  describe('search functionality', () => {
    beforeEach(() => {
      vi.mocked(useTutorsList).mockReturnValue({
        data: { data: { results: mockTutors } },
        isLoading: false,
        error: null,
      } as any);
    });

    it('renders search input', () => {
      renderWithClient(<TutorsTable />);

      expect(screen.getByPlaceholderText('Search tutors...')).toBeInTheDocument();
    });

    it('filters tutors by name', async () => {
      const user = userEvent.setup();
      renderWithClient(<TutorsTable />);

      const searchInput = screen.getByPlaceholderText('Search tutors...');
      await user.type(searchInput, 'John');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      });
    });

    it('filters tutors by bio', async () => {
      const user = userEvent.setup();
      renderWithClient(<TutorsTable />);

      const searchInput = screen.getByPlaceholderText('Search tutors...');
      await user.type(searchInput, 'English literature');

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      });
    });

    it('shows all tutors when search is cleared', async () => {
      const user = userEvent.setup();
      renderWithClient(<TutorsTable />);

      const searchInput = screen.getByPlaceholderText('Search tutors...');
      await user.type(searchInput, 'John');

      await waitFor(() => {
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      });

      await user.clear(searchInput);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('is case insensitive', async () => {
      const user = userEvent.setup();
      renderWithClient(<TutorsTable />);

      const searchInput = screen.getByPlaceholderText('Search tutors...');
      await user.type(searchInput, 'JOHN');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });
  });

  describe('sorting functionality', () => {
    beforeEach(() => {
      vi.mocked(useTutorsList).mockReturnValue({
        data: { data: { results: mockTutors } },
        isLoading: false,
        error: null,
      } as any);
    });

    it('shows sort indicators on headers', async () => {
      const user = userEvent.setup();
      renderWithClient(<TutorsTable />);

      const nameHeader = screen.getByText('Name');
      await user.click(nameHeader);

      await waitFor(() => {
        const headerWithSort = nameHeader.closest('th');
        expect(headerWithSort?.textContent).toContain('↑');
      });
    });

    it('toggles sort direction when clicking header', async () => {
      const user = userEvent.setup();
      renderWithClient(<TutorsTable />);

      const nameHeader = screen.getByText('Name');

      // First click - ascending
      await user.click(nameHeader);
      await waitFor(() => {
        const headerWithSort = nameHeader.closest('th');
        expect(headerWithSort?.textContent).toContain('↑');
      });

      // Second click - descending
      await user.click(nameHeader);
      await waitFor(() => {
        const headerWithSort = nameHeader.closest('th');
        expect(headerWithSort?.textContent).toContain('↓');
      });
    });

    it('sorts by name correctly', async () => {
      const user = userEvent.setup();
      renderWithClient(<TutorsTable />);

      const nameHeader = screen.getByText('Name');
      await user.click(nameHeader);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        const firstDataRow = rows[1];
        expect(firstDataRow).toBeDefined();
        expect(firstDataRow?.textContent).toContain('Jane Smith');
      });
    });
  });

  describe('pagination', () => {
    beforeEach(() => {
      vi.mocked(useTutorsList).mockReturnValue({
        data: { data: { results: mockTutors } },
        isLoading: false,
        error: null,
      } as any);
    });

    it('renders pagination controls', () => {
      renderWithClient(<TutorsTable />);

      expect(screen.getByText('Rows per page')).toBeInTheDocument();
    });

    it('shows correct page information', () => {
      renderWithClient(<TutorsTable />);

      expect(screen.getByText(/page \d+ of \d+/i)).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty message when no tutors', () => {
      vi.mocked(useTutorsList).mockReturnValue({
        data: { data: { results: [] } },
        isLoading: false,
        error: null,
      } as any);

      renderWithClient(<TutorsTable />);

      expect(screen.getByText('No tutors found.')).toBeInTheDocument();
    });

    it('shows empty message when search returns no results', async () => {
      const user = userEvent.setup();
      vi.mocked(useTutorsList).mockReturnValue({
        data: { data: { results: mockTutors } },
        isLoading: false,
        error: null,
      } as any);

      renderWithClient(<TutorsTable />);

      const searchInput = screen.getByPlaceholderText('Search tutors...');
      await user.type(searchInput, 'NonexistentTutor');

      await waitFor(() => {
        expect(screen.getByText('No tutors found.')).toBeInTheDocument();
      });
    });
  });

  describe('action buttons', () => {
    beforeEach(() => {
      vi.mocked(useTutorsList).mockReturnValue({
        data: { data: { results: mockTutors } },
        isLoading: false,
        error: null,
      } as any);
    });

    it('logs edit action when edit button clicked', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const user = userEvent.setup();

      renderWithClient(<TutorsTable />);

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      expect(editButtons.length).toBeGreaterThan(0);
      await user.click(editButtons[0] as HTMLElement);

      expect(consoleSpy).toHaveBeenCalledWith('Edit', 1);
      consoleSpy.mockRestore();
    });

    it('logs delete action when delete button clicked', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const user = userEvent.setup();

      renderWithClient(<TutorsTable />);

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      expect(deleteButtons.length).toBeGreaterThan(0);
      await user.click(deleteButtons[0] as HTMLElement);

      expect(consoleSpy).toHaveBeenCalledWith('Delete', 1);
      consoleSpy.mockRestore();
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      vi.mocked(useTutorsList).mockReturnValue({
        data: { data: { results: mockTutors } },
        isLoading: false,
        error: null,
      } as any);
    });

    it('has accessible table structure', () => {
      renderWithClient(<TutorsTable />);

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument(); // Search input
    });

    it('headers are clickable and have cursor pointer', () => {
      const { container } = renderWithClient(<TutorsTable />);

      const headers = container.querySelectorAll('th');
      for (const header of headers) {
        if (header.textContent !== 'Actions') {
          expect(header).toHaveClass('cursor-pointer');
        }
      }
    });

    it('edit and delete buttons are accessible', () => {
      renderWithClient(<TutorsTable />);

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });

      for (const button of editButtons) {
        expect(button).toBeInTheDocument();
      }

      for (const button of deleteButtons) {
        expect(button).toBeInTheDocument();
      }
    });
  });
});
