/**
 * The slice of Square's Web Payments SDK this project uses.
 *
 * Hand-written instead of pulling in `@types/square__web-payments-sdk` or
 * `react-square-web-payments-sdk`: the SDK is loaded from Square's CDN as a
 * `<script>` (it has to be — PCI: the card fields live in Square's iframes, not
 * in our DOM), so there is no package to get types from, and adding a dependency
 * for four method signatures needs authorisation this feature does not have
 * (Mandamiento I).
 *
 * Only what we call is declared. Everything is `readonly`/optional where Square
 * says it may be absent, so `strict` catches an assumption instead of the
 * browser catching it at the worst possible moment (Mandamiento IX — no `any`).
 */

/** Result of `card.tokenize()`. `token` only exists when `status` is `"OK"`. */
export type SquareTokenResult = {
  status: string;
  token?: string;
  errors?: { message?: string; field?: string; type?: string }[];
};

/** The card entry form. Its inputs are Square's iframes, never ours. */
export type SquareCard = {
  attach: (selector: string | HTMLElement) => Promise<void>;
  detach: () => Promise<void>;
  tokenize: () => Promise<SquareTokenResult>;
};

/** What `verifyBuyer` needs to run a 3-D Secure challenge (SCA). */
export type SquareVerificationDetails = {
  amount: string;
  currencyCode: string;
  intent: "CHARGE" | "STORE";
  billingContact: {
    givenName?: string;
    familyName?: string;
    email?: string;
    countryCode?: string;
  };
};

export type SquareVerificationResult = {
  token?: string;
};

export type SquarePayments = {
  card: () => Promise<SquareCard>;
  verifyBuyer: (
    source: string,
    details: SquareVerificationDetails,
  ) => Promise<SquareVerificationResult | null>;
};

export type SquareSdk = {
  payments: (applicationId: string, locationId: string) => SquarePayments;
};

declare global {
  interface Window {
    /** Set by Square's CDN script. Absent until it has loaded. */
    Square?: SquareSdk;
  }
}
