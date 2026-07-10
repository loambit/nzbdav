import React from "react"
import { useCallback } from "react"
import { useNavigate } from "react-router"
import { Icon } from "~/components/ui"

export type BreadcrumbProps = {
    parentDirectories: string[]
}

export function Breadcrumbs({ parentDirectories }: BreadcrumbProps): React.ReactNode {
    const navigate = useNavigate();
    const onClick = useCallback((index: number) => {
        if (index === -1) return navigate("/explore");
        navigate(`/explore/${parentDirectories.slice(0, index + 1).join('/')}`)
    }, [parentDirectories, navigate]);

    return (
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1 text-sm text-slate-400 md:mb-8">
            <button
                type="button"
                className="flex items-center gap-1 rounded-md px-2 py-1.5 transition-colors hover:bg-white/10 hover:text-white active:bg-white/15"
                onClick={() => onClick(-1)}
            >
                <Icon name="home" filled className="!text-[22px]" />
                {parentDirectories.length === 0 && <span>Home</span>}
            </button>
            {parentDirectories.map((parentDirectory, index) =>
                <React.Fragment key={index}>
                    <Icon name="chevron_right" className="shrink-0 !text-[20px] text-slate-500" />
                    <button
                        type="button"
                        className="max-w-full break-all rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white/10 hover:text-white active:bg-white/15"
                        onClick={() => onClick(index)}
                        aria-current={index === parentDirectories.length - 1 ? "page" : undefined}
                    >
                        {parentDirectory}
                    </button>
                </React.Fragment>
            )}
        </nav>
    );
}