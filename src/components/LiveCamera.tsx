import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, X } from "lucide-react";

interface Props {
  facing?: "user" | "environment";
  onCapture: (file: File) => void;
  label?: string;
}

/**
 * Live camera capture (no gallery access).
 * Streams the device camera and produces a JPEG File on capture.
 */
export function LiveCamera({ facing = "user", onCapture, label = "Tirar foto" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>("");
  const [preview, setPreview] = useState<string>("");
  const [currentFacing, setCurrentFacing] = useState<"user" | "environment">(facing);

  async function start(face: "user" | "environment") {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: face }, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e: any) {
      setError("Não foi possível acessar a câmera: " + (e.message ?? e));
    }
  }

  function stop() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    if (open) start(currentFacing);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentFacing]);

  function capture() {
    const v = videoRef.current; if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    canvas.getContext("2d")!.drawImage(v, 0, 0);
    canvas.toBlob(b => {
      if (!b) return;
      const file = new File([b], `foto-${Date.now()}.jpg`, { type: "image/jpeg" });
      setPreview(URL.createObjectURL(b));
      onCapture(file);
      stop();
      setOpen(false);
    }, "image/jpeg", 0.85);
  }

  if (!open) {
    return (
      <div className="space-y-2">
        <Button type="button" variant="outline" onClick={() => setOpen(true)} className="w-full">
          <Camera className="h-4 w-4 mr-2" /> {preview ? "Tirar outra" : label}
        </Button>
        {preview && <img src={preview} alt="Pré-visualização" className="w-full rounded-lg max-h-48 object-contain bg-muted" />}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between p-3 text-white">
        <span className="text-sm font-semibold">Câmera ao vivo</span>
        <button onClick={() => { stop(); setOpen(false); }} aria-label="Fechar"><X className="h-6 w-6" /></button>
      </div>
      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
        {error && <div className="absolute inset-x-4 top-4 bg-destructive text-destructive-foreground text-sm p-3 rounded">{error}</div>}
      </div>
      <div className="p-4 flex items-center justify-center gap-6 bg-black">
        <Button type="button" variant="outline" size="icon" onClick={() => setCurrentFacing(f => f === "user" ? "environment" : "user")}>
          <RotateCcw className="h-5 w-5" />
        </Button>
        <button onClick={capture} className="h-16 w-16 rounded-full bg-white border-4 border-white/40 active:scale-95 transition" aria-label="Capturar" />
        <div className="w-10" />
      </div>
    </div>
  );
}
