import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ProjectCard from './ProjectCard';

vi.mock('axios');

function renderCard(project) {
  return render(
    <MemoryRouter>
      <ProjectCard
        project={{
          id: 1,
          name: 'L4/L5 Habitat',
          description: 'A habitat at Earth-Moon Lagrange points.',
          objectives: 'The habitat should be self-sustaining for a nominal population of 1,000,000 humans plus wildlife.',
          constraints: 'Stay within cislunar logistics.',
          is_active: true,
          updated_at: '2026-01-08T00:00:00.000Z',
          document_count: 3,
          pinned_count: 2,
          ...project,
        }}
        onDelete={() => {}}
      />
    </MemoryRouter>
  );
}

describe('ProjectCard', () => {
  it('shows full objectives instead of a 100-character cut', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: 'L4/L5 Habitat' })).toBeInTheDocument();
    expect(
      screen.getByText(/self-sustaining for a nominal population of 1,000,000 humans/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/\.\.\.$/)).not.toBeInTheDocument();
    expect(screen.getByText('3 documents')).toBeInTheDocument();
    expect(screen.getByText('2 pinned')).toBeInTheDocument();
    expect(screen.getByText('0 saved exchanges')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open workspace' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Query in chat' })).toBeInTheDocument();
  });

  it('shows saved exchange counts from the project list API', () => {
    renderCard({ message_count: 4 });
    expect(screen.getByText('2 saved exchanges')).toBeInTheDocument();
  });

  it('does not open the workspace when delete is clicked', () => {
    window.confirm = vi.fn(() => false);
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(window.confirm).toHaveBeenCalled();
  });
});
