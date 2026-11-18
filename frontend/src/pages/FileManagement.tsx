import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Download,
  Trash2,
  FolderOpen,
  FolderPlus,
  Search,
  Filter,
  File,
  FileText,
  Image,
  Code,
  Archive,
  Film,
  CheckCircle2,
  AlertTriangle,
  Folder,
  RefreshCw,
  MoreVertical,
  Plus,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import { VirtualFile, Folder as FolderType } from '../types';
import { useStorage } from '../context/StorageContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';

export const FileManagement: React.FC = () => {
  const { activeDevice, refreshDevices } = useStorage();
  const toast = useToast();

  const [files, setFiles] = useState<VirtualFile[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadMethod, setUploadMethod] = useState('first_fit');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Folder modal state
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<VirtualFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Clear all demo/files modal state
  const [clearAllModalOpen, setClearAllModalOpen] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    if (!activeDevice) return;
    try {
      setLoading(true);
      const params: any = {
        storage_id: activeDevice.id,
        sort_by: sortBy,
        order: sortOrder
      };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      if (selectedFolderId !== null) params.folder_id = selectedFolderId;

      const res = await api.getFiles(params);
      setFiles(res.files || []);

      const folderRes = await api.getFolders(activeDevice.id);
      setFolders(folderRes.folders || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [activeDevice?.id, selectedFolderId, sortBy, sortOrder, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFiles();
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error('Please select at least one file to upload');
      return;
    }
    if (!activeDevice) {
      toast.error('No active storage device found');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('storage_id', activeDevice.id.toString());
      formData.append('allocation_method', uploadMethod);
      if (selectedFolderId) {
        formData.append('folder_id', selectedFolderId.toString());
      }

      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('files', selectedFiles[i]);
      }

      const res = await api.uploadFiles(formData);
      const failed = res.results.filter((r: any) => !r.success);
      if (failed.length > 0) {
        toast.error(`Uploaded with errors: ${failed[0].error}`);
      } else {
        toast.success(`Successfully allocated ${res.results.length} file(s)!`);
      }

      setUploadModalOpen(false);
      setSelectedFiles(null);
      await fetchFiles();
      await refreshDevices();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.deleteFile(deleteTarget.id);
      toast.success(`File '${deleteTarget.name}' deleted and blocks released`);
      setDeleteTarget(null);
      await fetchFiles();
      await refreshDevices();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete file');
    } finally {
      setDeleting(false);
    }
  };

  const handleClearAllConfirm = async () => {
    if (!activeDevice) return;
    try {
      setClearingAll(true);
      await api.clearDemo(activeDevice.id);
      toast.success('All files removed! Storage is 100% free and ready for your files.');
      setClearAllModalOpen(false);
      await fetchFiles();
      await refreshDevices();
    } catch (err: any) {
      toast.error(err.message || 'Failed to clear storage');
    } finally {
      setClearingAll(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !activeDevice) return;
    try {
      await api.createFolder({
        name: newFolderName.trim(),
        storage_id: activeDevice.id
      });
      toast.success('Folder created successfully');
      setNewFolderName('');
      setFolderModalOpen(false);
      await fetchFiles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create folder');
    }
  };

  const getFileIcon = (type: string) => {
    const t = type.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(t)) return <Image className="w-4 h-4 text-purple-600" />;
    if (['pdf', 'docx', 'doc', 'txt', 'md'].includes(t)) return <FileText className="w-4 h-4 text-blue-600" />;
    if (['c', 'py', 'js', 'ts', 'java', 'html', 'json'].includes(t)) return <Code className="w-4 h-4 text-emerald-600" />;
    if (['zip', 'tar', 'gz', 'rar'].includes(t)) return <Archive className="w-4 h-4 text-amber-600" />;
    if (['mp4', 'mov', 'mkv'].includes(t)) return <Film className="w-4 h-4 text-rose-600" />;
    return <File className="w-4 h-4 text-ink-secondary" />;
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-primary">File Manager</h2>
          <p className="text-xs text-ink-secondary mt-0.5">
            Manage simulated files and inspect block extent allocations
          </p>
        </div>

        <div className="flex items-center gap-2">
          {files.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setClearAllModalOpen(true)}
              icon={<RotateCcw className="w-3.5 h-3.5 text-red-500" />}
              className="text-xs text-ink-secondary hover:text-red-600 hover:border-red-200"
              title="Delete all demo/current files to upload fresh files"
            >
              Clear Storage / Remove Demo
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setFolderModalOpen(true)}
            icon={<FolderPlus className="w-3.5 h-3.5" />}
          >
            New Folder
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setUploadModalOpen(true)}
            icon={<Upload className="w-3.5 h-3.5 text-lime" />}
          >
            Upload Files
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-secondary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files by name..."
              className="w-full pl-9 pr-4 py-2 bg-canvas-light/50 border border-subtle-border rounded-xl text-xs focus:outline-none focus:border-ink-primary"
            />
          </form>

          {/* Type Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setSelectedFolderId(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${selectedFolderId === null
                  ? 'bg-ink-primary text-white'
                  : 'bg-canvas-light text-ink-secondary hover:text-ink-primary'
                }`}
            >
              All Files
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFolderId(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${selectedFolderId === f.id
                    ? 'bg-ink-primary text-white'
                    : 'bg-canvas-light text-ink-secondary hover:text-ink-primary'
                  }`}
              >
                <Folder className="w-3 h-3" />
                {f.name}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Files Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-canvas-light/70 border-b border-subtle-border text-ink-secondary font-medium">
              <tr>
                <th className="py-3 px-4">File Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Blocks Used</th>
                <th className="py-3 px-4">Extents</th>
                <th className="py-3 px-4">Allocation Method</th>
                <th className="py-3 px-4">Fragmentation Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle-border">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="p-4">
                      <Skeleton className="h-4" />
                    </td>
                  </tr>
                ))
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ink-secondary">
                    <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-sm">No files uploaded yet</p>
                    <p className="text-xs text-ink-secondary mt-1">
                      Upload your first file or click <strong>DEMO DATA</strong> in the top bar.
                    </p>
                  </td>
                </tr>
              ) : (
                files.map((file) => (
                  <tr key={file.id} className="hover:bg-canvas-light/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: file.color_code || '#3B82F6' }}
                        />
                        <div className="flex items-center gap-2 font-medium text-ink-primary">
                          {getFileIcon(file.file_type)}
                          <span className="truncate max-w-[200px]" title={file.name}>
                            {file.name}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 uppercase font-mono text-[11px] text-ink-secondary">
                      {file.file_type}
                    </td>
                    <td className="py-3 px-4 font-mono text-ink-primary">
                      {file.file_size_bytes < 1024 * 1024
                        ? `${(file.file_size_bytes / 1024).toFixed(1)} KB`
                        : `${(file.file_size_bytes / (1024 * 1024)).toFixed(2)} MB`}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-ink-primary">
                      {file.allocated_blocks_count}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono">{file.extents_count}</span>
                    </td>
                    <td className="py-3 px-4 capitalize text-ink-secondary">
                      {file.allocation_method.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4">
                      {file.is_fragmented ? (
                        <Badge variant="danger">Fragmented ({file.extents_count} extents)</Badge>
                      ) : (
                        <Badge variant="lime">Optimal (1 Extent)</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={api.downloadFileUrl(file.id)}
                          className="p-1.5 rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-canvas-light transition-colors"
                          title="Download file"
                          download
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => setDeleteTarget(file)}
                          className="p-1.5 rounded-lg text-ink-secondary hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upload Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Simulated Files"
        description="Choose files and select the Operating System allocation algorithm"
        maxWidth="lg"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4 mt-2">
          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files) setSelectedFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${dragActive ? 'border-lime bg-lime/10' : 'border-subtle-border hover:border-ink-muted'
              }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => setSelectedFiles(e.target.files)}
            />
            <Upload className="w-8 h-8 mx-auto text-ink-secondary mb-2" />
            <div className="text-xs font-semibold text-ink-primary">
              Click to select files or drag & drop here
            </div>
            <div className="text-[11px] text-ink-secondary mt-1">
              Supports PDF, PNG, CSV, TXT, DOCX, BIN up to 50 MB
            </div>
            {selectedFiles && selectedFiles.length > 0 && (
              <div className="mt-3 inline-block px-3 py-1 rounded-full bg-ink-primary text-white text-xs">
                {selectedFiles.length} file(s) selected
              </div>
            )}
          </div>

          {/* Allocation Strategy Picker */}
          <div>
            <label className="block text-xs font-medium text-ink-primary mb-1.5">
              Allocation Algorithm Strategy
            </label>
            <select
              value={uploadMethod}
              onChange={(e) => setUploadMethod(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-subtle-border bg-white text-xs focus:outline-none focus:border-ink-primary"
            >
              <option value="first_fit">First Fit (Places in first available contiguous space)</option>
              <option value="best_fit">Best Fit (Minimizes Leftover Fragment)</option>
              <option value="contiguous">Contiguous Allocation (Requires Continuous Span)</option>
              <option value="linked">Linked Allocation (Pointer-chained Blocks)</option>
              <option value="indexed">Indexed Allocation (Index Node + Data Blocks)</option>
              <option value="scattered">Simulate Fragmentation (Scatters Blocks Non-Contiguously)</option>
            </select>
            <p className="text-[10px] text-ink-secondary mt-1.5 leading-relaxed">
              💡 <strong>OS Principle:</strong> On a fresh disk, all standard algorithms allocate consecutively (0% fragmentation). To create real fragmentation, delete a file in between to leave a gap, or choose <em>Simulate Fragmentation</em>.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-subtle-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setUploadModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={uploading}
              icon={<Upload className="w-3.5 h-3.5" />}
            >
              Allocate & Upload
            </Button>
          </div>
        </form>
      </Modal>

      {/* Folder Modal */}
      <Modal
        isOpen={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        title="Create New Folder"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateFolder} className="space-y-4 mt-2">
          <div>
            <label className="block text-xs font-medium text-ink-primary mb-1">Folder Name</label>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. Datasets"
              className="w-full px-3.5 py-2.5 rounded-xl border border-subtle-border text-xs focus:outline-none focus:border-ink-primary"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setFolderModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Create Folder
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete File Confirmation"
        description="This action will release its allocated virtual storage blocks back to the free pool."
        maxWidth="sm"
      >
        <div className="space-y-4 mt-3">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will release{' '}
            <strong>{deleteTarget?.allocated_blocks_count} blocks</strong>.
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setDeleteTarget(null)}
            >
              Keep File
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={deleting}
              onClick={handleDeleteConfirm}
            >
              Release & Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clear All / Remove Demo Data Modal */}
      <Modal
        isOpen={clearAllModalOpen}
        onClose={() => setClearAllModalOpen(false)}
        title="Clear All Files & Remove Demo Data"
        description="Reset this virtual disk to an empty clean state"
        maxWidth="sm"
      >
        <div className="space-y-4 mt-3">
          <div className="p-3.5 bg-canvas-light border border-subtle-border rounded-2xl text-xs space-y-1.5 text-ink-primary">
            <div className="font-semibold">Reset to clean disk:</div>
            <p className="text-ink-secondary text-[11px]">
              This will remove all {files.length} simulated files on <strong>{activeDevice?.name}</strong> and return all {activeDevice?.total_blocks || 100} blocks to 100% free status.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setClearAllModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={clearingAll}
              onClick={handleClearAllConfirm}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Clear & Start Fresh
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
