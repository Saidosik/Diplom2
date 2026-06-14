"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
    Archive,
    Copy,
    Download,
    Eye,
    FileCog,
    FolderPlus,
    FolderOpen,
    Grid2X2,
    Info,
    List,
    Loader2,
    MoreHorizontal,
    Pencil,
    Pin,
    PinOff,
    Search,
    ShieldAlert,
    Trash2,
    UploadCloud,
} from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { createFolder, deleteFolder, deleteMyFile, fetchFolders, getMyFiles, moveFileToFolder, toggleFilePinned, updateFolder, updateMyFile, uploadMyFile } from "@/features/files/api"
import type { FileFolder, UserFile, UserFileStorageMeta } from "@/features/files/types"
import { absoluteShareUrl, dateLabel, fileIcon, kindLabels, sizeLabel } from "./file-utils"

type FileAction = "download" | "delete" | "publish" | "delete-folder"
type SmartFilter = "all" | "pinned" | "public" | "unfiled" | "folder"

type PendingAction = {
    type: FileAction
    file?: UserFile
    folder?: FileFolder
}

const PUBLIC_WARNING = "Файл станет доступен другим пользователям по ссылке. Не публикуйте персональные данные, пароли, токены, ключи API и приватные документы."
const DOWNLOAD_WARNING = "Платформа «Вектор» не проверяет содержимое каждого файла и не несёт ответственности за файлы, загруженные пользователями. Не открывайте подозрительные архивы, документы и файлы из неизвестных источников."

export function FilesPage() {
    const queryClient = useQueryClient()
    const inputRef = useRef<HTMLInputElement>(null)
    const [q, setQ] = useState("")
    const [kind, setKind] = useState("all")
    const [visibility, setVisibility] = useState("all")
    const [sort, setSort] = useState("newest")
    const [view, setView] = useState<"grid" | "list">("list")
    const [uploadOpen, setUploadOpen] = useState(false)
    const [commandOpen, setCommandOpen] = useState(false)
    const [selectedSmartFilter, setSelectedSmartFilter] = useState<SmartFilter>("all")
    const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null)
    const [uploadVisibility, setUploadVisibility] = useState<"private" | "public">("private")
    const [uploadTitle, setUploadTitle] = useState("")
    const [uploadFolderId, setUploadFolderId] = useState<number | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const [editingFile, setEditingFile] = useState<UserFile | null>(null)
    const [editTitle, setEditTitle] = useState("")
    const [editVisibility, setEditVisibility] = useState<"private" | "public">("private")
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
    const [movingFile, setMovingFile] = useState<UserFile | null>(null)
    const [moveFolderId, setMoveFolderId] = useState<number | null>(null)
    const [folderDialogOpen, setFolderDialogOpen] = useState(false)
    const [editingFolder, setEditingFolder] = useState<FileFolder | null>(null)
    const [folderName, setFolderName] = useState("")
    const [folderColor, setFolderColor] = useState("#7c3aed")

    const folderQuery = useQuery({
        queryKey: ["file-folders"],
        queryFn: fetchFolders,
    })
    const folders = folderQuery.data ?? []
    const folderParam = selectedSmartFilter === "folder" && selectedFolderId ? selectedFolderId : selectedSmartFilter === "unfiled" ? "none" : undefined
    const pinnedParam = selectedSmartFilter === "pinned" ? true : undefined
    const visibilityParam = selectedSmartFilter === "public" ? "public" : visibility === "all" ? undefined : visibility

    const filesQuery = useQuery({
        queryKey: ["files", q, kind, visibilityParam, sort, folderParam, pinnedParam],
        queryFn: () => getMyFiles({
            q: q || undefined,
            kind: kind === "all" ? undefined : kind,
            visibility: visibilityParam,
            folder_id: folderParam,
            pinned: pinnedParam,
            sort,
            per_page: 60,
        }),
    })

    const meta = filesQuery.data?.meta?.storage
    const files = filesQuery.data?.data ?? []
    const hasFilters = Boolean(q || kind !== "all" || visibility !== "all")
    const quotaFull = Boolean(meta && (meta.used_bytes >= meta.quota_bytes || meta.files_count >= meta.max_files))

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
                event.preventDefault()
                setCommandOpen(true)
            }
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [])

    const uploadMutation = useMutation({
        mutationFn: uploadMyFile,
        onSuccess: () => {
            toast.success("Файл загружен")
            setUploadOpen(false)
            resetUploadForm()
            queryClient.invalidateQueries({ queryKey: ["files"] })
            queryClient.invalidateQueries({ queryKey: ["file-folders"] })
        },
        onError: (error: Error) => toast.error(error.message),
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: { title?: string | null; visibility?: "private" | "public" } }) => updateMyFile(id, payload),
        onSuccess: () => {
            toast.success("Файл обновлён")
            setEditingFile(null)
            queryClient.invalidateQueries({ queryKey: ["files"] })
        },
        onError: (error: Error) => toast.error(error.message),
    })

    const deleteMutation = useMutation({
        mutationFn: deleteMyFile,
        onSuccess: () => {
            toast.success("Файл удалён")
            setPendingAction(null)
            queryClient.invalidateQueries({ queryKey: ["files"] })
        },
        onError: (error: Error) => toast.error(error.message),
    })

    const folderMutation = useMutation({
        mutationFn: (payload: { id?: number; name: string; color?: string | null }) => payload.id ? updateFolder(payload.id, payload) : createFolder(payload),
        onSuccess: () => {
            toast.success(editingFolder ? "Папка обновлена" : "Папка создана")
            setFolderDialogOpen(false)
            setEditingFolder(null)
            setFolderName("")
            queryClient.invalidateQueries({ queryKey: ["file-folders"] })
        },
        onError: (error: Error) => toast.error(error.message),
    })

    const deleteFolderMutation = useMutation({
        mutationFn: deleteFolder,
        onSuccess: (payload) => {
            toast.success(payload.message)
            setPendingAction(null)
            setSelectedSmartFilter("all")
            setSelectedFolderId(null)
            queryClient.invalidateQueries({ queryKey: ["files"] })
            queryClient.invalidateQueries({ queryKey: ["file-folders"] })
        },
        onError: (error: Error) => toast.error(error.message),
    })

    const moveMutation = useMutation({
        mutationFn: ({ id, folderId }: { id: number; folderId: number | null }) => moveFileToFolder(id, folderId),
        onSuccess: () => {
            toast.success("Файл перемещён")
            setMovingFile(null)
            queryClient.invalidateQueries({ queryKey: ["files"] })
            queryClient.invalidateQueries({ queryKey: ["file-folders"] })
        },
        onError: (error: Error) => toast.error(error.message),
    })

    const pinMutation = useMutation({
        mutationFn: ({ id, pinned }: { id: number; pinned: boolean }) => toggleFilePinned(id, pinned),
        onSuccess: (file) => {
            toast.success(file.is_pinned ? "Файл закреплён" : "Файл откреплён")
            queryClient.invalidateQueries({ queryKey: ["files"] })
        },
        onError: (error: Error) => toast.error(error.message),
    })

    const freeBytes = meta ? Math.max(meta.quota_bytes - meta.used_bytes, 0) : 0

    function resetFilters() {
        setQ("")
        setKind("all")
        setVisibility("all")
        setSort("newest")
        setSelectedSmartFilter("all")
        setSelectedFolderId(null)
    }

    function resetUploadForm() {
        setUploadTitle("")
        setUploadVisibility("private")
        setUploadFolderId(null)
        setSelectedFile(null)
        setDragActive(false)
    }

    const chooseUploadFiles = useCallback((files: FileList | null) => {
        const selected = files?.item(0)
        if (!selected) return
        setSelectedFile(selected)
        if ((files?.length ?? 0) > 1) {
            toast.info("Выбран первый файл. Массовая загрузка будет добавлена позже.")
        }
    }, [])

    function openUploadDialog() {
        setUploadFolderId(selectedSmartFilter === "folder" ? selectedFolderId : null)
        setUploadOpen(true)
    }

    function submitUpload() {
        if (!selectedFile) return
        uploadMutation.mutate({
            file: selectedFile,
            title: uploadTitle.trim() || undefined,
            visibility: uploadVisibility,
            folder_id: uploadFolderId,
        })
    }

    function openEdit(file: UserFile) {
        setEditingFile(file)
        setEditTitle(file.title || "")
        setEditVisibility(file.visibility)
    }

    function saveEdit() {
        if (!editingFile) return
        const payload: { title?: string | null; visibility?: "private" | "public" } = {
            title: editTitle.trim() || null,
            visibility: editVisibility,
        }
        updateMutation.mutate({ id: editingFile.id, payload })
    }

    function copyLink(file: UserFile) {
        const url = absoluteShareUrl(file.share_url)
        if (!url) return
        navigator.clipboard.writeText(url).then(() => toast.success("Ссылка скопирована"))
    }

    function requestDownload(file: UserFile) {
        if (!file.download_url) return
        const riskyKind = ["archive", "file"].includes(file.kind)
        if (!file.is_owner || riskyKind) {
            setPendingAction({ type: "download", file })
            return
        }
        window.location.href = file.download_url
    }

    function requestVisibility(file: UserFile) {
        if (file.visibility === "public") {
            updateMutation.mutate({ id: file.id, payload: { visibility: "private" } })
            return
        }
        setPendingAction({ type: "publish", file })
    }

    function runPendingAction() {
        if (!pendingAction) return
        if (pendingAction.type === "delete-folder" && pendingAction.folder) {
            deleteFolderMutation.mutate(pendingAction.folder.id)
            return
        }
        if (!pendingAction.file) return
        if (pendingAction.type === "download") {
            if (pendingAction.file.download_url) window.location.href = pendingAction.file.download_url
            setPendingAction(null)
            return
        }
        if (pendingAction.type === "publish") {
            updateMutation.mutate({ id: pendingAction.file.id, payload: { visibility: "public" } })
            setPendingAction(null)
            return
        }
        deleteMutation.mutate(pendingAction.file.id)
    }

    function selectSmartFilter(next: SmartFilter, folderId: number | null = null) {
        setSelectedSmartFilter(next)
        setSelectedFolderId(folderId)
    }

    function openCreateFolderDialog() {
        setEditingFolder(null)
        setFolderName("")
        setFolderColor("#7c3aed")
        setFolderDialogOpen(true)
    }

    function openEditFolderDialog(folder: FileFolder) {
        setEditingFolder(folder)
        setFolderName(folder.name)
        setFolderColor(folder.color || "#7c3aed")
        setFolderDialogOpen(true)
    }

    function saveFolder() {
        if (!folderName.trim()) {
            toast.error("Название папки обязательно.")
            return
        }
        folderMutation.mutate({ id: editingFolder?.id, name: folderName.trim(), color: folderColor })
    }

    useEffect(() => {
        if (!uploadOpen) return

        const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes("Files")
        const preventFileOpen = (event: DragEvent) => {
            if (!hasFiles(event)) return
            event.preventDefault()
            event.stopPropagation()
        }
        const onDragEnter = (event: DragEvent) => {
            if (!hasFiles(event)) return
            preventFileOpen(event)
            setDragActive(true)
        }
        const onDragOver = (event: DragEvent) => {
            if (!hasFiles(event)) return
            preventFileOpen(event)
            setDragActive(true)
        }
        const onDragLeave = (event: DragEvent) => {
            if (event.clientX <= 0 || event.clientY <= 0 || event.clientX >= window.innerWidth || event.clientY >= window.innerHeight) {
                setDragActive(false)
            }
        }
        const onDrop = (event: DragEvent) => {
            if (!hasFiles(event)) return
            preventFileOpen(event)
            chooseUploadFiles(event.dataTransfer?.files ?? null)
            setDragActive(false)
        }

        window.addEventListener("dragenter", onDragEnter)
        window.addEventListener("dragover", onDragOver)
        window.addEventListener("dragleave", onDragLeave)
        window.addEventListener("drop", onDrop)

        return () => {
            window.removeEventListener("dragenter", onDragEnter)
            window.removeEventListener("dragover", onDragOver)
            window.removeEventListener("dragleave", onDragLeave)
            window.removeEventListener("drop", onDrop)
        }
    }, [chooseUploadFiles, uploadOpen])

    return (
        <TooltipProvider>
            <div className="mx-auto max-w-7xl space-y-5 overflow-x-hidden">
                <div className="space-y-4">
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbPage>Файлы</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <Badge variant="outline" className="mb-3 gap-2">
                                <FolderOpen className="size-3.5" /> Личное хранилище
                            </Badge>
                            <h1 className="text-3xl font-semibold tracking-tight">Мои файлы</h1>
                            <p className="mt-1 max-w-3xl text-muted-foreground">
                                Загружайте изображения, PDF, архивы, логи и код, чтобы использовать их в чатах, публикациях и демонстрации проекта.
                            </p>
                        </div>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="w-full lg:w-auto">
                                    <Button className="w-full lg:w-auto" disabled={quotaFull} onClick={openUploadDialog}>
                                        <UploadCloud className="size-4" /> Загрузить файл
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            {quotaFull ? <TooltipContent>Хранилище заполнено</TooltipContent> : null}
                        </Tooltip>
                    </div>
                </div>

                <StorageStrip meta={meta} freeBytes={freeBytes} />

                {quotaFull ? (
                    <Alert>
                        <ShieldAlert className="size-4" />
                        <AlertTitle>Хранилище заполнено</AlertTitle>
                        <AlertDescription>Удалите ненужные файлы, чтобы загрузить новые.</AlertDescription>
                    </Alert>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                    <FolderPanel
                        folders={folders}
                        selectedSmartFilter={selectedSmartFilter}
                        selectedFolderId={selectedFolderId}
                        onSelect={selectSmartFilter}
                        onCreate={openCreateFolderDialog}
                        onEdit={openEditFolderDialog}
                        onDelete={(folder) => setPendingAction({ type: "delete-folder", folder })}
                    />

                    <Card className="overflow-hidden">
                        <CardHeader className="gap-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <CardTitle>Библиотека</CardTitle>
                                <CardDescription>Файлы для чатов, публикаций и демонстрации проекта.</CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" onClick={() => setCommandOpen(true)}>
                                    Команды <kbd className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Ctrl K</kbd>
                                </Button>
                                <ToggleGroup type="single" value={view} onValueChange={(value) => value && setView(value as "grid" | "list")}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <ToggleGroupItem value="list" aria-label="Список">
                                                <List className="size-4" />
                                            </ToggleGroupItem>
                                        </TooltipTrigger>
                                        <TooltipContent>Список</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <ToggleGroupItem value="grid" aria-label="Сетка">
                                                <Grid2X2 className="size-4" />
                                            </ToggleGroupItem>
                                        </TooltipTrigger>
                                        <TooltipContent>Сетка</TooltipContent>
                                    </Tooltip>
                                </ToggleGroup>
                            </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_170px_170px_150px]">
                            <div className="relative md:col-span-2 xl:col-span-1">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Поиск по файлам" className="pl-9" />
                            </div>
                            <Select value={kind} onValueChange={setKind}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Все типы</SelectItem>
                                    {Object.entries(kindLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={visibility} onValueChange={setVisibility}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Любой доступ</SelectItem>
                                    <SelectItem value="private">Приватные</SelectItem>
                                    <SelectItem value="public">Публичные</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={sort} onValueChange={setSort}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Новые</SelectItem>
                                    <SelectItem value="oldest">Старые</SelectItem>
                                    <SelectItem value="name">Имя</SelectItem>
                                    <SelectItem value="size">Размер</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {filesQuery.isLoading ? <FileSkeleton view={view} /> : null}
                        {!filesQuery.isLoading && files.length ? (
                            <div className={view === "grid" ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "space-y-2"}>
                                {files.map((file) => (
                                    <FileItem
                                        key={file.id}
                                        file={file}
                                        view={view}
                                        onCopy={() => copyLink(file)}
                                        onDownload={() => requestDownload(file)}
                                        onEdit={() => openEdit(file)}
                                        onToggleVisibility={() => requestVisibility(file)}
                                        onTogglePinned={() => pinMutation.mutate({ id: file.id, pinned: !file.is_pinned })}
                                        onMove={() => { setMovingFile(file); setMoveFolderId(file.folder_id ?? null) }}
                                        onDelete={() => setPendingAction({ type: "delete", file })}
                                    />
                                ))}
                            </div>
                        ) : null}
                        {!filesQuery.isLoading && !files.length ? (
                            <EmptyState hasFilters={hasFilters} smartFilter={selectedSmartFilter} onReset={resetFilters} onUpload={openUploadDialog} />
                        ) : null}
                        </CardContent>
                    </Card>
                </div>

                <UploadDialog
                    open={uploadOpen}
                    onOpenChange={setUploadOpen}
                    inputRef={inputRef}
                    selectedFile={selectedFile}
                    title={uploadTitle}
                    visibility={uploadVisibility}
                    folderId={uploadFolderId}
                    folders={folders}
                    meta={meta}
                    freeBytes={freeBytes}
                    dragActive={dragActive}
                    isPending={uploadMutation.isPending}
                    onCancel={() => { setUploadOpen(false); resetUploadForm() }}
                    onChoose={chooseUploadFiles}
                    onTitleChange={setUploadTitle}
                    onVisibilityChange={setUploadVisibility}
                    onFolderChange={setUploadFolderId}
                    onDragActiveChange={setDragActive}
                    onSubmit={submitUpload}
                />

                <EditFileDialog
                    file={editingFile}
                    title={editTitle}
                    visibility={editVisibility}
                    isPending={updateMutation.isPending}
                    onOpenChange={(open) => !open && setEditingFile(null)}
                    onTitleChange={setEditTitle}
                    onVisibilityChange={setEditVisibility}
                    onSubmit={saveEdit}
                />

                <MoveFileDialog
                    file={movingFile}
                    folders={folders}
                    folderId={moveFolderId}
                    isPending={moveMutation.isPending}
                    onOpenChange={(open) => !open && setMovingFile(null)}
                    onFolderChange={setMoveFolderId}
                    onSubmit={() => movingFile && moveMutation.mutate({ id: movingFile.id, folderId: moveFolderId })}
                />

                <FolderDialog
                    open={folderDialogOpen}
                    folder={editingFolder}
                    name={folderName}
                    color={folderColor}
                    isPending={folderMutation.isPending}
                    onOpenChange={setFolderDialogOpen}
                    onNameChange={setFolderName}
                    onColorChange={setFolderColor}
                    onSubmit={saveFolder}
                />

                <FilesCommandDialog
                    open={commandOpen}
                    onOpenChange={setCommandOpen}
                    files={files}
                    onUpload={() => { openUploadDialog(); setCommandOpen(false) }}
                    onReset={resetFilters}
                    setKind={setKind}
                    setVisibility={setVisibility}
                    setSort={setSort}
                    setSmartFilter={(filter) => selectSmartFilter(filter)}
                />

                <ActionAlertDialog
                    pendingAction={pendingAction}
                    isDeleting={deleteMutation.isPending}
                    onOpenChange={(open) => !open && setPendingAction(null)}
                    onConfirm={runPendingAction}
                />

                <FullscreenDragOverlay visible={uploadOpen && dragActive} />
            </div>
        </TooltipProvider>
    )
}

function FolderPanel({ folders, selectedSmartFilter, selectedFolderId, onSelect, onCreate, onEdit, onDelete }: {
    folders: FileFolder[]
    selectedSmartFilter: SmartFilter
    selectedFolderId: number | null
    onSelect: (filter: SmartFilter, folderId?: number | null) => void
    onCreate: () => void
    onEdit: (folder: FileFolder) => void
    onDelete: (folder: FileFolder) => void
}) {
    const itemClass = (active: boolean) => `flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${active ? "bg-primary/10 text-primary" : "hover:bg-muted/60"}`
    return (
        <Card className="h-fit lg:sticky lg:top-4">
            <CardHeader className="pb-3">
                <CardTitle className="text-base">Библиотека</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                    <button className={itemClass(selectedSmartFilter === "all")} onClick={() => onSelect("all", null)}><span>Все файлы</span></button>
                    <button className={itemClass(selectedSmartFilter === "pinned")} onClick={() => onSelect("pinned", null)}><span className="inline-flex items-center gap-2"><Pin className="size-4" />Закреплённые</span></button>
                    <button className={itemClass(selectedSmartFilter === "public")} onClick={() => onSelect("public", null)}><span>Публичные</span></button>
                    <button className={itemClass(selectedSmartFilter === "unfiled")} onClick={() => onSelect("unfiled", null)}><span>Без папки</span></button>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Папки</div>
                        <Button size="icon-sm" variant="ghost" onClick={onCreate} aria-label="Создать папку"><FolderPlus className="size-4" /></Button>
                    </div>
                    {folders.length ? (
                        <div className="space-y-1">
                            {folders.map((folder) => (
                                <div key={folder.id} className="group flex items-center gap-1">
                                    <button className={itemClass(selectedSmartFilter === "folder" && selectedFolderId === folder.id)} onClick={() => onSelect("folder", folder.id)}>
                                        <span className="flex min-w-0 items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: folder.color || "#7c3aed" }} /><span className="truncate">{folder.name}</span></span>
                                        <span className="text-xs text-muted-foreground">{folder.files_count ?? 0}</span>
                                    </button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost" aria-label="Действия с папкой"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onSelect={() => onEdit(folder)}>Редактировать</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(folder)}>Удалить папку</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                            <div>Папок пока нет</div>
                            <Button className="mt-2" size="sm" variant="outline" onClick={onCreate}>Создать папку</Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

function StorageStrip({ meta, freeBytes }: { meta?: UserFileStorageMeta; freeBytes: number }) {
    const chips = meta ? [
        `${sizeLabel(meta.used_bytes)} занято`,
        `${sizeLabel(freeBytes)} свободно`,
        `${meta.files_count} / ${meta.max_files} файлов`,
        `${meta.public_files_count} / ${meta.max_public_files} публичных`,
        `максимум файла ${sizeLabel(meta.max_file_bytes)}`,
    ] : ["Загружаем лимиты хранилища"]

    return (
        <div className="rounded-2xl border bg-card/60 p-3 shadow-sm">
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground sm:text-sm">
                {chips.map((chip) => <span key={chip} className="rounded-full bg-muted/60 px-2.5 py-1">{chip}</span>)}
            </div>
            <Progress value={meta?.used_percent ?? 0} className="mt-3 h-2" />
        </div>
    )
}

// Upload uses a centered Dialog only; do not reintroduce Sheet/ScrollArea wrappers here.
function UploadDialog({
    open,
    onOpenChange,
    inputRef,
    selectedFile,
    title,
    visibility,
    folderId,
    folders,
    meta,
    freeBytes,
    dragActive,
    isPending,
    onCancel,
    onChoose,
    onTitleChange,
    onVisibilityChange,
    onFolderChange,
    onDragActiveChange,
    onSubmit,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    inputRef: RefObject<HTMLInputElement | null>
    selectedFile: File | null
    title: string
    visibility: "private" | "public"
    folderId: number | null
    folders: FileFolder[]
    meta?: UserFileStorageMeta
    freeBytes: number
    dragActive: boolean
    isPending: boolean
    onCancel: () => void
    onChoose: (files: FileList | null) => void
    onTitleChange: (value: string) => void
    onVisibilityChange: (value: "private" | "public") => void
    onFolderChange: (value: number | null) => void
    onDragActiveChange: (active: boolean) => void
    onSubmit: () => void
}) {
    const canUpload = Boolean(selectedFile) && !isPending

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => {
            onOpenChange(nextOpen)
            if (!nextOpen) onCancel()
        }}>
            <DialogContent className="z-[60] max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Загрузка файла</DialogTitle>
                    <DialogDescription>Выберите файл и настройте доступ перед загрузкой.</DialogDescription>
                </DialogHeader>

                <div className="space-y-5">
                    <div
                        onDragEnter={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            onDragActiveChange(true)
                        }}
                        onDragLeave={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            onDragActiveChange(false)
                        }}
                        onDragOver={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            onDragActiveChange(true)
                        }}
                        onDrop={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            onDragActiveChange(false)
                            onChoose(event.dataTransfer.files)
                        }}
                        className={`flex min-h-36 flex-col items-center justify-center rounded-3xl border border-dashed p-5 text-center transition ${dragActive ? "border-primary bg-primary/10" : "bg-muted/30 hover:bg-muted/50"}`}
                    >
                        <UploadCloud className="mb-3 size-9 text-primary" />
                        <div className="font-medium">Перетащите файл сюда</div>
                        <p className="mt-1 text-sm text-muted-foreground">или выберите файл с устройства</p>
                        <Button className="mt-4" variant="outline" onClick={() => inputRef.current?.click()} disabled={isPending}>
                            Выбрать файл
                        </Button>
                        <input
                            ref={inputRef}
                            type="file"
                            className="hidden"
                            disabled={isPending}
                            onChange={(event) => {
                                onChoose(event.target.files)
                                event.currentTarget.value = ""
                            }}
                        />
                    </div>

                    {selectedFile ? (
                        <div className="rounded-2xl border bg-card/60 p-3 text-sm">
                            <div className="break-words font-medium">{selectedFile.name}</div>
                            <div className="mt-1 text-muted-foreground">{sizeLabel(selectedFile.size)} · {selectedFile.type || "тип не определён"}</div>
                        </div>
                    ) : null}

                    <div className="space-y-2">
                        <Label>Название</Label>
                        <Input value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="Например: demo-report.pdf" />
                        <p className="text-xs text-muted-foreground">Если оставить пустым, название будет взято из имени файла.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Доступ</Label>
                        <Select value={visibility} onValueChange={(value) => onVisibilityChange(value as "private" | "public")}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="private">Приватный</SelectItem>
                                <SelectItem value="public">Публичный</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Папка</Label>
                        <Select value={folderId ? String(folderId) : "none"} onValueChange={(value) => onFolderChange(value === "none" ? null : Number(value))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Без папки</SelectItem>
                                {folders.map((folder) => <SelectItem key={folder.id} value={String(folder.id)}>{folder.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {visibility === "public" ? (
                        <Alert>
                            <ShieldAlert className="size-4" />
                            <AlertDescription>{PUBLIC_WARNING}</AlertDescription>
                        </Alert>
                    ) : null}

                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                        <LimitChip label="Максимум файла" value={meta ? sizeLabel(meta.max_file_bytes) : "—"} />
                        <LimitChip label="Свободно места" value={meta ? sizeLabel(freeBytes) : "—"} />
                        <LimitChip label="Лимит файлов" value={meta ? `${meta.files_count} / ${meta.max_files}` : "—"} />
                        <LimitChip label="Публичные" value={meta ? `${meta.public_files_count} / ${meta.max_public_files}` : "—"} />
                    </div>

                    {selectedFile ? (
                        <div className="rounded-2xl border bg-card/60 p-3 text-sm">
                            <div className="break-words font-medium">{selectedFile.name}</div>
                            <div className="mt-1 text-muted-foreground">{sizeLabel(selectedFile.size)} · {selectedFile.type || "тип не определён"}</div>
                        </div>
                    ) : null}

                    <div className="space-y-2">
                        <Label>Название</Label>
                        <Input value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="Например: demo-report.pdf" />
                        <p className="text-xs text-muted-foreground">Если оставить пустым, название будет взято из имени файла.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Доступ</Label>
                        <Select value={visibility} onValueChange={(value) => onVisibilityChange(value as "private" | "public")}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="private">Приватный</SelectItem>
                                <SelectItem value="public">Публичный</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Папка</Label>
                        <Select value={folderId ? String(folderId) : "none"} onValueChange={(value) => onFolderChange(value === "none" ? null : Number(value))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Без папки</SelectItem>
                                {folders.map((folder) => <SelectItem key={folder.id} value={String(folder.id)}>{folder.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {visibility === "public" ? (
                        <Alert>
                            <ShieldAlert className="size-4" />
                            <AlertDescription>{PUBLIC_WARNING}</AlertDescription>
                        </Alert>
                    ) : null}

                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                        <LimitChip label="Максимум файла" value={meta ? sizeLabel(meta.max_file_bytes) : "—"} />
                        <LimitChip label="Свободно места" value={meta ? sizeLabel(freeBytes) : "—"} />
                        <LimitChip label="Лимит файлов" value={meta ? `${meta.files_count} / ${meta.max_files}` : "—"} />
                        <LimitChip label="Публичные" value={meta ? `${meta.public_files_count} / ${meta.max_public_files}` : "—"} />
                    </div>

                    {visibility === "public" ? (
                        <Alert>
                            <ShieldAlert className="size-4" />
                            <AlertDescription>{PUBLIC_WARNING}</AlertDescription>
                        </Alert>
                    ) : null}

                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                        <LimitChip label="Максимум файла" value={meta ? sizeLabel(meta.max_file_bytes) : "—"} />
                        <LimitChip label="Свободно места" value={meta ? sizeLabel(freeBytes) : "—"} />
                        <LimitChip label="Лимит файлов" value={meta ? `${meta.files_count} / ${meta.max_files}` : "—"} />
                        <LimitChip label="Публичные" value={meta ? `${meta.public_files_count} / ${meta.max_public_files}` : "—"} />
                    </div>
                </ScrollArea>
                <SheetFooter className="border-t">
                    <Button disabled={!canUpload} onClick={onSubmit}>
                        {isPending ? <Loader2 className="size-4 animate-spin" /> : null} Загрузить
                    </Button>
                    <Button variant="outline" onClick={onCancel}>Отмена</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}

function LimitChip({ label, value }: { label: string; value: string }) {
    return <div className="rounded-xl bg-muted/50 p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="font-medium">{value}</div></div>
}

function FileItem(props: {
    file: UserFile
    view: "grid" | "list"
    onCopy: () => void
    onDownload: () => void
    onEdit: () => void
    onToggleVisibility: () => void
    onDelete: () => void
}) {
    const content = props.view === "grid" ? <FileGridCard {...props} /> : <FileRow {...props} />
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{content}</ContextMenuTrigger>
            <ContextMenuContent>
                <FileMenuItems variant="context" {...props} />
            </ContextMenuContent>
        </ContextMenu>
    )
}

function FileRow({ file, onCopy, onDownload, onEdit, onToggleVisibility, onDelete }: Omit<Parameters<typeof FileItem>[0], "view">) {
    return (
        <div className="group flex min-w-0 flex-col gap-3 rounded-2xl border bg-card/60 p-3 transition hover:border-primary/30 hover:bg-card/80 sm:flex-row sm:items-center sm:justify-between">
            <FileIdentity file={file} />
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                <VisibilityBadge file={file} />
                <Button size="sm" variant="outline" asChild>
                    <Link href={`/files/${file.id}`}><Eye className="size-4" /> Открыть</Link>
                </Button>
                <FileDropdown file={file} onCopy={onCopy} onDownload={onDownload} onEdit={onEdit} onToggleVisibility={onToggleVisibility} onDelete={onDelete} />
            </div>
        </div>
    )
}

function FileGridCard({ file, onCopy, onDownload, onEdit, onToggleVisibility, onDelete }: Omit<Parameters<typeof FileItem>[0], "view">) {
    const Icon = fileIcon(file.kind)
    return (
        <div className="group relative min-w-0 rounded-2xl border bg-card/60 p-3 transition hover:border-primary/30 hover:bg-card/80">
            <div className="absolute right-3 top-3 z-10">
                <FileDropdown file={file} onCopy={onCopy} onDownload={onDownload} onEdit={onEdit} onToggleVisibility={onToggleVisibility} onDelete={onDelete} />
            </div>
            <div className="mb-3 flex h-32 items-center justify-center overflow-hidden rounded-2xl bg-muted/50 text-primary">
                {file.kind === "image" && file.preview_url ? (
                    <Image src={file.preview_url} alt="" width={320} height={180} unoptimized className="size-full object-cover" />
                ) : <Icon className="size-9" />}
            </div>
            <div className="min-w-0 space-y-2">
                <div className="line-clamp-2 min-h-10 font-medium">{file.title || file.original_name}</div>
                <div className="text-xs text-muted-foreground">{sizeLabel(file.size)} · {dateLabel(file.created_at)}</div>
                <div className="flex items-center justify-between gap-2">
                    <VisibilityBadge file={file} />
                    <Button size="sm" variant="outline" asChild>
                        <Link href={`/files/${file.id}`}><Eye className="size-4" /> Открыть</Link>
                    </Button>
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                    <Button variant="outline" onClick={onCancel}>Отмена</Button>
                    <Button disabled={!canUpload} onClick={onSubmit}>
                        {isPending ? <Loader2 className="size-4 animate-spin" /> : null} Загрузить
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function FullscreenDragOverlay({ visible }: { visible: boolean }) {
    return visible ? (
        <div className="pointer-events-none fixed inset-3 z-[55] flex items-center justify-center rounded-4xl border border-dashed border-primary/70 bg-background/45 p-4 text-center shadow-2xl backdrop-blur-[1px]">
            <div className="rounded-3xl border bg-card/90 px-6 py-5 text-foreground shadow-xl">
                <UploadCloud className="mx-auto mb-3 size-10 text-primary" />
                <div className="font-medium">Отпустите файл в любом месте, чтобы выбрать его</div>
            </div>
        </div>
    ) : null
}

function LimitChip({ label, value }: { label: string; value: string }) {
    return <div className="rounded-xl bg-muted/50 p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="font-medium">{value}</div></div>
}

function FileItem(props: {
    file: UserFile
    view: "grid" | "list"
    onCopy: () => void
    onDownload: () => void
    onEdit: () => void
    onToggleVisibility: () => void
    onTogglePinned: () => void
    onMove: () => void
    onDelete: () => void
}) {
    const content = props.view === "grid" ? <FileGridCard {...props} /> : <FileRow {...props} />
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{content}</ContextMenuTrigger>
            <ContextMenuContent>
                <FileMenuItems variant="context" {...props} />
            </ContextMenuContent>
        </ContextMenu>
    )
}

function FileRow({ file, onCopy, onDownload, onEdit, onToggleVisibility, onTogglePinned, onMove, onDelete }: Omit<Parameters<typeof FileItem>[0], "view">) {
    return (
        <div className="group flex min-w-0 flex-col gap-3 rounded-2xl border bg-card/60 p-3 transition hover:border-primary/30 hover:bg-card/80 sm:flex-row sm:items-center sm:justify-between">
            <FileIdentity file={file} />
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                <VisibilityBadge file={file} />
                <Button size="sm" variant="outline" asChild>
                    <Link href={`/files/${file.id}`}><Eye className="size-4" /> Открыть</Link>
                </Button>
                <FileDropdown file={file} onCopy={onCopy} onDownload={onDownload} onEdit={onEdit} onToggleVisibility={onToggleVisibility} onTogglePinned={onTogglePinned} onMove={onMove} onDelete={onDelete} />
            </div>
        </div>
    )
}

function FileGridCard({ file, onCopy, onDownload, onEdit, onToggleVisibility, onTogglePinned, onMove, onDelete }: Omit<Parameters<typeof FileItem>[0], "view">) {
    const Icon = fileIcon(file.kind)
    return (
        <div className="group relative min-w-0 rounded-2xl border bg-card/60 p-3 transition hover:border-primary/30 hover:bg-card/80">
            <div className="absolute right-3 top-3 z-10">
                <FileDropdown file={file} onCopy={onCopy} onDownload={onDownload} onEdit={onEdit} onToggleVisibility={onToggleVisibility} onTogglePinned={onTogglePinned} onMove={onMove} onDelete={onDelete} />
            </div>
            <div className="mb-3 flex h-32 items-center justify-center overflow-hidden rounded-2xl bg-muted/50 text-primary">
                {file.kind === "image" && file.preview_url ? (
                    <Image src={file.preview_url} alt="" width={320} height={180} unoptimized className="size-full object-cover" />
                ) : <Icon className="size-9" />}
            </div>
            <div className="min-w-0 space-y-2">
                <div className="line-clamp-2 min-h-10 font-medium">{file.is_pinned ? "📌 " : ""}{file.title || file.original_name}</div>
                <div className="text-xs text-muted-foreground">{sizeLabel(file.size)} · {dateLabel(file.created_at)}</div>
                <div className="flex items-center justify-between gap-2">
                    <VisibilityBadge file={file} />
                    <Button size="sm" variant="outline" asChild>
                        <Link href={`/files/${file.id}`}><Eye className="size-4" /> Открыть</Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}

function FileIdentity({ file }: { file: UserFile }) {
    const Icon = fileIcon(file.kind)
    const showOriginal = file.title && file.title !== file.original_name
    return (
        <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
                {file.kind === "image" && file.preview_url ? (
                    <Image src={file.preview_url} alt="" width={48} height={48} unoptimized className="size-full object-cover" />
                ) : <Icon className="size-5" />}
            </div>
            <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5"><span className="truncate font-medium">{file.title || file.original_name}</span>{file.is_pinned ? <Pin className="size-3.5 shrink-0 text-primary" /> : null}</div>
                {showOriginal ? <div className="truncate text-xs text-muted-foreground">{file.original_name}</div> : null}
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    <span>{file.mime_type || kindLabels[file.kind] || file.kind}</span>
                    <span>·</span>
                    <span>{sizeLabel(file.size)}</span>
                    <span>·</span>
                    <span>{dateLabel(file.created_at)}</span>
                </div>
            </div>
        </div>
    )
}

function VisibilityBadge({ file }: { file: UserFile }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Badge variant={file.visibility === "public" ? "secondary" : "outline"}>{file.visibility === "public" ? "Публичный" : "Приватный"}</Badge>
            </TooltipTrigger>
            <TooltipContent>{file.visibility === "public" ? "Доступен другим пользователям по ссылке" : "Доступен только вам"}</TooltipContent>
        </Tooltip>
    )
}

function FileDropdown(props: Omit<Parameters<typeof FileItem>[0], "view">) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Действия с файлом">
                    <MoreHorizontal className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <FileMenuItems variant="dropdown" {...props} />
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function FileMenuItems({ file, variant, onCopy, onDownload, onEdit, onToggleVisibility, onTogglePinned, onMove, onDelete }: Omit<Parameters<typeof FileItem>[0], "view"> & { variant: "dropdown" | "context" }) {
    const Item = variant === "dropdown" ? DropdownMenuItem : ContextMenuItem
    const Separator = variant === "dropdown" ? DropdownMenuSeparator : ContextMenuSeparator
    return (
        <>
            <Item asChild><Link href={`/files/${file.id}`}><Eye className="size-4" /> Открыть</Link></Item>
            <Item onSelect={onDownload}><Download className="size-4" /> Скачать</Item>
            {file.visibility === "public" ? <Item onSelect={onCopy}><Copy className="size-4" /> Скопировать ссылку</Item> : null}
            <Item onSelect={onEdit}><Pencil className="size-4" /> Переименовать / Настройки</Item>
            <Item onSelect={onTogglePinned}>{file.is_pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />} {file.is_pinned ? "Открепить" : "Закрепить"}</Item>
            <Item onSelect={onMove}><FolderOpen className="size-4" /> Переместить в папку</Item>
            <Item onSelect={onToggleVisibility}><FileCog className="size-4" /> {file.visibility === "public" ? "Сделать приватным" : "Опубликовать"}</Item>
            <Item asChild><Link href={`/files/${file.id}`}><Info className="size-4" /> Показать сведения</Link></Item>
            <Separator />
            <Item variant="destructive" onSelect={onDelete}><Trash2 className="size-4" /> Удалить</Item>
        </>
    )
}

function FileSkeleton({ view }: { view: "grid" | "list" }) {
    if (view === "grid") {
        return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-56 rounded-2xl" />)}</div>
    }
    return <div className="space-y-2">{Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-2xl" />)}</div>
}

function EmptyState({ hasFilters, smartFilter, onReset, onUpload }: { hasFilters: boolean; smartFilter: SmartFilter; onReset: () => void; onUpload: () => void }) {
    return (
        <Empty className="border">
            <EmptyHeader>
                <EmptyMedia variant="icon"><FolderOpen className="size-5" /></EmptyMedia>
                <EmptyTitle>{smartFilter === "pinned" ? "Закреплённых файлов нет" : smartFilter === "folder" ? "В папке пока нет файлов" : hasFilters ? "Ничего не найдено" : "Файлов пока нет"}</EmptyTitle>
                <EmptyDescription>{smartFilter === "pinned" ? "Закрепляйте важные файлы, чтобы быстро находить их здесь." : smartFilter === "folder" ? "Переместите сюда файлы или загрузите новый файл." : hasFilters ? "Попробуйте изменить поиск, тип файла или фильтр доступа." : "Загрузите первый файл, чтобы использовать его в чатах, публикациях и AI-помощнике."}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <Button onClick={hasFilters ? onReset : onUpload}>{hasFilters ? "Сбросить фильтры" : "Загрузить файл"}</Button>
            </EmptyContent>
        </Empty>
    )
}

function EditFileDialog(props: {
    file: UserFile | null
    title: string
    visibility: "private" | "public"
    isPending: boolean
    onOpenChange: (open: boolean) => void
    onTitleChange: (value: string) => void
    onVisibilityChange: (value: "private" | "public") => void
    onSubmit: () => void
}) {
    if (!props.file) return null
    return (
        <Dialog open={Boolean(props.file)} onOpenChange={props.onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Настройки файла</DialogTitle>
                    <DialogDescription>Измените название, доступ и проверьте сведения о файле.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Название</Label>
                        <Input value={props.title} onChange={(event) => props.onTitleChange(event.target.value)} placeholder={props.file.original_name} />
                    </div>
                    <div className="space-y-2">
                        <Label>Видимость</Label>
                        <Select value={props.visibility} onValueChange={(value) => props.onVisibilityChange(value as "private" | "public")}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="private">Приватный</SelectItem>
                                <SelectItem value="public">Публичный</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {props.visibility === "public" ? <Alert><ShieldAlert className="size-4" /><AlertDescription>{PUBLIC_WARNING}</AlertDescription></Alert> : null}
                    <div className="grid gap-2 rounded-2xl bg-muted/40 p-3 text-sm sm:grid-cols-2">
                        <Meta label="Оригинальное имя" value={props.file.original_name} />
                        <Meta label="Размер" value={sizeLabel(props.file.size)} />
                        <Meta label="MIME" value={props.file.mime_type || props.file.kind} />
                        <Meta label="Дата" value={dateLabel(props.file.created_at)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => props.onOpenChange(false)}>Отмена</Button>
                    <Button onClick={props.onSubmit} disabled={props.isPending}>{props.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Сохранить</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function Meta({ label, value }: { label: string; value: string }) {
    return <div className="min-w-0"><div className="text-xs text-muted-foreground">{label}</div><div className="truncate font-medium">{value}</div></div>
}

function MoveFileDialog({ file, folders, folderId, isPending, onOpenChange, onFolderChange, onSubmit }: {
    file: UserFile | null
    folders: FileFolder[]
    folderId: number | null
    isPending: boolean
    onOpenChange: (open: boolean) => void
    onFolderChange: (folderId: number | null) => void
    onSubmit: () => void
}) {
    if (!file) return null
    return (
        <Dialog open={Boolean(file)} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Переместить файл</DialogTitle>
                    <DialogDescription>Выберите папку для файла “{file.title || file.original_name}”.</DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <Label>Папка</Label>
                    <Select value={folderId ? String(folderId) : "none"} onValueChange={(value) => onFolderChange(value === "none" ? null : Number(value))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Без папки</SelectItem>
                            {folders.map((folder) => <SelectItem key={folder.id} value={String(folder.id)}>{folder.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
                    <Button onClick={onSubmit} disabled={isPending}>{isPending ? <Loader2 className="size-4 animate-spin" /> : null} Переместить</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function FolderDialog({ open, folder, name, color, isPending, onOpenChange, onNameChange, onColorChange, onSubmit }: {
    open: boolean
    folder: FileFolder | null
    name: string
    color: string
    isPending: boolean
    onOpenChange: (open: boolean) => void
    onNameChange: (name: string) => void
    onColorChange: (color: string) => void
    onSubmit: () => void
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{folder ? "Редактировать папку" : "Новая папка"}</DialogTitle>
                    <DialogDescription>Назовите папку и выберите цвет для панели файлов.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Название</Label>
                        <Input value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="Например: Диплом" />
                    </div>
                    <div className="space-y-2">
                        <Label>Цвет</Label>
                        <Input value={color} onChange={(event) => onColorChange(event.target.value)} placeholder="#7c3aed" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
                    <Button onClick={onSubmit} disabled={isPending}>{isPending ? <Loader2 className="size-4 animate-spin" /> : null} {folder ? "Сохранить" : "Создать"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function FilesCommandDialog(props: {
    open: boolean
    onOpenChange: (open: boolean) => void
    files: UserFile[]
    onUpload: () => void
    onReset: () => void
    setKind: (value: string) => void
    setVisibility: (value: string) => void
    setSort: (value: string) => void
    setSmartFilter: (value: SmartFilter) => void
}) {
    const run = (action: () => void) => {
        action()
        props.onOpenChange(false)
    }

    return (
        <CommandDialog open={props.open} onOpenChange={props.onOpenChange} title="Команды файлов" description="Быстрые действия с библиотекой файлов">
            <Command>
                <CommandInput placeholder="Найти команду или файл..." />
                <CommandList>
                    <CommandEmpty>Ничего не найдено</CommandEmpty>
                    <CommandGroup heading="Команды">
                        <CommandItem onSelect={props.onUpload}><UploadCloud className="size-4" /> Загрузить файл <CommandShortcut>Enter</CommandShortcut></CommandItem>
                        <CommandItem onSelect={() => run(props.onReset)}><FolderOpen className="size-4" /> Показать все файлы</CommandItem>
                        <CommandItem onSelect={() => run(() => props.setSmartFilter("pinned"))}><Pin className="size-4" /> Показать закреплённые</CommandItem>
                        <CommandItem onSelect={() => run(() => props.setSmartFilter("public"))}>Показать публичные</CommandItem>
                        <CommandItem onSelect={() => run(() => props.setVisibility("private"))}>Показать приватные</CommandItem>
                        <CommandItem onSelect={() => run(() => props.setKind("image"))}>Показать изображения</CommandItem>
                        <CommandItem onSelect={() => run(() => props.setKind("pdf"))}>Показать PDF</CommandItem>
                        <CommandItem onSelect={() => run(() => props.setKind("archive"))}><Archive className="size-4" /> Показать архивы</CommandItem>
                        <CommandItem onSelect={() => run(() => props.setKind("text"))}>Показать текстовые файлы</CommandItem>
                        <CommandItem onSelect={() => run(() => props.setSort("newest"))}>Сортировать по новым</CommandItem>
                        <CommandItem onSelect={() => run(() => props.setSort("size"))}>Сортировать по размеру</CommandItem>
                    </CommandGroup>
                    {props.files.length ? <CommandSeparator /> : null}
                    {props.files.length ? (
                        <CommandGroup heading="Файлы">
                            {props.files.slice(0, 12).map((file) => {
                                const Icon = fileIcon(file.kind)
                                return (
                                    <CommandItem key={file.id} onSelect={() => { window.location.href = `/files/${file.id}` }}>
                                        <Icon className="size-4" />
                                        <span className="truncate">{file.title || file.original_name}</span>
                                        <CommandShortcut>{kindLabels[file.kind] || file.kind}</CommandShortcut>
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                    ) : null}
                </CommandList>
            </Command>
        </CommandDialog>
    )
}

function ActionAlertDialog({ pendingAction, isDeleting, onOpenChange, onConfirm }: { pendingAction: PendingAction | null; isDeleting: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void }) {
    const isDelete = pendingAction?.type === "delete"
    const isFolderDelete = pendingAction?.type === "delete-folder"
    const isPublish = pendingAction?.type === "publish"
    const isDownload = pendingAction?.type === "download"
    const riskyOwnDownload = isDownload && pendingAction?.file?.is_owner && ["archive", "file"].includes(pendingAction.file.kind)

    const title = isFolderDelete ? "Удалить папку?" : isDelete ? "Удалить файл?" : isPublish ? "Сделать файл публичным?" : "Вы скачиваете файл другого пользователя"
    const description = isFolderDelete
        ? "Папка будет удалена, но файлы останутся и переместятся в «Без папки»."
        : isDelete
            ? "Файл будет удалён из хранилища. Это действие нельзя отменить."
            : isPublish
                ? PUBLIC_WARNING
                : riskyOwnDownload
                    ? "Архивы и файлы неизвестного типа могут содержать небезопасное содержимое."
                    : DOWNLOAD_WARNING
    const actionText = isFolderDelete ? "Удалить папку" : isDelete ? "Удалить" : isPublish ? "Сделать публичным" : "Скачать файл"

    return (
        <AlertDialog open={Boolean(pendingAction)} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} disabled={isDeleting} className={isDelete || isFolderDelete ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}>
                        {isDeleting ? <Loader2 className="size-4 animate-spin" /> : null} {actionText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
