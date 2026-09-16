'use client'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  FolderOpen, 
  Upload, 
  FileText, 
  FileCode, 
  ArrowLeft 
} from 'lucide-react'

function KBModal({ onSave, onClose }: any) {
  const [form, setForm] = useState({ name: '', description: '', embedding_model: 'all-MiniLM-L6-v2', chunk_size: 512, chunk_overlap: 50 })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={20} color="var(--accent-primary)" /> Create Knowledge Base
        </div>
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="My Documents" />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <input className="form-input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="What's in this KB?" />
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Chunk Size: {form.chunk_size}</label>
            <input type="range" min="128" max="2048" step="128" value={form.chunk_size} onChange={e => set('chunk_size', parseInt(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Chunk Overlap: {form.chunk_overlap}</label>
            <input type="range" min="0" max="200" step="10" value={form.chunk_overlap} onChange={e => set('chunk_overlap', parseInt(e.target.value))} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Embedding Model</label>
          <select className="form-select" value={form.embedding_model} onChange={e => set('embedding_model', e.target.value)}>
            <option value="all-MiniLM-L6-v2">all-MiniLM-L6-v2 (Local, Fast)</option>
            <option value="nomic-embed-text">nomic-embed-text (via Ollama)</option>
          </select>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(form)} disabled={!form.name}>Create KB</button>
        </div>
      </div>
    </div>
  )
}

export default function KnowledgeBasesPage() {
  const [kbs, setKbs]         = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [docs, setDocs]       = useState<any[]>([])
  const [modal, setModal]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadKbs = () => api.kbs.list().then(setKbs)
  useEffect(() => { loadKbs() }, [])

  const selectKb = (kb: any) => {
    setSelected(kb)
    api.kbs.listDocs(kb.id).then(setDocs)
  }

  const handleCreate = async (data: any) => {
    await api.kbs.create(data); setModal(false); loadKbs()
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selected || !e.target.files?.[0]) return
    setUploading(true)
    try {
      await api.kbs.uploadDoc(selected.id, e.target.files[0])
      api.kbs.listDocs(selected.id).then(setDocs)
      loadKbs()
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Remove document?')) return
    await api.kbs.deleteDoc(selected.id, docId)
    api.kbs.listDocs(selected.id).then(setDocs)
  }

  const handleDeleteKb = async (id: string) => {
    if (!confirm('Delete this knowledge base and all its documents?')) return
    await api.kbs.delete(id); setSelected(null); setDocs([]); loadKbs()
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Knowledge Bases</h1>
          <p className="page-subtitle">Upload documents and create RAG-powered knowledge stores</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> New KB
        </button>
      </div>

      <div className="page-body" style={{ display: 'flex', gap: 20 }}>
        {/* KB List */}
        <div style={{ width: 280 }}>
          {kbs.length === 0
            ? <div className="empty-state">
                <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
                  <BookOpen size={36} color="var(--text-muted)" />
                </div>
                <div className="empty-state-title">No knowledge bases</div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setModal(true)}>Create one</button>
              </div>
            : kbs.map(kb => (
              <div key={kb.id} className={`card`} style={{ marginBottom: 12, cursor: 'pointer', borderColor: selected?.id === kb.id ? 'var(--accent-primary)' : undefined }} onClick={() => selectKb(kb)}>
                <div className="flex items-center justify-between">
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BookOpen size={16} color="var(--accent-cyan)" /> {kb.name}
                  </div>
                  <button className="btn-icon" onClick={e => { e.stopPropagation(); handleDeleteKb(kb.id) }} title="Delete KB">
                    <Trash2 size={14} color="#ef4444" />
                  </button>
                </div>
                <div className="text-sm text-muted" style={{ marginTop: 4 }}>{kb.description}</div>
                <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                  <span className="badge badge-cyan">{kb.document_count} docs</span>
                  <span className="badge badge-purple">chunk: {kb.chunk_size}</span>
                </div>
              </div>
            ))}
        </div>

        {/* Document Panel */}
        <div style={{ flex: 1 }}>
          {!selected
            ? <div className="empty-state card">
                <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
                  <ArrowLeft size={36} color="var(--text-muted)" />
                </div>
                <div className="empty-state-title">Select a Knowledge Base</div>
              </div>
            : <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FolderOpen size={20} color="var(--accent-primary)" /> {selected.name}
                  </h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.csv" style={{ display: 'none' }} onChange={handleUpload} />
                    <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Upload size={14} />
                      {uploading ? 'Uploading…' : 'Upload Document'}
                    </button>
                  </div>
                </div>
                <div className="text-sm text-muted mb-4">Embedding: <strong>{selected.embedding_model}</strong> · Supported: PDF, TXT, MD</div>

                {docs.length === 0
                  ? <div className="empty-state">
                      <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
                        <FileText size={36} color="var(--text-muted)" />
                      </div>
                      <div className="empty-state-title">No documents yet</div>
                      <div className="empty-state-desc">Upload a PDF, TXT, or Markdown file</div>
                    </div>
                  : docs.map((doc: any) => (
                    <div key={doc.id} className="doc-item">
                      <div className="doc-icon" style={{ display: 'flex', alignItems: 'center' }}>
                        {doc.content_type === 'application/pdf' ? <FileText size={20} color="#f43f5e" /> : <FileCode size={20} color="var(--accent-cyan)" />}
                      </div>
                      <div className="doc-info">
                        <div className="doc-name">{doc.filename}</div>
                        <div className="doc-meta">{(doc.size_bytes / 1024).toFixed(1)} KB · {doc.chunk_count} chunks</div>
                      </div>
                      <span className={`badge ${doc.status === 'ready' ? 'badge-green' : doc.status === 'error' ? 'badge-rose' : 'badge-amber'}`}>{doc.status}</span>
                      <button className="btn-icon btn-sm" onClick={() => handleDeleteDoc(doc.id)} title="Delete document">
                        <Trash2 size={14} color="#ef4444" />
                      </button>
                    </div>
                  ))
                }
              </div>
          }
        </div>
      </div>

      {modal && <KBModal onSave={handleCreate} onClose={() => setModal(false)} />}
    </>
  )
}
