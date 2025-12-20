import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TutorFilters } from '../tutor-filters';

interface FilterState {
  q: string;
  subject: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  format: string | null;
  ordering: string;
  page: number;
}

const defaultState: FilterState = {
  q: '',
  subject: null,
  minPrice: null,
  maxPrice: null,
  format: null,
  ordering: '-rating',
  page: 1,
};

const mockSetParams = vi.fn();
let mockState: FilterState = { ...defaultState };

vi.mock('nuqs', () => ({
  useQueryStates: () => [mockState, mockSetParams],
  parseAsString: {
    withDefault: (defaultValue: string) => ({ defaultValue }),
  },
  parseAsInteger: {
    withDefault: (defaultValue: number) => ({ defaultValue }),
  },
  parseAsStringLiteral: (options: string[]) => ({
    withDefault: (defaultValue: string) => ({ defaultValue, options }),
  }),
}));

vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useTransition: () => [false, (fn: () => void) => fn()],
  };
});

describe('TutorFilters', () => {
  const defaultSubjects = ['math', 'physics', 'chemistry', 'english'];

  beforeEach(() => {
    vi.clearAllMocks();
    mockState = { ...defaultState };
  });

  describe('rendering', () => {
    it('renders search input', () => {
      render(<TutorFilters subjects={defaultSubjects} />);

      expect(screen.getByPlaceholderText(/search by name or headline/i)).toBeInTheDocument();
    });

    it('renders subject filter select', () => {
      render(<TutorFilters subjects={defaultSubjects} />);

      expect(screen.getByRole('combobox', { name: /filter by subject/i })).toBeInTheDocument();
    });

    it('renders format filter select', () => {
      render(<TutorFilters subjects={defaultSubjects} />);

      expect(screen.getByRole('combobox', { name: /filter by format/i })).toBeInTheDocument();
    });

    it('renders sort select', () => {
      render(<TutorFilters subjects={defaultSubjects} />);

      expect(screen.getByRole('combobox', { name: /sort by/i })).toBeInTheDocument();
    });

    it('renders all subject options', () => {
      render(<TutorFilters subjects={defaultSubjects} />);

      const subjectSelect = screen.getByRole('combobox', { name: /filter by subject/i });
      userEvent.click(subjectSelect);
    });

    it('formats subject names with spaces', () => {
      render(<TutorFilters subjects={['computer-science', 'data-science']} />);
    });
  });

  describe('search functionality', () => {
    it('displays search input value', () => {
      mockState = { ...defaultState, q: 'algebra' };

      render(<TutorFilters subjects={defaultSubjects} />);

      const searchInput = screen.getByPlaceholderText(/search by name or headline/i);
      expect(searchInput).toHaveValue('algebra');
    });

    it('calls setParams with debounce on search input change', async () => {
      const user = userEvent.setup({ delay: null });

      render(<TutorFilters subjects={defaultSubjects} />);

      const searchInput = screen.getByPlaceholderText(/search by name or headline/i);
      await user.type(searchInput, 'test');

      // Wait for debounce (500ms) + buffer
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      expect(mockSetParams).toHaveBeenCalledWith({ q: 'test', page: 1 });
    });

    it('resets page to 1 on search', async () => {
      const user = userEvent.setup({ delay: null });
      mockState = { ...defaultState, page: 5 };

      render(<TutorFilters subjects={defaultSubjects} />);

      const searchInput = screen.getByPlaceholderText(/search by name or headline/i);
      await user.type(searchInput, 'new search');

      // Wait for debounce (500ms) + buffer
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      expect(mockSetParams).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
    });

    it('shows search icon in input', () => {
      render(<TutorFilters subjects={defaultSubjects} />);

      const searchInput = screen.getByPlaceholderText(/search by name or headline/i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('filter badges', () => {
    it('displays active search filter badge', () => {
      mockState = { ...defaultState, q: 'calculus' };

      render(<TutorFilters subjects={defaultSubjects} />);

      expect(screen.getByText(/search: "calculus"/i)).toBeInTheDocument();
    });

    it('displays active subject filter badge', () => {
      mockState = { ...defaultState, subject: 'math' };

      render(<TutorFilters subjects={defaultSubjects} />);

      expect(screen.getByText(/subject: math/i)).toBeInTheDocument();
    });

    it('displays active format filter badge', () => {
      mockState = { ...defaultState, format: 'online' };

      render(<TutorFilters subjects={defaultSubjects} />);

      expect(screen.getByText(/format: online/i)).toBeInTheDocument();
    });

    it('displays multiple active filter badges', () => {
      mockState = { ...defaultState, q: 'algebra', subject: 'math', format: 'online' };

      render(<TutorFilters subjects={defaultSubjects} />);

      expect(screen.getByText(/search: "algebra"/i)).toBeInTheDocument();
      expect(screen.getByText(/subject: math/i)).toBeInTheDocument();
      expect(screen.getByText(/format: online/i)).toBeInTheDocument();
    });

    it('shows clear all button when filters are active', () => {
      mockState = { ...defaultState, q: 'test' };

      render(<TutorFilters subjects={defaultSubjects} />);

      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
    });

    it('hides filter badges when no filters are active', () => {
      render(<TutorFilters subjects={defaultSubjects} />);

      expect(screen.queryByText(/active filters:/i)).not.toBeInTheDocument();
    });
  });

  describe('filter removal', () => {
    it('removes search filter when badge is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      mockState = { ...defaultState, q: 'algebra' };

      render(<TutorFilters subjects={defaultSubjects} />);

      const removeButton = screen.getByRole('button', { name: /remove filter: search/i });
      await user.click(removeButton);

      expect(mockSetParams).toHaveBeenCalledWith({ q: null, page: 1 });
    });

    it('removes subject filter when badge is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      mockState = { ...defaultState, subject: 'physics' };

      render(<TutorFilters subjects={defaultSubjects} />);

      const removeButton = screen.getByRole('button', { name: /remove filter: subject/i });
      await user.click(removeButton);

      expect(mockSetParams).toHaveBeenCalledWith({ subject: null, page: 1 });
    });

    it('removes format filter when badge is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      mockState = { ...defaultState, format: 'offline' };

      render(<TutorFilters subjects={defaultSubjects} />);

      const removeButton = screen.getByRole('button', { name: /remove filter: format/i });
      await user.click(removeButton);

      expect(mockSetParams).toHaveBeenCalledWith({ format: null, page: 1 });
    });

    it('clears all filters when clear all is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      mockState = {
        q: 'test',
        subject: 'math',
        minPrice: 20,
        maxPrice: 100,
        format: 'online',
        ordering: 'hourly_rate',
        page: 3,
      };

      render(<TutorFilters subjects={defaultSubjects} />);

      const clearAllButton = screen.getByRole('button', { name: /clear all/i });
      await user.click(clearAllButton);

      expect(mockSetParams).toHaveBeenCalledWith({
        q: null,
        subject: null,
        minPrice: null,
        maxPrice: null,
        format: null,
        ordering: '-rating',
        page: 1,
      });
    });
  });

  describe('accessibility', () => {
    it('has accessible labels for all inputs', () => {
      render(<TutorFilters subjects={defaultSubjects} />);

      expect(screen.getByLabelText(/search tutors/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by subject/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by format/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
    });

    it('has aria-label for remove filter buttons', () => {
      mockState = { ...defaultState, q: 'test', subject: 'math' };

      render(<TutorFilters subjects={defaultSubjects} />);

      expect(screen.getByLabelText(/remove filter: search/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/remove filter: subject/i)).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty subjects array', () => {
      render(<TutorFilters subjects={[]} />);

      const subjectSelect = screen.getByRole('combobox', { name: /filter by subject/i });
      expect(subjectSelect).toBeInTheDocument();
    });

    it('handles subjects with special characters', () => {
      render(<TutorFilters subjects={['c++', 'c#', 'node.js']} />);

      expect(screen.getByRole('combobox', { name: /filter by subject/i })).toBeInTheDocument();
    });

    it('formats subject names with dashes correctly', () => {
      render(<TutorFilters subjects={['computer-science', 'data-science']} />);
    });

    it('handles long search queries', async () => {
      const user = userEvent.setup({ delay: null });

      render(<TutorFilters subjects={defaultSubjects} />);

      const searchInput = screen.getByPlaceholderText(/search by name or headline/i);
      const longQuery = 'a'.repeat(50); // Reduced for faster test
      await user.type(searchInput, longQuery);

      // Wait for debounce (500ms) + buffer
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      expect(mockSetParams).toHaveBeenCalledWith({ q: longQuery, page: 1 });
    });
  });

  describe('responsive layout', () => {
    it('renders with responsive flex layout', () => {
      const { container } = render(<TutorFilters subjects={defaultSubjects} />);

      const filterRow = container.querySelector('.flex');
      expect(filterRow).toBeInTheDocument();
    });
  });
});
