import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LandingPage from './LandingPage';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(() => Promise.reject(new Error('unauthenticated'))),
    post: vi.fn(),
  },
}));

describe('LandingPage', () => {
  it('renders the product headline', async () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/finally queryable/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/Create an account/i)).not.toBeInTheDocument();
    });
  });

  it('opens registration from Get access', async () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const [getAccess] = screen.getAllByRole('button', { name: 'Get access' });
    getAccess.click();
    expect(await screen.findByRole('heading', { name: 'Create an account' })).toBeInTheDocument();
  });
});
