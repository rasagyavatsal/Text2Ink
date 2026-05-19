import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import ContactPage from "../page"

vi.mock("@/components/InquiryForm", () => ({
  InquiryForm: () => <div data-testid="inquiry-form">Inquiry Form Mock</div>,
}))

describe("ContactPage", () => {
  it("renders the sparse header with Text2Ink on the left", () => {
    render(<ContactPage />)
    const header = screen.getByRole("banner")
    expect(header).toBeInTheDocument()
    // Text2Ink is split across spans: Text, 2, Ink
    expect(screen.getByText("Text")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText("Ink")).toBeInTheDocument()
  })

  it("renders ThemePicker and Back to Editor in the header", () => {
    render(<ContactPage />)
    expect(screen.getByRole("group", { name: /theme preference/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /back to editor/i })).toBeInTheDocument()
  })

  it("renders the InquiryForm", () => {
    render(<ContactPage />)
    expect(screen.getByTestId("inquiry-form")).toBeInTheDocument()
  })

  it("displays the correct fallback email", () => {
    render(<ContactPage />)
    const emailLinks = screen.getAllByText("rasagyavatsal16@gmail.com")
    expect(emailLinks.length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText("rasagyavatsal@outlook.com")).not.toBeInTheDocument()
  })

  it("renders Email me heading", () => {
    render(<ContactPage />)
    expect(screen.getByText("Email me")).toBeInTheDocument()
  })

  it("has the inquiry split layout structure on desktop", () => {
    const { container } = render(<ContactPage />)
    const splitLayout = container.querySelector(".lg\\:grid-cols-2")
    expect(splitLayout).toBeInTheDocument()
  })

  it("renders the footer with copyright", () => {
    render(<ContactPage />)
    expect(screen.getByRole("contentinfo")).toBeInTheDocument()
    expect(screen.getByText(/text2ink.*all rights reserved/i)).toBeInTheDocument()
  })
})
