import { fireEvent, render, screen } from '@testing-library/react';
import axios from 'axios';
import { describe, expect, it, vi } from 'vitest';
import SubmitContent from './SubmitContent';

vi.mock('axios');

describe('SubmitContent', () => {
  it('defaults the license to private', () => {
    render(<SubmitContent user={{ id: 7, username: 'robin' }} onClose={() => {}} />);

    expect(screen.getByRole('radio', { name: /Private \(All Rights Reserved\)/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /CC BY 4\.0/i })).not.toBeChecked();
  });

  it('submits as private unless the author picks a public license', async () => {
    axios.post.mockResolvedValue({ data: { message: 'ok' } });

    render(<SubmitContent user={{ id: 7, username: 'robin' }} onClose={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText('Enter document title'), {
      target: { value: 'Rotation notes' },
    });
    fireEvent.change(screen.getByPlaceholderText('Paste or type your document content here...'), {
      target: { value: 'Keep this draft off the public index.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit for Review' }));

    expect(axios.post).toHaveBeenCalled();
    const body = axios.post.mock.calls[0][1];
    expect(body.get('license')).toBe('private');
  });
});
