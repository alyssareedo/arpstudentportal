import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Gmail-style initials: "John Smith" -> "JS", "Suteeraporn" -> "S". */
export function initialsOf(name?: string | null, fallback = "?") {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const TONES = [
  "bg-primary/15 text-primary",
  "bg-accent/15 text-accent",
  "bg-success/15 text-success",
  "bg-warning/20 text-warning",
  "bg-secondary text-secondary-foreground",
  "bg-muted text-foreground",
];

function toneFor(name?: string | null) {
  const s = name ?? "";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return TONES[h % TONES.length];
}

/**
 * Avatar that shows the uploaded picture when present, otherwise a coloured
 * initials circle derived from the current name (auto-updates on rename).
 */
export function UserAvatar({
  name,
  src,
  className,
  fallbackText,
}: {
  name?: string | null;
  src?: string | null;
  className?: string;
  fallbackText?: string;
}) {
  return (
    <Avatar className={cn("h-10 w-10", className)}>
      {src ? <AvatarImage src={src} alt={name ?? "Profile picture"} /> : null}
      <AvatarFallback className={cn("font-semibold", toneFor(name))}>
        {fallbackText ?? initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  );
}

/** Avatar with an upload/remove control — used by students on their own
 *  profile and by admins/teachers on a student's profile. */
export function EditableUserAvatar({
  userId,
  name,
  src,
  className,
  onChanged,
}: {
  userId: string;
  name?: string | null;
  src?: string | null;
  className?: string;
  onChanged?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: pErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
      if (pErr) throw pErr;
      toast.success("Profile picture updated");
      onChanged?.();
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removePicture = async () => {
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Picture removed — showing initials");
    onChanged?.();
  };

  return (
    <div className="relative inline-block">
      <UserAvatar name={name} src={src} className={cn("h-24 w-24 text-2xl ring-4 ring-background shadow-elegant", className)} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-elegant ring-2 ring-background transition hover:opacity-90 disabled:opacity-60"
        aria-label="Change profile picture"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
      </button>
      {src && (
        <button
          type="button"
          onClick={removePicture}
          disabled={busy}
          className="absolute -top-1 -right-1 rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-elegant ring-1 ring-border hover:text-foreground"
        >
          Remove
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={upload} />
    </div>
  );
}
