import type { ReactNode } from "react";
import { Icon } from "./icon";

export type TabOption<T extends string> = {
  id: T;
  label: string;
  icon?: string;
  disabled?: boolean;
};

export function Tabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="tablist" className="flex flex-wrap border-b border-gray-200/10">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            role="tab"
            aria-selected={active}
            disabled={option.disabled}
            onClick={() => onChange(option.id)}
            className={`flex shrink-0 cursor-pointer items-center gap-1 rounded-t-lg border-b-2 px-2 py-2 text-sm md:gap-2 md:px-4 ${
              active
                ? "border-blue-400 text-blue-400"
                : "border-transparent text-slate-300 hover:border-blue-400 hover:text-blue-400"
            } disabled:cursor-not-allowed disabled:text-slate-600`}
          >
            {option.icon && <Icon name={option.icon} className="!text-[18px]" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`pt-4 ${className}`}>{children}</div>;
}
