import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

export type DropdownOptionsProps = {
    className?: string,
    style?: CSSProperties
    isOpen?: boolean;
    options: (DropdownOption | undefined)[];
    onClose?: () => void;
};

export type DropdownOption = {
    option: ReactNode;
    variant?: undefined | "danger"
    linkTo?: string,
    onSelect?: () => void;
}

export function DropdownOptions({ className, style, isOpen = true, options, onClose }: DropdownOptionsProps) {
    const ref = useRef<HTMLUListElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                e.preventDefault();
                onClose?.();
            }
        }

        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, [isOpen, onClose]);

    return !isOpen ? null : (
        <ul
            ref={ref}
            className={`absolute right-0 top-full z-50 m-0 min-w-40 list-none rounded-md border border-slate-700 bg-slate-900 py-1 shadow-xl ${className ?? ""}`}
            style={style}
        >
            {options.filter(x => !!x).map((option, index) => (
                <li key={index}>
                    {option.linkTo && (
                        <a
                            href={option.linkTo}
                            className={`flex w-full items-center whitespace-nowrap px-3 py-2 text-left text-sm no-underline outline-none transition-colors hover:bg-blue-500/15 hover:text-white focus-visible:bg-blue-500/15 focus-visible:text-white ${option.variant === "danger" ? "text-red-300 hover:bg-red-500/20 focus-visible:bg-red-500/20" : "text-slate-300"}`}
                            onClick={() => option.onSelect?.()}
                        >
                            {option.option}
                        </a>
                    )}
                    {!option.linkTo &&
                        <button
                            type="button"
                            className={`flex w-full items-center whitespace-nowrap px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-blue-500/15 hover:text-white focus-visible:bg-blue-500/15 focus-visible:text-white ${option.variant === "danger" ? "text-red-300 hover:bg-red-500/20 focus-visible:bg-red-500/20" : "text-slate-300"}`}
                            onClick={() => option.onSelect?.()}
                        >
                            {option.option}
                        </button>
                    }
                </li>
            ))}
        </ul>
    );
}