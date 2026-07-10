import type { Route } from "./+types/route";
import { Breadcrumbs } from "./breadcrumbs/breadcrumbs";
import { Link, redirect, useLocation, useNavigation } from "react-router";
import { backendClient, type DirectoryItem } from "~/clients/backend-client.server";
import { useCallback } from "react";
import { lookup as getMimeType } from 'mime-types';
import { getDownloadKey } from "~/auth/downloads.server";
import { Loading } from "../_index/components/loading/loading";
import { formatFileSize } from "~/utils/file-size";
import { ItemMenu } from "./item-menu/item-menu";
import { Icon } from "~/components/ui";

export type ExplorePageData = {
    parentDirectories: string[],
    items: (DirectoryItem | ExploreFile)[],
}

export type ExploreFile = DirectoryItem & {
    mimeType: string,
    downloadKey: string,
}


export async function loader({ request }: Route.LoaderArgs) {
    // if path ends in trailing slash, remove it
    if (request.url.endsWith('/')) return redirect(request.url.slice(0, -1));

    // load items from backend
    let path = getWebdavPathDecoded(new URL(request.url).pathname);
    return {
        parentDirectories: getParentDirectories(path),
        items: (await backendClient.listWebdavDirectory(path)).map(x => {
            if (x.isDirectory) return x;
            return {
                ...x,
                mimeType: getMimeType(x.name),
                downloadKey: getDownloadKey(getRelativePath(path, x.name))
            };
        })
    }
}

export default function Explore({ loaderData }: Route.ComponentProps) {
    return (
        <Body {...loaderData} />
    );
}

function Body(props: ExplorePageData) {
    const location = useLocation();
    const navigation = useNavigation();
    const isNavigating = Boolean(navigation.location);

    const items = props.items;
    const parentDirectories = isNavigating
        ? getParentDirectories(getWebdavPathDecoded(navigation.location!.pathname))
        : props.parentDirectories;

    const getDirectoryPath = useCallback((directoryName: string) => {
        return `${location.pathname}/${encodeURIComponent(directoryName)}`;
    }, [location.pathname]);

    const getFilePath = useCallback((file: ExploreFile) => {
        const pathname = getWebdavPath(location.pathname);
        const relativePath = getRelativePath(pathname, encodeURIComponent(file.name));
        const extension = getExtension(file.name);
        const extensionQueryParam = extension ? `&extension=${extension}` : '';
        return `/view/${relativePath}?downloadKey=${file.downloadKey}${extensionQueryParam}`;
    }, [location.pathname]);

    return (
        <div className="absolute flex min-h-full min-w-full flex-col px-4 py-4 text-base text-slate-300 md:px-8">
            <Breadcrumbs parentDirectories={parentDirectories} />
            {!isNavigating && items.length > 0 &&
                <div className="overflow-visible rounded-lg border border-slate-700/70 bg-gray-800 shadow-md">
                    {items.filter(x => x.isDirectory).map((x, index) =>
                        <div key={`${index}_dir_item`} className={getClassName(x)}>
                            <Link
                                to={getDirectoryPath(x.name)}
                                className="flex min-w-0 flex-1 items-center gap-3 p-3 text-inherit no-underline transition-colors hover:bg-white/5 active:bg-white/10 md:p-4"
                            >
                                <Icon name="folder" filled className="shrink-0 !text-[40px] text-slate-400" />
                                <div className="break-all">{x.name}</div>
                            </Link>
                        </div>
                    )}
                    {items.filter(x => !x.isDirectory).map((x, index) =>
                        <div key={`${index}_file_item`} className={getClassName(x)}>
                            <a
                                href={getFilePath(x as ExploreFile)}
                                className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3 pr-1 text-inherit no-underline transition-colors hover:bg-white/5 active:bg-white/10 md:py-4 md:pl-4"
                            >
                                <Icon name={getIcon(x as ExploreFile)} className="shrink-0 !text-[40px] text-slate-400" />
                                <div className="flex min-w-0 flex-col gap-1 leading-none">
                                    <div className="break-all">{x.name}</div>
                                    <div className="font-mono text-xs text-slate-500">{formatFileSize(x.size)}</div>
                                </div>
                            </a>
                            <ItemMenu
                                exploreFile={x as ExploreFile}
                                previewPath={getFilePath(x as ExploreFile)} />
                        </div>
                    )}
                </div>
            }
            {isNavigating && <Loading className="min-h-0 flex-1" />}
        </div >
    );
}

function getExtension(filename: string): string | undefined {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === 0) return undefined;
    return filename.slice(lastDotIndex);
}

function getIcon(file: ExploreFile) {
    if (file.name.toLowerCase().endsWith(".mkv")) return "movie";
    if (file.mimeType === "application/mp4") return "movie";
    if (file.mimeType && file.mimeType.startsWith("video")) return "movie";
    if (file.mimeType && file.mimeType.startsWith("image")) return "image";
    return "draft";
}

function getWebdavPath(pathname: string): string {
    if (pathname.startsWith("/")) pathname = pathname.slice(1);
    if (pathname.startsWith("explore")) pathname = pathname.slice(7);
    if (pathname.startsWith("/")) pathname = pathname.slice(1);
    return pathname;
}

function getWebdavPathDecoded(pathname: string): string {
    return decodeURIComponent(getWebdavPath(pathname));
}

function getRelativePath(path: string, filename: string) {
    if (path === "") return filename;
    return `${path}/${filename}`;
}

function getParentDirectories(webdavPath: string): string[] {
    return webdavPath == "" ? [] : webdavPath.split('/');
}

function getClassName(item: DirectoryItem | ExploreFile) {
    const hidden = item.name.startsWith('.') ? " opacity-50" : "";
    return `relative flex border-b border-slate-700/70 last:border-b-0${hidden}`;
}