"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Bot, User, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function PetChatPage() {
  const { id } = useParams<{ id: string }>();
  const [petName, setPetName] = useState("your pet");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [userName, setUserName] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email);
      setUserName(user.user_metadata?.full_name);
      const { data: { session } } = await supabase.auth.getSession();
      setToken(session?.access_token ?? null);
      const { data: pet } = await supabase.from("pets").select("name").eq("id", id).single();
      if (pet) setPetName(pet.name);
    }
    init();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pets/${id}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!res.ok) throw new Error("Failed to get response");
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't process that. Please try again." }]);
    }
    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex flex-col">
      <Nav userEmail={userEmail} userName={userName} userRole="owner" />

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-8 flex flex-col">
        <Link href={`/pets/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to {petName}
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
          <div className="bg-gradient-to-r from-violet-500 to-purple-500 h-2" />
          <div className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Ask the AI about {petName}</h1>
              <p className="text-xs text-gray-500">Powered by Gemini · Based on {petName}&apos;s health history</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 mb-4 min-h-[300px]">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm mb-2">Ask me anything about {petName}&apos;s health.</p>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {[
                  `What symptoms has ${petName} shown recently?`,
                  `Any patterns in the health logs?`,
                  `Should I be concerned about anything?`,
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); }}
                    className="text-xs bg-white border border-gray-200 hover:border-violet-300 hover:text-violet-700 rounded-full px-3 py-1.5 text-gray-600 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-violet-600" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-emerald-600 text-white rounded-br-sm"
                  : "bg-white border border-gray-100 shadow-sm text-gray-700 rounded-bl-sm"
              }`}>
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-emerald-700" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-violet-600" />
              </div>
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="bg-white rounded-2xl border border-gray-200 shadow-sm flex items-end gap-3 p-3">
          <Textarea
            placeholder={`Ask about ${petName}'s health...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="flex-1 resize-none border-0 shadow-none focus-visible:ring-0 min-h-[40px] text-sm p-1"
          />
          <Button type="submit" size="sm" disabled={loading || !input.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 h-9 w-9 p-0">
            <Send className="w-4 h-4" />
          </Button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-3">Not a substitute for veterinary advice. Always consult your vet for medical decisions.</p>
      </main>
    </div>
  );
}
