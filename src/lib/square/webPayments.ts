import type { SquarePayments, SquareSdk } from "@/types/square.types";

/**
 * Loads Square's Web Payments SDK in the browser (`docs/03-security.md` § PCI).
 *
 * ⚠️ **This is the one module under `src/lib/square/` that is NOT
 * `server-only`.** Its siblings hold the access token and the signature key; it
 * must never import them, and it never needs to — everything here is public by
 * design (an application id and a location id).
 *
 * Why a CDN `<script>` and not a package: the card fields are iframes served by
 * Square from Square's own origin. That is what keeps card data out of our DOM,
 * out of our bundle and out of PCI scope. A bundled copy of the SDK would not
 * change where the iframes come from, and Square does not support it.
 */

const SANDBOX_SDK_URL = "https://sandbox.web.squarecdn.com/v1/square.js";
const PRODUCTION_SDK_URL = "https://web.squarecdn.com/v1/square.js";

/**
 * Sandbox and production have DIFFERENT script URLs, and the wrong one fails in
 * a confusing way: the SDK loads, then rejects the application id.
 *
 * The environment is decided from the application id's own prefix rather than a
 * `NEXT_PUBLIC_SQUARE_ENVIRONMENT` variable. Square issues sandbox ids as
 * `sandbox-sq0idb-…` and production ids as `sq0idp-…`, so the id already carries
 * the answer — and one variable that can contradict another is one way to ship a
 * live site pointed at sandbox.
 */
function sdkUrlFor(applicationId: string): string {
  return applicationId.startsWith("sandbox-") ? SANDBOX_SDK_URL : PRODUCTION_SDK_URL;
}

/**
 * Shared across every mount: two payment panels on one page (or a remount after
 * a declined card) must not inject the script twice.
 */
let loader: Promise<SquareSdk> | null = null;

function loadSdk(applicationId: string): Promise<SquareSdk> {
  if (loader) return loader;

  loader = new Promise<SquareSdk>((resolve, reject) => {
    if (window.Square) {
      resolve(window.Square);
      return;
    }

    const url = sdkUrlFor(applicationId);
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${url}"]`);

    const onLoad = () => {
      // The script fired `load` but did not define the global: an ad blocker or
      // a strict CSP ate it. Reported as a failure so the panel offers the phone
      // number instead of showing an empty box forever.
      if (!window.Square) {
        reject(new Error("SQUARE_SDK_UNAVAILABLE"));
        return;
      }

      resolve(window.Square);
    };

    if (existing) {
      existing.addEventListener("load", onLoad, { once: true });
      existing.addEventListener("error", () => reject(new Error("SQUARE_SDK_UNAVAILABLE")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", () => reject(new Error("SQUARE_SDK_UNAVAILABLE")), {
      once: true,
    });

    document.head.appendChild(script);
  }).catch((error: unknown) => {
    // Let the next attempt retry instead of replaying a rejected promise: a
    // blocked script is often a blocked NETWORK, and networks come back.
    loader = null;
    throw error;
  });

  return loader;
}

/**
 * The `payments` instance for this application and location.
 *
 * Throws `SQUARE_SDK_UNAVAILABLE` when the script cannot load — the caller turns
 * that into a message with the firm's phone number, never into a blank card box.
 */
export async function getSquarePayments(
  applicationId: string,
  locationId: string,
): Promise<SquarePayments> {
  const sdk = await loadSdk(applicationId);

  return sdk.payments(applicationId, locationId);
}
