import { headers } from "next/headers";

type Props = { params: Promise<{ qrCodeId: string }> };

export default async function ScanPage({ params }: Props) {
  const { qrCodeId } = await params;

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  let itemName = "";
  let alreadyNotified = false;
  let acknowledgementMessage = "";
  let emailFailed = false;
  let error = false;

  try {
    const res = await fetch(`${baseUrl}/api/scan/${qrCodeId}`, {
      method: "POST",
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      itemName = data.itemName;
      alreadyNotified = data.alreadyNotified;
      acknowledgementMessage = data.acknowledgementMessage ?? "";
      emailFailed = data.emailFailed ?? false;
    } else {
      error = true;
    }
  } catch {
    error = true;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <h1 className="text-lg font-bold text-gray-900 mb-2">
            Item not found
          </h1>
          <p className="text-sm text-gray-500">
            This QR code doesn&apos;t match any inventory item. It may have
            been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        {alreadyNotified ? (
          <>
            <h1 className="text-lg font-bold text-gray-900 mb-2">
              Already notified
            </h1>
            <p className="text-sm text-gray-600 mb-1">
              <strong>{itemName}</strong>
            </p>
            <p className="text-sm text-gray-500">
              {acknowledgementMessage}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-bold text-gray-900 mb-2">
              {emailFailed ? "Alert may not have been sent" : "Alert sent!"}
            </h1>
            <p className="text-sm text-gray-600 mb-1">
              <strong>{itemName}</strong>
            </p>
            <p className="text-sm text-gray-500">
              {emailFailed
                ? "Your scan was recorded, but there was a problem sending the alert email. Please notify staff directly."
                : acknowledgementMessage}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
