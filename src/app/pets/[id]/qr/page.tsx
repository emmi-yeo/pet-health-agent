"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, QrCode } from "lucide-react";
import QRCode from "qrcode";

export default function PetQrPage() {
  const { id } = useParams<{ id: string }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [petName, setPetName] = useState("Pet");
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [userName, setUserName] = useState<string | undefined>();

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
        setUserName(user.user_metadata?.full_name);
      }
      const { data: pet } = await supabase.from("pets").select("name").eq("id", id).single();
      if (pet) setPetName(pet.name);
    }
    init();
  }, [id]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const url = `${window.location.origin}/pets/${id}`;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 280,
      margin: 2,
      color: { dark: "#065f46", light: "#ffffff" },
    });
  }, [id]);

  function handleDownload() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `${petName.toLowerCase().replace(/\s+/g, "-")}-qr.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <Nav userEmail={userEmail} userName={userName} userRole="owner" />

      <main className="max-w-md mx-auto px-6 py-10">
        <Link href={`/pets/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to {petName}
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2" />
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-6 h-6 text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">{petName}&apos;s QR Code</h1>
            <p className="text-sm text-gray-500 mb-6">
              Scan at the clinic to open {petName}&apos;s health profile.
            </p>

            <div className="flex justify-center mb-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 inline-block">
                <canvas ref={canvasRef} />
              </div>
            </div>

            <Button onClick={handleDownload} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Download className="w-4 h-4" />
              Download PNG
            </Button>

            <p className="text-xs text-gray-400 mt-4">
              This QR code links directly to {petName}&apos;s PawLog profile.<br />
              The vet must have an accepted share to view full records.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
