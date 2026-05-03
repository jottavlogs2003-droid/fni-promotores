import { supabase } from "@/integrations/supabase/client";

const KEY = "fni_offline_checkins_v1";

export type OfflineCheckIn = {
  id: string;
  promotor_id: string;
  loja_id: string;
  latitude_entrada: number;
  longitude_entrada: number;
  distancia_metros: number | null;
  selfieDataUrl: string;        // base64 da selfie
  selfieName: string;
  created_local_at: string;
};

function read(): OfflineCheckIn[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(items: OfflineCheckIn[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function pendingCount(): number {
  return read().length;
}

export async function enqueueCheckIn(data: Omit<OfflineCheckIn, "id" | "created_local_at">) {
  const items = read();
  items.push({ ...data, id: crypto.randomUUID(), created_local_at: new Date().toISOString() });
  write(items);
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

let syncing = false;
export async function syncQueue(): Promise<{ ok: number; fail: number }> {
  if (syncing) return { ok: 0, fail: 0 };
  syncing = true;
  let ok = 0, fail = 0;
  try {
    const items = read();
    const remain: OfflineCheckIn[] = [];
    for (const it of items) {
      try {
        const blob = await dataUrlToBlob(it.selfieDataUrl);
        const path = `${it.promotor_id}/${Date.now()}-${it.selfieName}`;
        const up = await supabase.storage.from("selfies-checkin").upload(path, blob, { contentType: "image/jpeg" });
        if (up.error) throw up.error;
        const ins = await supabase.from("check_ins").insert({
          promotor_id: it.promotor_id,
          loja_id: it.loja_id,
          latitude_entrada: it.latitude_entrada,
          longitude_entrada: it.longitude_entrada,
          selfie_url: path,
          distancia_metros: it.distancia_metros,
        });
        if (ins.error) throw ins.error;
        ok++;
      } catch {
        fail++;
        remain.push(it);
      }
    }
    write(remain);
  } finally {
    syncing = false;
  }
  return { ok, fail };
}

export function startAutoSync() {
  if (typeof window === "undefined") return;
  const trigger = () => { if (navigator.onLine) syncQueue(); };
  window.addEventListener("online", trigger);
  // tenta a cada 60s caso esteja online
  setInterval(trigger, 60_000);
  trigger();
}
