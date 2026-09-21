import { useEffect } from "react";

/**
 * Mantém a tela acordada (Screen Wake Lock API) enquanto `active` for true.
 * Silenciosamente ignora navegadores sem suporte ou erros de permissão.
 */
export const useWakeLock = (active: boolean) => {
  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let released = false;
    let sentinel: WakeLockSentinel | null = null;

    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
        sentinel.addEventListener("release", () => {
          released = true;
        });
      } catch {
        /* permissão negada ou tab em background — segue sem wake lock */
      }
    };

    request();

    // Re-adquire após a tab voltar do background (o lock é perdido automaticamente)
    const onVisibility = () => {
      if (document.visibilityState === "visible" && released && !sentinel) {
        released = false;
        request();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      try {
        sentinel?.release();
      } catch {
        /* noop */
      }
    };
  }, [active]);
};
