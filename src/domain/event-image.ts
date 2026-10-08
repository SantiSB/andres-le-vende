export const EVENT_FLYERS_BUCKET = "event-flyers";
const FLYER_PATH = /^flyers\/[0-9a-f-]{36}\.webp$/i;

function storagePrefix() {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!projectUrl) return null;
  return `${new URL(projectUrl).origin}/storage/v1/object/public/${EVENT_FLYERS_BUCKET}/`;
}

export function managedFlyerPath(url: string): string | null {
  const prefix = storagePrefix();
  if (!prefix || !url.startsWith(prefix)) return null;
  const path = url.slice(prefix.length);
  return FLYER_PATH.test(path) ? path : null;
}

export function validEventImage(value: string) {
  return (
    value === "" ||
    (value.startsWith("/") &&
      !value.startsWith("//") &&
      !value.includes("..")) ||
    managedFlyerPath(value) !== null
  );
}
