import { Camera, User, X } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import {
  clearAvatar,
  getAvatar,
  initialsFromName,
  setAvatar,
} from "../lib/avatarStorage";

interface AvatarProps {
  userId: number;
  name: string;
  size?: "sm" | "md" | "lg";
  editable?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "h-9 w-9 text-[10px]",
  md: "h-14 w-14 text-sm",
  lg: "h-20 w-20 text-lg",
};

const iconSize = { sm: 16, md: 22, lg: 32 };

export function Avatar({
  userId,
  name,
  size = "md",
  editable = false,
  className = "",
}: AvatarProps) {
  const [src, setSrc] = useState<string | null>(() => getAvatar(userId));
  const inputRef = useRef<HTMLInputElement>(null);
  const initials = initialsFromName(name);

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 1_500_000) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setAvatar(userId, dataUrl);
      setSrc(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function remove() {
    clearAvatar(userId);
    setSrc(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={`relative inline-flex ${className}`}>
      <div
        className={`${sizeMap[size]} overflow-hidden rounded-full border border-line bg-surface-2`}
      >
        {src ? (
          <img src={src} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center">
            <User
              size={iconSize[size]}
              strokeWidth={1.5}
              className="absolute text-muted/35"
              aria-hidden
            />
          </div>
        )}
      </div>
      {editable && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
          />
          <div className="absolute -bottom-1 -right-1 flex gap-1">
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-content shadow-sm transition hover:border-accent/40 hover:text-accent"
              onClick={() => inputRef.current?.click()}
              title="Загрузить фото"
              aria-label="Загрузить фото"
            >
              <Camera size={14} strokeWidth={1.75} />
            </button>
            {src && (
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-sm transition hover:text-content"
                onClick={remove}
                title="Удалить фото"
                aria-label="Удалить фото"
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
