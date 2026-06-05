"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, Textarea } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { CheckCircle2 } from "lucide-react"

import { ALLOWED_TOPICS as TOPICS, isValidEmail } from "inquiry-validation"

interface FormData {
  name: string
  email: string
  topic: string
  message: string
}

interface FormErrors {
  name?: string
  email?: string
  topic?: string
  message?: string
  submit?: string
}

function validateClient(data: FormData): FormErrors {
  const errors: FormErrors = {}
  if (data.name.trim().length < 2) errors.name = "Name must be at least 2 characters"
  if (!data.email.trim()) errors.email = "Email is required"
  else if (!isValidEmail(data.email))
    errors.email = "Invalid email format"
  if (!data.topic) errors.topic = "Topic is required"
  if (data.message.trim().length < 10) errors.message = "Message must be at least 10 characters"
  return errors
}

export function InquiryForm() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    topic: "",
    message: "",
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  function handleChange(field: keyof FormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear field error on change
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const clientErrors = validateClient(formData)
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    setErrors({})
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          topic: formData.topic,
          message: formData.message.trim(),
          website: "", // honeypot
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (res.status === 429) {
          setErrors({ submit: "Too many inquiries. Please try again later." })
        } else if (data.errors) {
          setErrors(data.errors)
        } else {
          setErrors({ submit: "Something went wrong. Please try again." })
        }
        return
      }

      setIsSuccess(true)
    } catch {
      setErrors({ submit: "Something went wrong. Please try again." })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleReset() {
    setFormData({ name: "", email: "", topic: "", message: "" })
    setErrors({})
    setIsSuccess(false)
  }

  if (isSuccess) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
          <CheckCircle2 className="w-16 h-16 text-success" />
          <div className="space-y-2">
            <h3 className="font-semibold text-xl">Thank you</h3>
            <p className="text-body text-muted-foreground max-w-sm px-4">
              Your inquiry has been received. We&apos;ll get back to you soon.
            </p>
          </div>
          <Button variant="brand" onClick={handleReset} className="mt-6">
            Send another inquiry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Send a message</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Honeypot — hidden from users */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] opacity-0 h-0 w-0"
      />

      <div>
        <Label htmlFor="inquiry-name">Name</Label>
        <Input
          id="inquiry-name"
          type="text"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Your name"
          className={cn("mt-1.5", errors.name && "border-destructive")}
          maxLength={100}
        />
        {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
      </div>

      <div>
        <Label htmlFor="inquiry-email">Email</Label>
        <Input
          id="inquiry-email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          placeholder="you@example.com"
          className={cn("mt-1.5", errors.email && "border-destructive")}
          maxLength={254}
        />
        {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
      </div>

      <div>
        <Label htmlFor="inquiry-topic">Topic</Label>
        <Select
          value={formData.topic}
          onValueChange={(value) => handleChange("topic", value)}
        >
          <SelectTrigger
            id="inquiry-topic"
            className={cn("mt-1.5", errors.topic && "border-destructive")}
          >
            <SelectValue placeholder="Select a topic" />
          </SelectTrigger>
          <SelectContent>
            {TOPICS.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.topic && <p className="text-sm text-destructive mt-1">{errors.topic}</p>}
      </div>

      <div>
        <Label htmlFor="inquiry-message">Message</Label>
        <Textarea
          id="inquiry-message"
          value={formData.message}
          onChange={(e) => handleChange("message", e.target.value)}
          placeholder="How can we help?"
          rows={5}
          spellCheck={false}
          className={cn("mt-1.5 min-h-[80px]", errors.message && "border-destructive")}
          maxLength={5000}
        />
        {errors.message && <p className="text-sm text-destructive mt-1">{errors.message}</p>}
      </div>

      {errors.submit && (
        <p className="text-sm text-destructive text-center mt-2">{errors.submit}</p>
      )}

      <Button type="submit" className="w-full mt-2" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Sending..." : "Send inquiry"}
      </Button>
        </form>
      </CardContent>
    </Card>
  )
}
