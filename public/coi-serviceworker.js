/*! coi-serviceworker v0.1.7 - Guido Zuidhof, licensed under MIT */
if (typeof window === "undefined") {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
  self.addEventListener("fetch", (e) => {
    if (
      e.request.cache === "only-if-cached" &&
      e.request.mode !== "same-origin"
    ) {
      return;
    }
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.status === 0) return res;
          const headers = new Headers(res.headers);
          headers.set("Cross-Origin-Embedder-Policy", "credentialless");
          headers.set("Cross-Origin-Opener-Policy", "same-origin");
          return new Response(res.body, {
            status: res.status,
            statusText: res.statusText,
            headers,
          });
        })
        .catch((e) => console.error(e))
    );
  });
} else {
  (() => {
    const reloadedByCOI = window.sessionStorage.getItem("coiReloadedByCOI");
    window.sessionStorage.removeItem("coiReloadedByCOI");

    const coepDegrading =
      reloadedByCOI === "true" &&
      !window.crossOriginIsolated;

    if (window.crossOriginIsolated !== false || coepDegrading) return;

    if (!window.isSecureContext) {
      console.log(
        "COOP/COEP Service Worker: Not registered, not a secure context."
      );
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register(new URL(document.currentScript.src).pathname)
        .then(
          (registration) => {
            if (
              registration.active &&
              !navigator.serviceWorker.controller
            ) {
              window.sessionStorage.setItem("coiReloadedByCOI", "true");
              window.location.reload();
            } else if (registration.installing) {
              registration.installing.addEventListener(
                "statechange",
                () => {
                  if (registration.active) {
                    window.sessionStorage.setItem(
                      "coiReloadedByCOI",
                      "true"
                    );
                    window.location.reload();
                  }
                }
              );
            }
          },
          (err) => {
            console.error(
              "COOP/COEP Service Worker: Registration failed.",
              err
            );
          }
        );
    }
  })();
}
