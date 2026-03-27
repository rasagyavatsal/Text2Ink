import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import FeedbackDialog from '../FeedbackDialog';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('FeedbackDialog', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true });
    vi.useRealTimers();
  });

  it('submit button is disabled until a rating is selected', () => {
    render(<FeedbackDialog isOpen={true} onClose={onClose} />);
    
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    expect(submitButton).toBeDisabled();

    const stars = screen.getAllByRole('button').filter(b => b.querySelector('svg'));
    fireEvent.click(stars[2]); // 3 stars

    expect(submitButton).not.toBeDisabled();
  });

  it('successful submit shows thank-you state and calls onClose after timeout', async () => {
    vi.useFakeTimers();
    render(<FeedbackDialog isOpen={true} onClose={onClose} />);
    
    const stars = screen.getAllByRole('button').filter(b => b.querySelector('svg'));
    fireEvent.click(stars[4]); // 5 stars
    
    const textarea = screen.getByPlaceholderText(/what we can do better/i);
    fireEvent.change(textarea, { target: { value: 'Great app!' } });

    const featureTextarea = screen.getByPlaceholderText(/share your ideas/i);
    fireEvent.change(featureTextarea, { target: { value: 'Add more fonts' } });

    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    
    // We need to wrap the async action that triggers state changes
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/feedback', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ rating: 5, improvement: 'Great app!', featureRequest: 'Add more fonts' }),
    }));

    // Wait for the submitted state using real timers first if needed, 
    // but since we mocked fetch to resolve immediately, it should be there.
    expect(screen.getByText(/thank you/i)).toBeInTheDocument();

    // Advance timers for the 2s timeout
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('failed submit shows alert', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockFetch.mockResolvedValueOnce({ ok: false });

    render(<FeedbackDialog isOpen={true} onClose={onClose} />);
    
    const stars = screen.getAllByRole('button').filter(b => b.querySelector('svg'));
    fireEvent.click(stars[0]); // 1 star

    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to send feedback'));
    alertSpy.mockRestore();
  });

  it('disables spellcheck on feedback textareas', () => {
    render(<FeedbackDialog isOpen={true} onClose={onClose} />);
    
    const improvementTextarea = screen.getByPlaceholderText(/what we can do better/i);
    const featureTextarea = screen.getByPlaceholderText(/share your ideas/i);
    
    expect(improvementTextarea.getAttribute('spellcheck')).toBe('false');
    expect(featureTextarea.getAttribute('spellcheck')).toBe('false');
  });
});
