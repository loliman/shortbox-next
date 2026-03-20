const SESSION_INVALID_EVENT = "shortbox:session-invalid";

export function notifySessionInvalid() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SESSION_INVALID_EVENT));
}

export function subscribeSessionInvalid(listener: () => void) {
  if (typeof window === "undefined") return () => {};

  const wrapped = () => listener();
  window.addEventListener(SESSION_INVALID_EVENT, wrapped);
  return () => window.removeEventListener(SESSION_INVALID_EVENT, wrapped);
}
