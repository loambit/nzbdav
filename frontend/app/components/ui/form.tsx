import { forwardRef } from "react";
import type {
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function Field({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-col gap-1.5 ${className}`} {...props} />;
}

export function Label({ className = "", ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`text-sm font-medium text-slate-200 ${className}`} {...props} />;
}

export function HelpText({
  className = "",
  muted: _muted,
  ...props
}: HTMLAttributes<HTMLElement> & { muted?: boolean }) {
  return <small className={`text-xs leading-relaxed text-slate-400 ${className}`} {...props} />;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...props }, ref) {
    return <input ref={ref} className={`form-input ${className}`} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = "", ...props }, ref) {
    return <select ref={ref} className={`form-select ${className}`} {...props} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = "", ...props }, ref) {
    return <textarea ref={ref} className={`form-input ${className}`} {...props} />;
  },
);

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Checkbox({ className = "", ...props }, ref) {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={`h-4 w-4 rounded border-slate-600 bg-slate-950 accent-emerald-400 ${className}`}
        {...props}
      />
    );
  },
);

type ToggleProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
};

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(function Toggle(
  { className = "", label, id, disabled, style, ...props },
  ref,
) {
  return (
    <label
      htmlFor={id}
      style={style}
      className={`inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-200 ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      } ${className}`}
    >
      <input ref={ref} id={id} type="checkbox" disabled={disabled} className="peer sr-only" {...props} />
      <span
        aria-hidden="true"
        className="relative h-5 w-9 rounded-full border border-slate-600 bg-slate-700 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-3.5 after:w-3.5 after:rounded-full after:bg-slate-200 after:transition-transform peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400 peer-checked:border-blue-500 peer-checked:bg-blue-600 peer-checked:after:translate-x-4"
      />
      <span>{label}</span>
    </label>
  );
});

type CheckProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  type?: "checkbox" | "radio" | "switch";
};

export const Check = forwardRef<HTMLInputElement, CheckProps>(function Check(
  { type = "checkbox", label, className = "", style, ...props },
  ref,
) {
  if (type === "switch") {
    return <Toggle ref={ref} label={label} className={className} style={style} {...props} />;
  }

  return (
    <label
      htmlFor={props.id}
      style={style}
      className={`inline-flex w-fit items-center gap-2 text-sm text-slate-200 ${
        props.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      } ${className}`}
    >
      <input
        ref={ref}
        type={type}
        className="h-4 w-4 border-slate-600 bg-slate-950 accent-blue-500 focus-visible:ring-2 focus-visible:ring-blue-400"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
});

export const NativeForm = {
  Group: Field,
  Label,
  Select,
  Control: Input,
  Check,
  Text: HelpText,
};
