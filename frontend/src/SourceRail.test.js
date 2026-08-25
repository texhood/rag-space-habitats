import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SourceRail from './SourceRail';

describe('SourceRail', () => {
  it('links a cited paper into the library', () => {
    render(
      <MemoryRouter>
        <SourceRail
          sources={[
            {
              index: 1,
              title: 'Space Settlements: A Design Study',
              source: 'NASA NTRS',
              href: '/browse?doc=abc123'
            }
          ]}
        />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: /Space Settlements/i });
    expect(link).toHaveAttribute('href', '/browse?doc=abc123');
    expect(screen.getByText('NASA NTRS')).toBeInTheDocument();
  });
});
