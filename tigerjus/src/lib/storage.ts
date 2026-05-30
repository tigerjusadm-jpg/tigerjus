import { supabase } from './supabase'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export type MediaCategoria =
  | 'branding' | 'landing' | 'dashboard' | 'login'
  | 'mascote' | 'marketing' | 'tema' | 'campanha'

// ⚠️ Estes valores precisam bater EXATAMENTE com o CHECK constraint do banco:
// tipo IN ('png','webp','jpg','jpeg','svg','mp4','webm')
export type MediaTipo = 'png' | 'webp' | 'jpg' | 'jpeg' | 'svg' | 'mp4' | 'webm'

export const MEDIA_CATEGORIAS: MediaCategoria[] = [
  'branding', 'landing', 'dashboard', 'login',
  'mascote', 'marketing', 'tema', 'campanha',
]

export const MEDIA_CATEGORIA_LABEL: Record<MediaCategoria, string> = {
  branding:  'Branding',
  landing:   'Landing',
  dashboard: 'Dashboard',
  login:     'Login',
  mascote:   'Mascote',
  marketing: 'Marketing',
  tema:      'Tema',
  campanha:  'Campanha',
}

export const TIPOS_PERMITIDOS: MediaTipo[] = ['png','webp','jpg','jpeg','svg','mp4','webm']
export const TIPOS_IMAGEM: MediaTipo[] = ['png','webp','jpg','jpeg','svg']
export const TIPOS_VIDEO: MediaTipo[] = ['mp4','webm']

export function isImagem(tipo: string | null | undefined): boolean {
  return !!tipo && (TIPOS_IMAGEM as string[]).includes(tipo)
}

export function isVideo(tipo: string | null | undefined): boolean {
  return !!tipo && (TIPOS_VIDEO as string[]).includes(tipo)
}

export interface MediaAsset {
  id: string
  nome: string
  alt_text: string | null
  descricao: string | null
  categoria: MediaCategoria
  subcategoria: string | null
  tipo: MediaTipo
  mime_type: string
  url: string
  storage_path: string
  tamanho_kb: number | null
  largura: number | null
  altura: number | null
  tags: string[] | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
  criado_por: string | null
}

export interface UploadAssetParams {
  file: File
  categoria: MediaCategoria
  subcategoria?: string | null
  nome?: string
  alt_text?: string | null
  descricao?: string | null
  tags?: string[]
  criado_por?: string | null
}

export interface ListAssetsFilters {
  categoria?: MediaCategoria | ''
  subcategoria?: string
  busca?: string
  ativo?: boolean
  limit?: number
  offset?: number
}

const BUCKET = 'tigerjus-assets'

// ─── HELPERS INTERNOS ─────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function getExtension(filename: string): string {
  const m = filename.match(/\.([^.]+)$/)
  return m ? m[1].toLowerCase() : ''
}

// Mapeamento explícito de extensão → tipo permitido
const EXT_TO_TIPO: Record<string, MediaTipo> = {
  png:  'png',
  webp: 'webp',
  jpg:  'jpg',
  jpeg: 'jpeg',
  svg:  'svg',
  mp4:  'mp4',
  webm: 'webm',
}

// Fallback via mime quando a extensão estiver ausente/atípica
const MIME_TO_TIPO: Record<string, MediaTipo> = {
  'image/png':       'png',
  'image/webp':      'webp',
  'image/jpeg':      'jpg',   // jpeg também aceita
  'image/jpg':       'jpg',
  'image/svg+xml':   'svg',
  'video/mp4':       'mp4',
  'video/webm':      'webm',
}

/**
 * Retorna o tipo permitido (compatível com o CHECK constraint) ou null se inválido.
 * Estratégia: extensão primeiro (mais confiável), mime como fallback.
 */
function inferTipo(file: File): MediaTipo | null {
  const ext = getExtension(file.name)
  if (ext in EXT_TO_TIPO) return EXT_TO_TIPO[ext]
  const mime = file.type.toLowerCase()
  if (mime in MIME_TO_TIPO) return MIME_TO_TIPO[mime]
  return null
}

async function getImageDimensions(file: File): Promise<{ largura: number; altura: number } | null> {
  if (typeof window === 'undefined') return null
  if (!file.type.startsWith('image/')) return null
  return new Promise((resolve) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => { URL.revokeObjectURL(url); resolve({ largura: img.naturalWidth, altura: img.naturalHeight }) }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

// ─── URL PÚBLICA ──────────────────────────────────────────────────────────────

export function getPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  return data.publicUrl
}

// ─── UPLOAD ───────────────────────────────────────────────────────────────────

export async function uploadAsset(params: UploadAssetParams): Promise<{
  data: MediaAsset | null
  error: string | null
}> {
  const { file, categoria, subcategoria, nome, alt_text, descricao, tags, criado_por } = params

  if (!file) return { data: null, error: 'Nenhum arquivo fornecido.' }
  if (!MEDIA_CATEGORIAS.includes(categoria)) return { data: null, error: 'Categoria inválida.' }

  // Valida tipo ANTES de subir pro Storage
  const tipo = inferTipo(file)
  if (!tipo) {
    return {
      data: null,
      error: 'Formato não permitido. Aceitos: PNG, WEBP, JPG, JPEG, SVG, MP4, WEBM.',
    }
  }

  const ext = getExtension(file.name) || tipo
  const baseNome = nome || file.name.replace(/\.[^.]+$/, '')
  const nomeSlug = slugify(baseNome) || 'asset'
  const subPath = subcategoria ? `${slugify(subcategoria)}/` : ''
  const fileName = `${Date.now()}-${nomeSlug}.${ext}`
  const storagePath = `${categoria}/${subPath}${fileName}`

  // 1) Upload no Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) return { data: null, error: `Erro no upload: ${uploadError.message}` }

  const url = getPublicUrl(storagePath)
  const dims = await getImageDimensions(file)

  // 2) Insert na tabela
  const payload = {
    nome: baseNome,
    alt_text: alt_text || null,
    descricao: descricao || null,
    categoria,
    subcategoria: subcategoria || null,
    tipo,
    mime_type: file.type || 'application/octet-stream',
    url,
    storage_path: storagePath,
    tamanho_kb: Math.round(file.size / 1024),
    largura: dims?.largura ?? null,
    altura: dims?.altura ?? null,
    tags: tags && tags.length > 0 ? tags : null,
    ativo: true,
    criado_por: criado_por || null,
  }

  const { data, error: insertError } = await supabase
    .from('media_library')
    .insert(payload)
    .select()
    .single()

  if (insertError) {
    // Rollback do storage se o insert falhou
    await supabase.storage.from(BUCKET).remove([storagePath])
    return { data: null, error: `Erro ao gravar metadados: ${insertError.message}` }
  }

  return { data: data as MediaAsset, error: null }
}

// ─── LISTAGEM ─────────────────────────────────────────────────────────────────

export async function listAssets(filters: ListAssetsFilters = {}): Promise<{
  data: MediaAsset[]
  count: number
  error: string | null
}> {
  let query = supabase.from('media_library').select('*', { count: 'exact' })

  if (filters.categoria)    query = query.eq('categoria', filters.categoria)
  if (filters.subcategoria) query = query.eq('subcategoria', filters.subcategoria)
  if (filters.ativo !== undefined) query = query.eq('ativo', filters.ativo)
  if (filters.busca && filters.busca.trim()) {
    const t = filters.busca.trim()
    query = query.or(`nome.ilike.%${t}%,descricao.ilike.%${t}%,alt_text.ilike.%${t}%`)
  }

  query = query.order('criado_em', { ascending: false, nullsFirst: false })

  if (filters.limit !== undefined) {
    const offset = filters.offset || 0
    query = query.range(offset, offset + filters.limit - 1)
  }

  const { data, count, error } = await query
  if (error) return { data: [], count: 0, error: error.message }
  return { data: (data as MediaAsset[]) || [], count: count || 0, error: null }
}

// ─── UPDATE (apenas metadados — não move o arquivo) ───────────────────────────

export async function updateAsset(
  id: string,
  patch: Partial<Pick<MediaAsset, 'nome' | 'alt_text' | 'descricao' | 'categoria' | 'subcategoria' | 'tags' | 'ativo'>>
): Promise<{ data: MediaAsset | null; error: string | null }> {
  const { data, error } = await supabase
    .from('media_library')
    .update({ ...patch, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as MediaAsset, error: null }
}

// ─── DELETE (storage + tabela) ────────────────────────────────────────────────

export async function deleteAsset(id: string): Promise<{
  error: string | null
  deleted: MediaAsset | null
}> {
  const { data: asset, error: fetchError } = await supabase
    .from('media_library')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !asset) return { error: 'Asset não encontrado.', deleted: null }

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([asset.storage_path])
  if (storageError) return { error: `Erro ao remover do storage: ${storageError.message}`, deleted: null }

  const { error: deleteError } = await supabase.from('media_library').delete().eq('id', id)
  if (deleteError) return { error: `Erro ao remover registro: ${deleteError.message}`, deleted: null }

  return { error: null, deleted: asset as MediaAsset }
}
