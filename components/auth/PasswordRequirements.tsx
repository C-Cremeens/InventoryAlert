import { getPasswordRequirementStates } from "@/lib/auth-validation";

type PasswordRequirementsProps = {
  password: string;
};

export function PasswordRequirements({
  password,
}: PasswordRequirementsProps) {
  const requirements = getPasswordRequirementStates(password);

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Password requirements
      </p>
      <ul className="mt-2 space-y-1">
        {requirements.map((requirement) => (
          <li
            key={requirement.id}
            className={`text-xs ${
              requirement.met ? "text-green-700" : "text-gray-500"
            }`}
          >
            {requirement.met ? "✓" : "○"} {requirement.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
