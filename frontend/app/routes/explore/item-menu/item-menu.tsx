import { useCallback, useState, type ReactNode } from "react"
import type { ExploreFile } from "../route"
import { DropdownOptions } from "~/routes/explore/dropdown-options/dropdown-options"
import { Icon } from "~/components/ui"

export type ItemMenuProps = {
    className?: string
    openClassName?: string
    exploreFile: ExploreFile,
    previewPath: string,
}

export function ItemMenu({ className, openClassName, exploreFile, previewPath }: ItemMenuProps): ReactNode {
    const [isOpen, setIsOpen] = useState(false);
    const exportNzbUrl = `/api/download-nzb?nzbBlobId=${exploreFile.nzbBlobId}`;
    const downloadUrl = `${previewPath}&download=true`;

    const onClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(x => !x);
    }, []);

    return (
        <>
            <button
                type="button"
                aria-label={`Actions for ${exploreFile.name}`}
                aria-expanded={isOpen}
                className={`flex shrink-0 select-none items-center self-stretch rounded-r-lg px-4 text-slate-400 transition-colors hover:bg-white/10 hover:text-white active:bg-white/15 ${isOpen ? `bg-white/10 text-white ${openClassName ?? ""}` : ""} ${className ?? ""}`}
                onClick={onClick}
            >
                <Icon name="more_horiz" className="!text-[24px]" />
            </button>
            <DropdownOptions isOpen={isOpen} onClose={() => setIsOpen(false)} options={[
                { option: <Preview />, linkTo: previewPath },
                { option: <Download />, linkTo: downloadUrl },
                !!exploreFile.nzbBlobId ? { option: <ExportNzb />, linkTo: exportNzbUrl } : undefined
            ]} />
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