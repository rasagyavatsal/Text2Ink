import fs from "node:fs"
import path from "node:path"
import { describe, it, expect, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import ContactPage from "../page"

vi.mock("@/components/InquiryForm", () => ({
  InquiryForm: () => <div data-testid="inquiry-form">Inquiry Form Mock</div>,
}))

vi.mock("@/components/ThemePicker", () => ({
  default: () => <div data-testid="theme-picker" />
}))

const contactPageSource = fs.readFileSync(
  path.resolve(__dirname, "../page.tsx"),
  "utf-8",
)

describe("ContactPage", () => {
  it("keeps the contact page frame local to the route module", () => {
    expect(contactPageSource).not.toMatch(/StandardPageShell/)
    expect(contactPageSource).toMatch(/<header\b/)
    expect(contactPageSource).toMatch(/<main\b/)
    expect(contactPageSource).toMatch(/<footer\b/)
  })

  it("renders the sparse header with Text2Ink on the left", () => {
    render(<ContactPage />)
    const header = screen.getByRole("banner")
    expect(header).toBeInTheDocument()
    // Text2Ink is now a single string
    expect(within(header).getByText("Text2Ink")).toBeInTheDocument()
  })

  it("renders ThemePicker and Back to Editor in the header", () => {
    render(<ContactPage />)
    expect(screen.getByTestId("theme-picker")).toBeInTheDocument()
    const backLink = screen.getByRole("link", { name: /back to editor/i })
    expect(backLink).toBeInTheDocument()
    expect(backLink).toHaveAttribute("href", "/editor")
    expect(backLink).toHaveAttribute("data-variant", "brand")
    expect(backLink).toHaveAttribute("data-size", "chrome")
  })

  it("renders the InquiryForm", () => {
    render(<ContactPage />)
    expect(screen.getByTestId("inquiry-form")).toBeInTheDocument()
  })

  it("displays the correct fallback email and removes the duplicated desktop placement", () => {
    render(<ContactPage />)
    const emailLinks = screen.getAllByText("rasagyavatsal16@gmail.com")
    expect(emailLinks).toHaveLength(1)
    expect(screen.queryByText("rasagyavatsal@outlook.com")).not.toBeInTheDocument()
  })

  it("renders Email me heading", () => {
    render(<ContactPage />)
    expect(screen.getByText("Email me")).toBeInTheDocument()
  })

  it("renders the concise and personal intro copy", () => {
    render(<ContactPage />)
    expect(
      screen.getByText(/question, bug report, or feature request.*I'll get back to you/i)
    ).toBeInTheDocument()
  })

  it("renders the Mail icon with the email address", () => {
    render(<ContactPage />)
    expect(screen.getByTestId("mail-icon")).toBeInTheDocument()
  })

  it("has a single centered column layout", () => {
    const { container } = render(<ContactPage />)
    const splitLayout = container.querySelector(String.raw`.lg\:grid-cols-2`)
    expect(splitLayout).not.toBeInTheDocument()
    const centeredColumn = container.querySelector(String.raw`.mx-auto`)
    expect(centeredColumn).toBeInTheDocument()
    expect(centeredColumn?.className).toContain("max-w-")
  })

  it("renders the footer with copyright", () => {
    render(<ContactPage />)
    expect(screen.getByRole("contentinfo")).toBeInTheDocument()
    expect(screen.getByText(/text2ink.*all rights reserved/i)).toBeInTheDocument()
  })

  it("uses a full-height page background wrapper", () => {
    const { container } = render(<ContactPage />)
    const wrapper = container.firstElementChild
    expect(wrapper?.className).toContain("min-h-screen")
    expect(wrapper?.className).toContain("bg-background")
  })

  it("renders header and footer as semantic landmarks", () => {
    render(<ContactPage />)
    const banner = screen.getByRole("banner")
    const contentinfo = screen.getByRole("contentinfo")
    expect(banner.tagName.toLowerCase()).toBe("header")
    expect(contentinfo.tagName.toLowerCase()).toBe("footer")
  })
})
