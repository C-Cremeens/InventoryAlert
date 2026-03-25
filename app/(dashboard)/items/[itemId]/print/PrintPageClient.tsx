"use client";

import PrintLabel from "@/components/print/PrintLabel";

interface Props {
  itemId: string;
  itemName: string;
  qrCodeId: string;
}

export default function PrintPageClient({ itemId, itemName, qrCodeId }: Props) {
  return (
    <>
      {/* Screen view */}
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-6 print:hidden">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <PrintLabel itemName={itemName} qrCodeId={qrCodeId} />
        </div>
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Print label
        </button>
        <a
          href={`/items/${itemId}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to item
        </a>
      </div>

      {/* Print-only view */}
      <div className="hidden print:flex print:items-center print:justify-center print:min-h-screen">
        <PrintLabel itemName={itemName} qrCodeId={qrCodeId} />
      </div>
    </>
  );
}
