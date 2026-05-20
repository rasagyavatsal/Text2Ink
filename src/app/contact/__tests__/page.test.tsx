import { describe, it, expect, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import ContactPage from "../page"

vi.mock("@/components/InquiryForm", () => ({
  InquiryForm: () => <div data-testid="inquiry-form">Inquiry Form Mock</div>,
}))

vi.mock("@/components/ThemePicker", () => ({
  default: () => <div data-testid="theme-picker" />
}))

describe("ContactPage", () => {
  it("renders the sparse header with Text2Ink on the left", () => {
    render(<ContactPage />)
    const header = screen.getByRole("banner")
    expect(header).toBeInTheDocument()
    // Text2Ink is split across spans: Text, 2, Ink
    expect(within(header).getByText("Text")).toBeInTheDocument()
    expect(within(header).getByText("2")).toBeInTheDocument()
    expect(within(header).getByText("Ink")).toBeInTheDocument()
  })

  it("renders ThemePicker and Back to Editor in the header", () => {
    render(<ContactPage />)
    expect(screen.getByTestId("theme-picker")).toBeInTheDocument()
    const backLink = screen.getByRole("link", { name: /back to editor/i })
    expect(backLink).toBeInTheDocument()
    expect(backLink).toHaveAttribute("href", "/editor")
    expect(backLink).toHaveAttribute("data-variant", "brand")
    expect(backLink).toHaveAttribute("data-size", "sm")
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

  it("uses StandardPageShell with min-h-screen wrapper", () => {
    const { container } = render(<ContactPage />)
    const wrapper = container.firstElementChild
    expect(wrapper?.className).toContain("min-h-screen")
    expect(wrapper?.className).toContain("bg-background")
  })

  it("renders header and footer as semantic landmarks inside the shell", () => {
    render(<ContactPage />)
    const banner = screen.getByRole("banner")
    const contentinfo = screen.getByRole("contentinfo")
    // Header and footer should be direct children of the shell wrapper
    expect(banner.tagName.toLowerCase()).toBe("header")
    expect(contentinfo.tagName.toLowerCase()).toBe("footer")
  })
})
