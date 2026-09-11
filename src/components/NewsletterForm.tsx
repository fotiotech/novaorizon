// components/NewsletterForm.tsx
"use client";

import React, { useState } from "react";
import { subscribeToNewsletter } from "@/app/actions/newsletter";

type State = "idle" | "submitting" | "success" | "error";

const NewsletterForm = () => {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "submitting") return;

    setState("submitting");
    setFeedback(null);

    const result = await subscribeToNewsletter({
      email,
      source: "footer",
    });

    if (result.success) {
      setState("success");
      setFeedback(result.message || "Thanks for subscribing!");
      setEmail("");
    } else {
      setState("error");
      setFeedback(result.error || "Something went wrong.");
    }
  };

  return (
    <div className="w-full max-w-xs">
      <p className="font-medium text-sm mb-2 text-foreground">
        Subscribe to our newsletter
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state !== "idle") {
              setState("idle");
              setFeedback(null);
            }
          }}
          placeholder="Your email address"
          disabled={state === "submitting"}
          className="flex-1 px-4 py-2 rounded-t-lg sm:rounded-l-lg sm:rounded-t-none border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={state === "submitting"}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-b-lg sm:rounded-r-lg sm:rounded-b-none hover:bg-primary/90 transition-colors font-medium text-sm disabled:opacity-60"
        >
          {state === "submitting" ? "..." : "Subscribe"}
        </button>
      </form>

      {feedback && (
        <p
          className={`mt-2 text-xs ${
            state === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {feedback}
        </p>
      )}
    </div>
  );
};

export default NewsletterForm;
