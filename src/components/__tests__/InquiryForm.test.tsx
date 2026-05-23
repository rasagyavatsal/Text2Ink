import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { InquiryForm } from "../InquiryForm"

const mockFetch = vi.fn()
global.fetch = mockFetch

if (typeof window !== "undefined" && window.Element) {
  window.Element.prototype.hasPointerCapture = () => false
  window.Element.prototype.setPointerCapture = () => {}
  window.Element.prototype.releasePointerCapture = () => {}
}

describe("InquiryForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ message: "ok" }) })
  })

  const selectTopic = async (user: any, topic: string) => {
    const topicTrigger = screen.getByRole("combobox", { name: /topic/i })
    fireEvent.click(topicTrigger)
    const topicOption = await screen.findByRole("option", { name: topic })
    fireEvent.click(topicOption)
  }

  it("renders all required fields", () => {
    render(<InquiryForm />)

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/topic/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /send inquiry/i })).toBeInTheDocument()
  })

  it("renders within a card layout with a title", () => {
    render(<InquiryForm />)
    expect(screen.getByText("Send a message")).toBeInTheDocument()
  })

  it("shows inline errors when submitting empty form", async () => {
    const user = userEvent.setup()
    render(<InquiryForm />)

    await user.click(screen.getByRole("button", { name: /send inquiry/i }))

    await waitFor(() => {
      expect(screen.getByText(/name must be at least/i)).toBeInTheDocument()
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/topic is required/i)).toBeInTheDocument()
      expect(screen.getByText(/message must be at least/i)).toBeInTheDocument()
    })

    // Should NOT have called fetch
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("preserves entered values after validation failure", async () => {
    const user = userEvent.setup()
    render(<InquiryForm />)

    await user.type(screen.getByLabelText(/name/i), "Jane")
    await user.type(screen.getByLabelText(/email/i), "bad-email")
    await user.type(screen.getByLabelText(/message/i), "Hi")

    await user.click(screen.getByRole("button", { name: /send inquiry/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toHaveValue("Jane")
      expect(screen.getByLabelText(/email/i)).toHaveValue("bad-email")
      expect(screen.getByLabelText(/message/i)).toHaveValue("Hi")
    })
  })

  it("shows success state after successful submission", async () => {
    const user = userEvent.setup()
    render(<InquiryForm />)

    await user.type(screen.getByLabelText(/name/i), "Jane Doe")
    await user.type(screen.getByLabelText(/email/i), "jane@example.com")
    await selectTopic(user, "General inquiry")
    await user.type(screen.getByLabelText(/message/i), "I have a question about your product.")

    await user.click(screen.getByRole("button", { name: /send inquiry/i }))

    await waitFor(() => {
      expect(screen.getByText(/thank you/i)).toBeInTheDocument()
      const sendAnotherButton = screen.getByRole("button", { name: /send another inquiry/i });
      expect(sendAnotherButton).toBeInTheDocument()
      expect(sendAnotherButton).toHaveAttribute('data-variant', 'brand')
    })
    
    // Check for success icon
    const checkIcon = document.querySelector('svg.text-success');
    expect(checkIcon).toBeInTheDocument();

    // Form should no longer be visible
    expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument()
  })

  it("resets form when 'Send another inquiry' is clicked", async () => {
    const user = userEvent.setup()
    render(<InquiryForm />)

    // Fill and submit
    await user.type(screen.getByLabelText(/name/i), "Jane Doe")
    await user.type(screen.getByLabelText(/email/i), "jane@example.com")
    await selectTopic(user, "General inquiry")
    await user.type(screen.getByLabelText(/message/i), "I have a question about your product.")
    await user.click(screen.getByRole("button", { name: /send inquiry/i }))

    await waitFor(() => {
      expect(screen.getByText(/thank you/i)).toBeInTheDocument()
    })

    // Click "Send another inquiry"
    await user.click(screen.getByRole("button", { name: /send another inquiry/i }))

    // Form should be back with empty fields
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toHaveValue("")
  })

  it("shows exact 429 error copy", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: "Too many inquiries. Please try again later." }),
    })

    const user = userEvent.setup()
    render(<InquiryForm />)

    await user.type(screen.getByLabelText(/name/i), "Jane Doe")
    await user.type(screen.getByLabelText(/email/i), "jane@example.com")
    await selectTopic(user, "General inquiry")
    await user.type(screen.getByLabelText(/message/i), "I have a question about your product.")
    await user.click(screen.getByRole("button", { name: /send inquiry/i }))

    await waitFor(() => {
      expect(screen.getByText("Too many inquiries. Please try again later.")).toBeInTheDocument()
    })

    // Form should still be visible with values preserved
    expect(screen.getByLabelText(/name/i)).toHaveValue("Jane Doe")
  })

  it("shows generic error on server failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Failed to process inquiry" }),
    })

    const user = userEvent.setup()
    render(<InquiryForm />)

    await user.type(screen.getByLabelText(/name/i), "Jane Doe")
    await user.type(screen.getByLabelText(/email/i), "jane@example.com")
    await selectTopic(user, "General inquiry")
    await user.type(screen.getByLabelText(/message/i), "I have a question about your product.")
    await user.click(screen.getByRole("button", { name: /send inquiry/i }))

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    })
  })

  it("does not use alert() for errors", async () => {
    const alertSpy = vi.spyOn(window, "alert")
    mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: "fail" }) })

    const user = userEvent.setup()
    render(<InquiryForm />)

    await user.type(screen.getByLabelText(/name/i), "Jane Doe")
    await user.type(screen.getByLabelText(/email/i), "jane@example.com")
    await selectTopic(user, "General inquiry")
    await user.type(screen.getByLabelText(/message/i), "I have a question about your product.")
    await user.click(screen.getByRole("button", { name: /send inquiry/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    expect(alertSpy).not.toHaveBeenCalled()
    alertSpy.mockRestore()
  })

  it("includes a hidden honeypot field", () => {
    render(<InquiryForm />)

    const honeypot = document.querySelector('input[name="website"]')
    expect(honeypot).toBeInTheDocument()
    expect(honeypot).toHaveAttribute("aria-hidden", "true")
    expect(honeypot).toHaveAttribute("tabindex", "-1")
  })

  it("renders the three topic options", async () => {
    render(<InquiryForm />)

    const topicSelect = screen.getByRole("combobox", { name: /topic/i })
    expect(topicSelect).toBeInTheDocument()
    
    // Open the dropdown
    fireEvent.click(topicSelect)

    // Check that the select has the right options
    expect(await screen.findByRole("option", { name: "General inquiry" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Bug report" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Feature request" })).toBeInTheDocument()
  })

  it("uses canonical Input and Textarea components", () => {
    render(<InquiryForm />)

    const nameInput = screen.getByLabelText(/name/i)
    const emailInput = screen.getByLabelText(/email/i)
    const messageTextarea = screen.getByLabelText(/message/i)

    expect(nameInput).toHaveAttribute("data-slot", "input")
    expect(emailInput).toHaveAttribute("data-slot", "input")
    expect(messageTextarea).toHaveAttribute("data-slot", "textarea")
  })
})
