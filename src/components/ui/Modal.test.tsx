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

  it('renders headerContent when provided instead of title', () => {
    render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Should Not Render"
        headerContent={<div data-testid="custom-header">Custom Header</div>}
      >
        <p>Content</p>
      </Modal>,
    )
    const customHeaders = screen.getAllByTestId('custom-header')
    expect(customHeaders.length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Should Not Render')).toBeNull()
  })

  it('mobile sheet has 85vh max height', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}}>
        <p>Content</p>
      </Modal>,
    )
    // The mobile sheet is the div with role="dialog" that has md:hidden
    const dialogs = container.querySelectorAll('[role="dialog"]')
    const mobileSheet = Array.from(dialogs).find((el) =>
      el.className.includes('md:hidden'),
    )
    expect(mobileSheet).toBeDefined()
    expect(mobileSheet?.className).toContain('max-h-[85vh]')
  })

  it('mobile sheet has 24px top border radius', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}}>
        <p>Content</p>
      </Modal>,
    )
    const dialogs = container.querySelectorAll('[role="dialog"]')
    const mobileSheet = Array.from(dialogs).find((el) =>
      el.className.includes('md:hidden'),
    )
    expect(mobileSheet).toBeDefined()
    expect(mobileSheet?.className).toContain('rounded-t-[24px]')
  })
})
