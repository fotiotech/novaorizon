import { ChevronUpIcon, ChevronDownIcon } from "lucide-react";

interface CollapsibleSectionProps {
  code: string;
  name?: string;
  children: React.ReactNode;
  level?: number;
  isExpanded: boolean;
  onToggle: (code: string) => void;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  code,
  name,
  children,
  level = 0,
  isExpanded,
  onToggle,
}) => {
  const sectionId = `section-${code}`;

  return (
    <div className="mb-1 md:mb-2 rounded overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        className="w-full flex justify-between items-center hover:bg-gray-100 transition-colors cursor-pointer p-4"
        onClick={() => onToggle(code)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onToggle(code);
        }}
      >
        <h2
          className={`text-left ${
            level === 0 ? "text-xl font-semibold" : "text-md font-normal"
          }`}
        >
          {name || ""}
        </h2>
        {isExpanded ? (
          <ChevronUpIcon className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        )}
      </div>

      <div
        id={sectionId}
        className={`overflow-auto transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

export default CollapsibleSection