/**
 * INTEGRATION TESTS — Auth Page
 * Tests the auth page component behaviour: tab switching,
 * form field visibility, and button states.
 * Supabase and router are mocked so no network calls are made.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

// Mock next/link
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock Supabase client — no real auth calls
const mockSignInWithPassword = jest.fn().mockResolvedValue({ error: null });
const mockSignUp = jest.fn().mockResolvedValue({ error: null });
const mockSignInWithOAuth = jest.fn().mockResolvedValue({ error: null });

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: mockSignInWithPassword,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
    },
  }),
}));

import AuthPage from "@/app/auth/page";

describe("Auth Page — Integration", () => {
  it("renders the sign in tab by default", () => {
    render(<AuthPage />);
    // There are two "Sign in" texts — the tab and the submit button
    expect(screen.getAllByText("Sign in").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("does not show name field on sign in mode", () => {
    render(<AuthPage />);
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
  });

  it("shows name field when switching to create account tab", () => {
    render(<AuthPage />);
    fireEvent.click(screen.getByText("Create account"));
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  });

  it("switches back to sign in mode", () => {
    render(<AuthPage />);
    fireEvent.click(screen.getByText("Create account"));
    fireEvent.click(screen.getByText("Sign in"));
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
  });

  it("shows Google sign in button", () => {
    render(<AuthPage />);
    expect(screen.getByText(/continue with google/i)).toBeInTheDocument();
  });

  it("sign in button is present", () => {
    render(<AuthPage />);
    // Multiple "Sign in" elements exist (tab + submit button)
    const btns = screen.getAllByRole("button", { name: /sign in/i });
    expect(btns.length).toBeGreaterThanOrEqual(1);
  });

  it("shows disclaimer text", () => {
    render(<AuthPage />);
    expect(screen.getByText(/not provide veterinary advice/i)).toBeInTheDocument();
  });

  it("shows error message on failed sign in", async () => {
    // Override the mock to return an error for this test
    mockSignInWithPassword.mockResolvedValueOnce({
      error: { message: "Invalid login credentials" },
    });

    render(<AuthPage />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "wrongpassword" },
    });
    // Click the submit button (last "Sign in" button in the DOM)
    const btns = screen.getAllByRole("button", { name: /^sign in$/i });
    fireEvent.click(btns[btns.length - 1]);

    await waitFor(() => {
      expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument();
    });
  });
});
