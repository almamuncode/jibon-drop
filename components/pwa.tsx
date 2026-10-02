"use client";
import { useTranslation } from "@/components/language";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download } from "lucide-react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
function subscribeStandalone(callback: () => void) {
  const media = matchMedia("(display-mode: standalone)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function PwaInstall() {
  const t = useTranslation();

  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const standalone = useSyncExternalStore(
    subscribeStandalone,
    () => matchMedia("(display-mode: standalone)").matches,
    () => false,
  );
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .catch(() => {
          // Installation remains available if offline support cannot initialize.
        });
    }
    const ready = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    const complete = () => {
      setInstalled(true);
      setInstall(null);
    };
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", complete);
    return () => {
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", complete);
    };
  }, []);
  if (installed || standalone) return null;
  return (
    <div className="install-app">
      {install ? (
        <button
          type="button"
          className="text-button"
          onClick={async () => {
            await install.prompt();
            await install.userChoice;
            setInstall(null);
          }}
        >
          <Download size={16} aria-hidden="true" />{" "}
          {t("Install JibonDrop")}{" "}
        </button>
      ) : (
        <details>
          <summary>{t("Add JibonDrop to your home screen")}</summary>
          <p>
            {t(
              "On iPhone or iPad, open this site in Safari, tap Share, then Add to Home Screen. On Android, open the browser menu and choose Install app or Add to Home screen.",
            )}{" "}
          </p>
        </details>
      )}
    </div>
  );
}
