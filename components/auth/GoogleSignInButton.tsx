type GoogleSignInButtonProps = {
  disabled?: boolean;
  label: string;
  onClick: () => void | Promise<void>;
};

export function GoogleSignInButton({
  disabled = false,
  label,
  onClick,
}: GoogleSignInButtonProps) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
      >
        <path
          fill="#4285F4"
          d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.45a5.51 5.51 0 0 1-2.39 3.61v2.99h3.87c2.26-2.08 3.56-5.14 3.56-8.63Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.87-2.99c-1.07.72-2.45 1.14-4.07 1.14-3.13 0-5.78-2.11-6.73-4.95H1.27v3.08A12 12 0 0 0 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.27 14.3A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.58.37-2.3V6.62H1.27A12 12 0 0 0 0 12c0 1.94.46 3.78 1.27 5.38l4-3.08Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.77c1.76 0 3.34.61 4.59 1.82l3.44-3.44C17.94 1.18 15.24 0 12 0A12 12 0 0 0 1.27 6.62l4 3.08c.95-2.84 3.6-4.93 6.73-4.93Z"
        />
      </svg>
      <span>{label}</span>
    </button>
  );
}
