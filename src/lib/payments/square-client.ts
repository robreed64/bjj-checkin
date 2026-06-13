import { SquareClient, SquareEnvironment } from "square";
import { getGymSettings } from "../gym-settings";

export type SquareConfig = {
  accessToken: string;
  applicationId: string | null;
  locationId: string;
  environment: "sandbox" | "production";
  webhookSignatureKey: string | null;
  terminalDeviceId: string | null;
};

// Mirrors getStripeClient(): DB settings take precedence over env vars, and a
// missing token/location means "Square not configured" — callers degrade.
export async function getSquareConfig(): Promise<SquareConfig | null> {
  const settings = await getGymSettings();
  const accessToken = settings.squareAccessToken || process.env.SQUARE_ACCESS_TOKEN;
  const locationId = settings.squareLocationId || process.env.SQUARE_LOCATION_ID;
  if (!accessToken || !locationId) return null;
  return {
    accessToken,
    applicationId: settings.squareApplicationId || process.env.SQUARE_APPLICATION_ID || null,
    locationId,
    environment: settings.squareEnvironment === "production" ? "production" : "sandbox",
    webhookSignatureKey:
      settings.squareWebhookSignatureKey || process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || null,
    terminalDeviceId: settings.squareTerminalDeviceId || null,
  };
}

export async function getSquareContext(): Promise<{ client: SquareClient; config: SquareConfig } | null> {
  const config = await getSquareConfig();
  if (!config) return null;
  const client = new SquareClient({
    token: config.accessToken,
    environment:
      config.environment === "production" ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
  });
  return { client, config };
}
