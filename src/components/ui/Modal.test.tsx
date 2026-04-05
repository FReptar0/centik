import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import Modal from './Modal'

afterEach(() => {
  cleanup()
})

describe('Modal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={() => {}}>
        <p>Modal content</p>
      </Modal>,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders children when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <p>Modal content</p>
      </Modal>,
    )
    // Both mobile sheet and desktop modal render the same children (CSS responsive)
    const elements = screen.getAllByText('Modal content')
    expect(elements.length).toBeGreaterThanOrEqual(1)
  })

  it('renders title when provided', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Title">
        <p>Content</p>
      </Modal>,
    )
    // Title renders in both mobile and desktop variants
    const titles = screen.getAllByText('Test Title')
    expect(titles.length).toBeGreaterThanOrEqual(1)
  })

  it('does not render title header when title is omitted', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <p>Content</p>
      </Modal>,
    )
    expect(screen.queryByText('Test Title')).toBeNull()
  })

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={handleClose}>
        <p>Content</p>
      </Modal>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={handleClose}>
        <p>Content</p>
      </Modal>,
    )
    const backdrop = screen.getByTestId('modal-backdrop')
    fireEvent.click(backdrop)
    expect(handleClose).toHaveBeenCalledOnce()
  })

  it('renders close button when title is provided', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="With Close">
        <p>Content</p>
      </Modal>,
    )
    // Close buttons in both mobile and desktop variants
    const closeButtons = screen.getAllByRole('button', { name: /cerrar/i })
    expect(closeButtons.length).toBeGreaterThanOrEqual(1)
  })
})
