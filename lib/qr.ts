import "server-only";
import QRCode from "qrcode";

const QR_OPTS = {
  margin: 1,
  width: 512,
  errorCorrectionLevel: "M" as const,
  color: { dark: "#141519", light: "#FFFFFF" },
};

export async function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { ...QR_OPTS, type: "svg" });
}

export async function qrPngDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, QR_OPTS);
}

export function publicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
