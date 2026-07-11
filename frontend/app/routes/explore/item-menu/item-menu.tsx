import { useCallback, useState, type ReactNode } from "react"
import type { ExploreFile } from "../route"
import { DropdownOptions } from "~/routes/explore/dropdown-options/dropdown-options"
import { Icon } from "~/components/ui"

export type ItemMenuProps = {
    className?: string
    openClassName?: string
    exploreFile?: ExploreFile,
    previewPath?: string,
    onRemove?: () => void,
}

export function ItemMenu({ className, openClassName, exploreFile, previewPath, onRemove }: ItemMenuProps): ReactNode {
    const [isOpen, setIsOpen] = useState(false);
    const exportNzbUrl = exploreFile ? `/api/download-nzb?nzbBlobId=${exploreFile.nzbBlobId}` : undefined;
    const downloadUrl = previewPath ? `${previewPath}&download=true` : undefined;

    const onClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(x => !x);
    }, []);

    const options = [
        previewPath ? { option: <Preview />, linkTo: previewPath } : undefined,
        downloadUrl ? { option: <Download />, linkTo: downloadUrl } : undefined,
        exploreFile?.nzbBlobId && exportNzbUrl ? { option: <ExportNzb />, linkTo: exportNzbUrl } : undefined,
        onRemove ? { option: <Remove />, variant: "danger" as const, onSelect: onRemove } : undefined,
    ].filter(Boolean);

    if (options.length === 0) return null;

    return (
        <>
            <button
                type="button"
                aria-label={exploreFile ? `Actions for ${exploreFile.name}` : "Item actions"}
                aria-expanded={isOpen}
                className={`flex shrink-0 select-none items-center self-stretch rounded-r-lg px-4 text-slate-400 transition-colors hover:bg-white/10 hover:text-white active:bg-white/15 ${isOpen ? `bg-white/10 text-white ${openClassName ?? ""}` : ""} ${className ?? ""}`}
                onClick={onClick}
            >
                <Icon name="more_horiz" className="!text-[24px]" />
            </button>
            <DropdownOptions isOpen={isOpen} onClose={() => setIsOpen(false)} options={options} />
        </>
    );
}

export function Preview(): ReactNode {
    return (
        <><Icon name="visibility" className="mr-2 !text-[18px]" /> Preview</>
    );
}

export function Download(): ReactNode {
    return (
        <><Icon name="download" className="mr-2 !text-[18px]" /> Download</>
    );
}

export function ExportNzb(): ReactNode {
    return (
        <><Icon name="upload" className="mr-2 !text-[18px]" /> Export NZB</>
    );
}

export function Remove(): ReactNode {
    return (
        <><Icon name="delete" className="mr-2 !text-[18px]" /> Remove</>
    );
}