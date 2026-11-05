const key = (userId: number) => `danceflow_avatar_${userId}`;

export function getAvatar(userId: number): string | null {
  try {
    return localStorage.getItem(key(userId));
  } catch {
    return null;
  }
}

export function setAvatar(userId: number, dataUrl: string) {
  localStorage.setItem(key(userId), dataUrl);
}

export function clearAvatar(userId: number) {
  localStorage.removeItem(key(userId));
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
