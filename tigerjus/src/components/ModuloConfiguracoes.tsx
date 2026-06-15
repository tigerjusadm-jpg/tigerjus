'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import ModuloCentralBanners from '@/components/ModuloCentralBanners'
import { uploadAsset } from '@/lib/storage'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface AppSetting {
  id: string
  key: string
  value: string | null
  type: string
  description: string | null
  ativo: boolean
}

// ─── GRUPOS DE CONFIGURAÇÃO ───────────────────────────────────────────────────

const GRUPOS: { key: string; label: string; icon: string; keys: string[] }[] = [
  {
    key: 'landing',
    label: 'Landing Page',
    icon: '🌐',
    keys: [
      'hero_badge', 'hero_headline', 'hero_subtitle', 'hero_quote',
      'hero_cta_primary',
      'final_cta_title', 'final_cta_subtitle', 'final_cta_button', 'final_cta_footer',
      'footer_copyright',
    ],
  },
  // hero_media gerenciado pela Central de Banners (aba Banners)
  {
    key: 'banners',
    label: 'Banners',
    icon: '🖼️',
    keys: [],
  },
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: '🏠',
    keys: [
      'welcome_message', 'dashboard_subtitle',
      'ia_welcome_message',
      'upgrade_footer_text', 'cta_downgrade_button',
    ],
  },
  {
    key: 'cta',
    label: 'CTAs e Upgrade',
    icon: '📢',
    keys: [
      'cta_upgrade_title', 'cta_upgrade_subtitle', 'cta_upgrade_button',
    ],
  },
  {
    key: 'plano_anual',
    label: 'Plano Anual',
    icon: '📅',
    keys: ['desconto_anual_ativo', 'desconto_anual_percent'],
  },
  {
    key: 'social',
    label: 'Social e Suporte',
    icon: '💬',
    keys: ['whatsapp_url', 'instagram_url', 'telegram_url', 'email_suporte', 'youtube_url',
           'whatsapp_icon_url', 'instagram_icon_url', 'telegram_icon_url', 'youtube_icon_url'],
  },
  {
    key: 'branding',
    label: 'Branding',
    icon: '🎨',
    keys: ['site_name', 'site_tagline', 'site_description', 'logo_url', 'favicon_url'],
  },
  {
    key: 'tema',
    label: 'Tema Visual',
    icon: '🖌️',
    keys: [
      'primary_color', 'secondary_color', 'accent_color',
      // ── NOVO: Background customizável ──
      'background_type',
      'background_color',
      'background_image_url',
      'background_gradient',
      'background_overlay_opacity',
      'background_blur',
      'background_position',
      // ── FIM ──
      'background_style',
      'card_glow_enabled',
    ],
  },
  {
    key: 'plataforma',
    label: 'Plataforma',
    icon: '⚙️',
    keys: ['max_free_days', 'max_free_questions', 'max_free_ia', 'maintenance_mode', 'maintenance_message'],
  },
  {
    key: 'ia',
    label: 'IA Global',
    icon: '🤖',
    keys: ['ia_enabled', 'ia_model', 'ia_max_tokens', 'ia_system_prompt'],
  },
]

// Settings padrão para criar quando não existem
const DEFAULTS: Omit<AppSetting, 'id' | 'ativo'>[] = [
  // Landing Page
  { key: 'hero_badge',         value: 'Plataforma jurídica de nova geração',                          type: 'text', description: 'Badge animado acima do título hero' },
  { key: 'hero_headline',      value: 'O jeito mais inteligente de evoluir no Direito.',               type: 'text', description: 'Título principal da landing page (H1)' },
  { key: 'hero_subtitle',      value: 'Estude com IA, gamificação e metodologia de alta performance. Aprovação na OAB com método e inteligência.', type: 'text', description: 'Subtítulo abaixo do H1' },
  { key: 'hero_quote',         value: 'Não basta estudar Direito. É preciso pensar como um Tigre.',   type: 'text', description: 'Frase em itálico abaixo do subtítulo' },
  { key: 'hero_cta_primary',   value: '🐯 COMEÇAR GRÁTIS',                                            type: 'text', description: 'Texto do botão CTA principal do hero' },
  { key: 'final_cta_title',    value: 'Pronto para pensar como um Tigre?',                            type: 'text', description: 'Título da seção CTA final' },
  { key: 'final_cta_subtitle', value: 'Mais de 12.400 estudantes já estão evoluindo. Comece grátis e sinta a diferença.', type: 'text', description: 'Subtítulo da seção CTA final' },
  { key: 'final_cta_button',   value: 'COMEÇAR AGORA',                                                type: 'text', description: 'Texto do botão CTA final' },
  { key: 'final_cta_footer',   value: 'Sem cartão de crédito · Acesso imediato · 3 dias grátis',      type: 'text', description: 'Texto abaixo do botão CTA final' },
  { key: 'footer_copyright',   value: '© 2025 TigerJus',                                              type: 'text', description: 'Texto de copyright no footer' },
  // Hero Media
  { key: 'hero_media_enabled',   value: 'false', type: 'boolean', description: 'Ativa mídia no hero da landing' },
  { key: 'hero_media_type',      value: 'image', type: 'text',    description: 'Tipo de mídia: none | image | video' },
  { key: 'hero_media_url',       value: '',      type: 'text',    description: 'URL da imagem PNG/WebP ou vídeo MP4' },
  { key: 'hero_media_position',  value: 'right', type: 'text',    description: 'Posição: right | left | center | background' },
  { key: 'hero_media_opacity',   value: '90',    type: 'number',  description: 'Opacidade de 0 a 100' },
  { key: 'hero_media_animation', value: 'float', type: 'text',    description: 'Animação: none | float | pulse' },
  { key: 'hero_media_max_width', value: '650',   type: 'number',  description: 'Largura máxima da mídia em px (ex: 650)' },
  { key: 'hero_media_blur',      value: '0',     type: 'number',  description: 'Blur aplicado à mídia em px (0 = sem blur)' },
  // Banner Topo (mantido apenas para compatibilidade; gerenciado pela Central de Banners)
  { key: 'landing_top_banner_enabled', value: 'false', type: 'boolean', description: 'Ativa banner no topo da landing' },
  { key: 'landing_top_banner_url',     value: '',      type: 'text',    description: 'URL da imagem do banner (recomendado 1800×300px)' },
  { key: 'landing_top_banner_alt',     value: '',      type: 'text',    description: 'Texto alternativo do banner' },
  { key: 'landing_top_banner_link',    value: '',      type: 'text',    description: 'Link ao clicar no banner' },
  // Dashboard
  { key: 'welcome_message',      value: '🔥 Bem-vindo de volta! Continue sua jornada jurídica.', type: 'text', description: 'Notificação de boas-vindas no dashboard' },
  { key: 'dashboard_subtitle',   value: 'Comece seus estudos hoje.',                             type: 'text', description: 'Subtítulo abaixo do "Olá, [Nome]!"' },
  { key: 'ia_welcome_message',   value: 'Olá! Sou o TigerJus AI — seu tutor jurídico de alta performance. 🐯⚖️\n\nPosso te ajudar com dúvidas de Direito, explicar artigos, resumir temas e te preparar para a OAB.\n\nO que você quer aprender hoje?', type: 'text', description: 'Mensagem inicial da IA Jurídica' },
  { key: 'upgrade_footer_text',  value: 'A partir de R$1,99/mês · Cancele quando quiser',        type: 'text', description: 'Rodapé do modal de upgrade' },
  { key: 'cta_downgrade_button', value: 'Continuar no plano gratuito',                          type: 'text', description: 'Botão secundário do modal de upgrade' },
  // CTAs e Upgrade
  { key: 'cta_upgrade_title',    value: 'Desbloqueie o TigerJus Premium', type: 'text', description: 'Título do modal de upgrade' },
  { key: 'cta_upgrade_subtitle', value: 'Acesse conteúdo ilimitado.',     type: 'text', description: 'Subtítulo do modal de upgrade' },
  { key: 'cta_upgrade_button',   value: 'DESBLOQUEAR AGORA',              type: 'text', description: 'Texto do botão de upgrade' },
  // Plano Anual
  { key: 'desconto_anual_ativo',   value: 'false', type: 'boolean', description: 'Ativa desconto promocional no plano anual' },
  { key: 'desconto_anual_percent', value: '0',     type: 'number',  description: 'Percentual de desconto do anual (0 a 50). Aplicado só no anual.' },
  // Social e Suporte
  { key: 'whatsapp_url',       value: '', type: 'text', description: 'Link do WhatsApp (ex: https://wa.me/5511999999999)' },
  { key: 'instagram_url',      value: '', type: 'text', description: 'Link do Instagram (ex: https://instagram.com/tigerjus)' },
  { key: 'telegram_url',       value: '', type: 'text', description: 'Link do Telegram (ex: https://t.me/tigerjus)' },
  { key: 'email_suporte',      value: '', type: 'text', description: 'E-mail de suporte' },
  { key: 'youtube_url',        value: '', type: 'text', description: 'Link do YouTube' },
  { key: 'whatsapp_icon_url',  value: '', type: 'text', description: 'URL de ícone customizado WhatsApp (vazio = SVG padrão)' },
  { key: 'instagram_icon_url', value: '', type: 'text', description: 'URL de ícone customizado Instagram (vazio = SVG padrão)' },
  { key: 'telegram_icon_url',  value: '', type: 'text', description: 'URL de ícone customizado Telegram (vazio = SVG padrão)' },
  { key: 'youtube_icon_url',   value: '', type: 'text', description: 'URL de ícone customizado YouTube (vazio = SVG padrão)' },
  // Branding
  { key: 'site_name',          value: 'TigerJus',                    type: 'text',    description: 'Nome da plataforma' },
  { key: 'site_tagline',       value: 'Estude como um Tigre.',       type: 'text',    description: 'Slogan exibido na landing' },
  { key: 'site_description',   value: '',                            type: 'text',    description: 'Descrição para SEO' },
  { key: 'logo_url',           value: '',                            type: 'text',    description: 'URL do logo principal' },
  { key: 'favicon_url',        value: '',                            type: 'text',    description: 'URL do favicon' },
  // Tema Visual
  { key: 'primary_color',      value: '#D4A843',  type: 'color',   description: 'Cor primária do tema' },
  { key: 'secondary_color',    value: '#E8621A',  type: 'color',   description: 'Cor secundária do tema' },
  { key: 'background_color',   value: '#0a0a0a',  type: 'color',   description: 'Cor de fundo principal' },
  { key: 'accent_color',       value: '#34d399',  type: 'color',   description: 'Cor de destaque (sucesso)' },
  { key: 'background_style',   value: 'tech',     type: 'text',    description: 'Estilo do background: classic | tech | neon | gold | cyber | minimal' },
  { key: 'card_glow_enabled',  value: 'true',     type: 'boolean', description: 'Ativa efeito glow nos cards ao hover' },
  // ── NOVO: Background customizável ──
  { key: 'background_type',           value: 'preset', type: 'text',    description: 'Tipo de fundo: preset | color | image | gradient' },
  { key: 'background_image_url',      value: '',       type: 'text',    description: 'URL da imagem de fundo (recomendado 1920×1080px)' },
  { key: 'background_gradient',       value: '',       type: 'text',    description: 'Gradiente CSS personalizado (ex: linear-gradient(...))' },
  { key: 'background_overlay_opacity',value: '70',     type: 'number',  description: 'Opacidade do escurecimento sobre a imagem (0 a 100)' },
  { key: 'background_blur',           value: '0',      type: 'number',  description: 'Blur aplicado ao fundo em px (0 a 20)' },
  { key: 'background_position',       value: 'center', type: 'text',    description: 'Ancoragem da imagem (grid 3×3): center | top | bottom | left | right | top left | top right | bottom left | bottom right' },
  // ── FIM ──
  // Plataforma
  { key: 'max_free_days',      value: '3',                           type: 'number',  description: 'Dias do plano gratuito' },
  { key: 'max_free_questions', value: '15',                          type: 'number',  description: 'Questões grátis por dia' },
  { key: 'max_free_ia',        value: '5',                           type: 'number',  description: 'Perguntas IA grátis' },
  { key: 'maintenance_mode',   value: 'false',                       type: 'boolean', description: 'Ativa modo de manutenção' },
  { key: 'maintenance_message',value: 'Voltamos em breve.',          type: 'text',    description: 'Mensagem de manutenção' },
  // IA Global
  { key: 'ia_enabled',         value: 'true',                        type: 'boolean', description: 'IA jurídica habilitada globalmente' },
  { key: 'ia_model',           value: 'claude-sonnet-4-20250514',   type: 'text',    description: 'Modelo de IA utilizado' },
  { key: 'ia_max_tokens',      value: '1000',                        type: 'number',  description: 'Máximo de tokens por resposta' },
  { key: 'ia_system_prompt',   value: '',                            type: 'json',    description: 'System prompt base da IA jurídica' },
]

// ─── PRESETS DE GRADIENTE ─────────────────────────────────────────────────────
// Presets prontos pra clicar — facilitam criação sem conhecer sintaxe CSS

const GRADIENT_PRESETS: { name: string; value: string; preview: string }[] = [
  { name: 'TigerJus Gold',  value: 'linear-gradient(135deg, #D4A843 0%, #E8621A 100%)',                       preview: 'linear-gradient(135deg, #D4A843 0%, #E8621A 100%)' },
  { name: 'Noite Escura',   value: 'linear-gradient(180deg, #050505 0%, #1a1a1a 100%)',                       preview: 'linear-gradient(180deg, #050505 0%, #1a1a1a 100%)' },
  { name: 'Tech Blue',      value: 'linear-gradient(135deg, #070b14 0%, #1e293b 50%, #334155 100%)',          preview: 'linear-gradient(135deg, #070b14 0%, #1e293b 50%, #334155 100%)' },
  { name: 'Purple Dream',   value: 'linear-gradient(135deg, #1e0a3c 0%, #6b21a8 100%)',                       preview: 'linear-gradient(135deg, #1e0a3c 0%, #6b21a8 100%)' },
  { name: 'Sunset Red',     value: 'linear-gradient(135deg, #1a0a0a 0%, #7c2d12 100%)',                       preview: 'linear-gradient(135deg, #1a0a0a 0%, #7c2d12 100%)' },
  { name: 'Aurora',         value: 'linear-gradient(135deg, #064e3b 0%, #1e3a8a 50%, #581c87 100%)',          preview: 'linear-gradient(135deg, #064e3b 0%, #1e3a8a 50%, #581c87 100%)' },
]

// ─── BACKGROUND DESIGNER (componente novo) ────────────────────────────────────
// Renderizado APENAS na aba Tema Visual, ANTES dos campos antigos.
// Integra com o mesmo sistema de `editados` e `salvar` do componente pai.

interface BackgroundDesignerProps {
  getValor: (key: string) => string
  handleChange: (key: string, value: string) => void
  salvar: (key: string) => Promise<void>
  saving: string | null
  saved: Record<string, boolean>
  editados: Record<string, string>
  adminId?: string
}

function BackgroundDesigner({
  getValor, handleChange, salvar, saving, saved, editados, adminId,
}: BackgroundDesignerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const bgType = (getValor('background_type') || 'preset').toLowerCase().trim()
  const bgColor = getValor('background_color') || '#0a0a0a'
  const bgImageUrl = getValor('background_image_url')
  const bgGradient = getValor('background_gradient')
  const bgOverlay = parseInt(getValor('background_overlay_opacity') || '70', 10)
  const bgBlur = parseInt(getValor('background_blur') || '0', 10)
  const bgPosition = getValor('background_position') || 'center'
  const POSICOES = [
    { v: 'top left',     icon: '↖', label: 'Sup. esquerda' },
    { v: 'top',          icon: '↑', label: 'Topo' },
    { v: 'top right',    icon: '↗', label: 'Sup. direita' },
    { v: 'left',         icon: '←', label: 'Esquerda' },
    { v: 'center',       icon: '●', label: 'Centro' },
    { v: 'right',        icon: '→', label: 'Direita' },
    { v: 'bottom left',  icon: '↙', label: 'Inf. esquerda' },
    { v: 'bottom',       icon: '↓', label: 'Rodapé' },
    { v: 'bottom right', icon: '↘', label: 'Inf. direita' },
  ]

  // Keys que estão com alteração não salva
  const dirtyKeys = [
    'background_type', 'background_color', 'background_image_url',
    'background_gradient', 'background_overlay_opacity', 'background_blur',
    'background_position',
  ].filter(k => editados[k] !== undefined)

  const salvarTudo = async () => {
    for (const k of dirtyKeys) {
      await salvar(k)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)

    try {
      const { data, error } = await uploadAsset({
        file,
        categoria: 'tema',
        subcategoria: 'backgrounds',
        nome: file.name.replace(/\.[^.]+$/, ''),
        alt_text: 'Background da plataforma',
        descricao: 'Imagem de fundo customizada',
        criado_por: adminId || null,
      })

      if (error || !data) {
        setUploadError(error || 'Erro ao enviar arquivo')
      } else {
        handleChange('background_image_url', data.url)
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erro inesperado no upload')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const previewStyle: React.CSSProperties = (() => {
    const base: React.CSSProperties = {
      position: 'relative',
      width: '100%',
      minHeight: 180,
      borderRadius: 12,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: 24,
    }

    if (bgType === 'color') {
      return { ...base, background: bgColor }
    }
    if (bgType === 'gradient' && bgGradient) {
      return { ...base, background: bgGradient }
    }
    if (bgType === 'image' && bgImageUrl) {
      return {
        ...base,
        backgroundImage: `url("${bgImageUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: bgPosition,
        backgroundRepeat: 'no-repeat',
      }
    }
    return { ...base, background: '#070b14' }
  })()

  const overlayStyle: React.CSSProperties | undefined = bgType === 'image' && bgImageUrl
    ? {
        position: 'absolute', inset: 0,
        background: '#000',
        opacity: Math.max(0, Math.min(100, bgOverlay)) / 100,
        backdropFilter: bgBlur > 0 ? `blur(${Math.min(20, bgBlur)}px)` : undefined,
        WebkitBackdropFilter: bgBlur > 0 ? `blur(${Math.min(20, bgBlur)}px)` : undefined,
        pointerEvents: 'none',
      }
    : undefined

  const TYPE_CARDS = [
    { id: 'preset',   icon: '🎨', label: 'Preset', sub: 'Estilos prontos do sistema' },
    { id: 'color',    icon: '🟨', label: 'Cor sólida', sub: 'Uma cor única' },
    { id: 'image',    icon: '🖼️', label: 'Imagem', sub: 'Upload ou URL' },
    { id: 'gradient', icon: '🌈', label: 'Gradiente', sub: 'Transição de cores' },
  ]

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(212,168,67,0.04), rgba(232,98,26,0.02))',
      border: '1px solid rgba(212,168,67,0.2)',
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
    }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            🎨 Fundo da plataforma
          </h3>
          <p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
            Personalize o background de toda a plataforma — landing, dashboard e admin
          </p>
        </div>
        {dirtyKeys.length > 0 && (
          <button
            onClick={salvarTudo}
            disabled={saving !== null}
            style={{
              background: 'linear-gradient(135deg,#D4A843,#E8621A)',
              border: 'none', borderRadius: 8, padding: '8px 18px',
              color: '#000', fontSize: 12, fontWeight: 800,
              cursor: saving ? 'wait' : 'pointer',
              boxShadow: '0 4px 12px rgba(212,168,67,0.25)',
            }}
          >
            {saving ? '⏳ Salvando…' : `💾 Salvar (${dirtyKeys.length})`}
          </button>
        )}
      </div>

      {/* SELETOR DE TIPO — 4 CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 18 }}>
        {TYPE_CARDS.map(card => {
          const active = bgType === card.id
          return (
            <button
              key={card.id}
              onClick={() => handleChange('background_type', card.id)}
              style={{
                background: active
                  ? 'linear-gradient(135deg, rgba(212,168,67,0.18), rgba(232,98,26,0.08))'
                  : 'rgba(255,255,255,0.03)',
                border: active
                  ? '2px solid #D4A843'
                  : '2px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
                padding: '14px 12px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s',
                color: active ? '#D4A843' : '#888',
              }}
            >
              <div style={{ fontSize: 26, marginBottom: 6 }}>{card.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: active ? '#D4A843' : '#fff', marginBottom: 2 }}>
                {card.label}
              </div>
              <div style={{ fontSize: 10, color: active ? '#D4A843' : '#555', lineHeight: 1.4 }}>
                {card.sub}
              </div>
              {active && (
                <div style={{ marginTop: 6, fontSize: 9, fontWeight: 800, color: '#D4A843' }}>✓ ATIVO</div>
              )}
            </button>
          )
        })}
      </div>

      {/* CONTROLES CONTEXTUAIS */}

      {/* ── PRESET ── */}
      {bgType === 'preset' && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10,
          padding: '12px 14px',
          marginBottom: 14,
          fontSize: 12,
          color: '#888',
          lineHeight: 1.6,
        }}>
          📦 Modo preset ativo — o background usa o estilo definido em <code style={{color:'#D4A843'}}>background_style</code> abaixo (tech, neon, gold, cyber, minimal, classic).
        </div>
      )}

      {/* ── COR SÓLIDA ── */}
      {bgType === 'color' && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10,
          padding: 14,
          marginBottom: 14,
        }}>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#888', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
            COR DO FUNDO
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="color"
              value={bgColor}
              onChange={e => handleChange('background_color', e.target.value)}
              style={{ width: 50, height: 40, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'none' }}
            />
            <input
              type="text"
              value={bgColor}
              onChange={e => handleChange('background_color', e.target.value)}
              placeholder="#0a0a0a"
              style={{
                flex: 1, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13,
                outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      )}

      {/* ── IMAGEM ── */}
      {bgType === 'image' && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10,
          padding: 14,
          marginBottom: 14,
        }}>
          {/* Upload + URL */}
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#888', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
            IMAGEM DE FUNDO
          </label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                background: 'linear-gradient(135deg,#D4A843,#E8621A)',
                border: 'none', borderRadius: 8, padding: '10px 16px',
                color: '#000', fontSize: 12, fontWeight: 800,
                cursor: uploading ? 'wait' : 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {uploading ? '⏳ Enviando…' : '📤 Enviar imagem'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <input
              type="text"
              value={bgImageUrl}
              onChange={e => handleChange('background_image_url', e.target.value)}
              placeholder="ou cole uma URL https://..."
              style={{
                flex: 1, minWidth: 200, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13,
                outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box',
              }}
            />
            {bgImageUrl && (
              <button
                onClick={() => handleChange('background_image_url', '')}
                style={{
                  background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                  borderRadius: 8, padding: '10px 14px', color: '#f87171',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
                title="Limpar imagem"
              >
                ✕
              </button>
            )}
          </div>
          {uploadError && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#f87171' }}>⚠️ {uploadError}</div>
          )}
          <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>
            Recomendado: 1920×1080px · PNG, JPG ou WebP · até 2MB
          </div>

          {/* Posição da imagem — grid 3×3 (ancora qual parte aparece; mantém cover) */}
          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#888', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
              POSIÇÃO DA IMAGEM — <span style={{ color: '#D4A843' }}>{POSICOES.find(p => p.v === bgPosition)?.label || 'Centro'}</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, maxWidth: 172 }}>
              {POSICOES.map(p => {
                const ativo = bgPosition === p.v
                return (
                  <button
                    key={p.v}
                    type="button"
                    onClick={() => handleChange('background_position', p.v)}
                    title={p.label}
                    style={{
                      aspectRatio: '1', display: 'grid', placeItems: 'center',
                      borderRadius: 8, cursor: 'pointer', fontSize: 16, lineHeight: 1,
                      border: ativo ? '1px solid rgba(212,168,67,0.6)' : '1px solid rgba(255,255,255,0.1)',
                      background: ativo ? 'rgba(212,168,67,0.14)' : 'rgba(255,255,255,0.03)',
                      color: ativo ? '#D4A843' : '#777', fontWeight: 700, transition: 'all 0.15s',
                    }}
                  >{p.icon}</button>
                )
              })}
            </div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 6, lineHeight: 1.5 }}>
              Clique no ponto onde a imagem deve ancorar. A imagem sempre preenche a tela inteira (sem faixas/cortes brancos).
            </div>
          </div>

          {/* Overlay opacity */}
          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#888', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
              ESCURECIMENTO (overlay) — <span style={{ color: '#D4A843' }}>{bgOverlay}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={isNaN(bgOverlay) ? 70 : bgOverlay}
              onChange={e => handleChange('background_overlay_opacity', e.target.value)}
              style={{ width: '100%', accentColor: '#D4A843' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#444', marginTop: 2 }}>
              <span>0% (sem)</span>
              <span>50%</span>
              <span>100% (preto)</span>
            </div>
          </div>

          {/* Blur */}
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#888', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
              DESFOQUE (blur) — <span style={{ color: '#D4A843' }}>{bgBlur}px</span>
            </label>
            <input
              type="range"
              min="0"
              max="20"
              value={isNaN(bgBlur) ? 0 : bgBlur}
              onChange={e => handleChange('background_blur', e.target.value)}
              style={{ width: '100%', accentColor: '#D4A843' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#444', marginTop: 2 }}>
              <span>0px (nítido)</span>
              <span>10px</span>
              <span>20px (muito borrado)</span>
            </div>
          </div>
        </div>
      )}

      {/* ── GRADIENTE ── */}
      {bgType === 'gradient' && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10,
          padding: 14,
          marginBottom: 14,
        }}>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#888', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
            PRESETS DE GRADIENTE
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 14 }}>
            {GRADIENT_PRESETS.map(preset => {
              const isActive = bgGradient === preset.value
              return (
                <button
                  key={preset.name}
                  onClick={() => handleChange('background_gradient', preset.value)}
                  style={{
                    border: isActive ? '2px solid #D4A843' : '2px solid rgba(255,255,255,0.06)',
                    borderRadius: 10, padding: 0, overflow: 'hidden',
                    cursor: 'pointer', position: 'relative',
                    minHeight: 70,
                  }}
                >
                  <div style={{
                    width: '100%', height: 50,
                    background: preset.preview,
                  }} />
                  <div style={{
                    padding: '4px 8px', fontSize: 10, fontWeight: 700,
                    color: isActive ? '#D4A843' : '#aaa',
                    background: '#1a1a1a', textAlign: 'center',
                  }}>
                    {isActive ? '✓ ' : ''}{preset.name}
                  </div>
                </button>
              )
            })}
          </div>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#888', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
            OU GRADIENTE CSS PERSONALIZADO
          </label>
          <input
            type="text"
            value={bgGradient}
            onChange={e => handleChange('background_gradient', e.target.value)}
            placeholder="linear-gradient(135deg, #000 0%, #333 100%)"
            style={{
              width: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 12,
              outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box',
            }}
          />
          <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>
            Use sintaxe CSS válida. Os presets acima já vêm prontos.
          </div>
        </div>
      )}

      {/* PREVIEW */}
      <div>
        <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#888', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
          🎬 PRÉVIA DO FUNDO
        </label>
        <div style={previewStyle}>
          {overlayStyle && <div style={overlayStyle} />}
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div style={{
              fontFamily: 'serif', fontSize: 28, fontWeight: 900,
              background: 'linear-gradient(135deg, #F0C96A, #D4A843, #E8621A)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginBottom: 6,
            }}>
              🐯 TigerJus
            </div>
            <div style={{ fontSize: 13, color: '#fff', opacity: 0.85, marginBottom: 14 }}>
              Prévia do tema visual
            </div>
            <div style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #D4A843, #E8621A)',
              color: '#000', fontWeight: 800, fontSize: 11,
              padding: '8px 18px', borderRadius: 8,
              letterSpacing: '0.5px',
            }}>
              BOTÃO EXEMPLO
            </div>
          </div>
        </div>
        <div style={{ fontSize: 10, color: '#555', marginTop: 6, textAlign: 'center' }}>
          {dirtyKeys.length > 0
            ? '⚠️ Alterações não salvas — clique em "Salvar" acima para aplicar'
            : '✓ Configuração atual da plataforma'}
        </div>
      </div>
    </div>
  )
}

// ─── EDITOR POR TIPO ──────────────────────────────────────────────────────────

function EditorCampo({
  setting, onChange,
}: {
  setting: AppSetting
  onChange: (value: string) => void
}) {
  const val = setting.value ?? ''

  if (setting.type === 'boolean') {
    const isTrue = val === 'true'
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          onClick={() => onChange(isTrue ? 'false' : 'true')}
          style={{
            width: 44, height: 24, borderRadius: 12,
            background: isTrue ? '#D4A843' : '#374151',
            position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
          }}
        >
          <div style={{
            position: 'absolute', top: 3, left: isTrue ? 22 : 3,
            width: 18, height: 18, borderRadius: '50%',
            background: '#fff', transition: 'left 0.2s',
          }} />
        </div>
        <span style={{ fontSize: 13, color: isTrue ? '#D4A843' : '#555' }}>
          {isTrue ? 'Ativado' : 'Desativado'}
        </span>
      </div>
    )
  }

  if (setting.type === 'color') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          type="color"
          value={val || '#000000'}
          onChange={e => onChange(e.target.value)}
          style={{ width: 44, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'none' }}
        />
        <input
          type="text"
          value={val}
          onChange={e => onChange(e.target.value)}
          placeholder="#000000"
          style={{
            flex: 1, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13,
            outline: 'none', fontFamily: 'monospace',
          }}
        />
        {val && (
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: val, border: '1px solid rgba(255,255,255,0.15)',
            flexShrink: 0,
          }} />
        )}
      </div>
    )
  }

  if (setting.type === 'number') {
    return (
      <input
        type="number"
        value={val}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13,
          outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const,
        }}
      />
    )
  }

  if (setting.type === 'json') {
    return (
      <textarea
        value={val}
        onChange={e => onChange(e.target.value)}
        rows={4}
        placeholder='{"key": "value"}'
        style={{
          width: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '10px 12px', color: '#ccc', fontSize: 12,
          outline: 'none', resize: 'vertical', fontFamily: 'monospace',
          lineHeight: 1.6, boxSizing: 'border-box' as const,
        }}
      />
    )
  }

  // text (default)
  if (val.length > 80 || setting.key.includes('prompt') || setting.key.includes('message')) {
    return (
      <textarea
        value={val}
        onChange={e => onChange(e.target.value)}
        rows={3}
        placeholder={setting.description || ''}
        style={{
          width: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13,
          outline: 'none', resize: 'vertical', fontFamily: 'inherit',
          lineHeight: 1.6, boxSizing: 'border-box' as const,
        }}
      />
    )
  }

  return (
    <input
      type="text"
      value={val}
      onChange={e => onChange(e.target.value)}
      placeholder={setting.description || ''}
      style={{
        width: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13,
        outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const,
      }}
    />
  )
}

// ─── MÓDULO PRINCIPAL ─────────────────────────────────────────────────────────

export default function ModuloConfiguracoes({ adminId }: { adminId?: string }) {
  const [settings, setSettings]     = useState<Record<string, AppSetting>>({})
  const [editados, setEditados]     = useState<Record<string, string>>({})
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState<string | null>(null)
  const [saved, setSaved]           = useState<Record<string, boolean>>({})
  const [grupoAtivo, setGrupoAtivo] = useState('branding')
  const [novaKey, setNovaKey]       = useState('')
  const [novaDesc, setNovaDesc]     = useState('')
  const [novoTipo, setNovoTipo]     = useState('text')
  const [criando, setCriando]       = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('app_settings').select('*')
    if (data) {
      const map: Record<string, AppSetting> = {}
      for (const s of data as AppSetting[]) map[s.key] = s
      setSettings(map)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const getValor = (key: string): string => {
    if (editados[key] !== undefined) return editados[key]
    return settings[key]?.value ?? ''
  }

  const handleChange = (key: string, value: string) => {
    setEditados(e => ({ ...e, [key]: value }))
  }

  const salvar = async (key: string) => {
    if (!adminId) return
    setSaving(key)
    const valor = editados[key] ?? settings[key]?.value ?? ''
    const existing = settings[key]

    let error
    if (existing) {
      const res = await supabase
        .from('app_settings')
        .update({ value: valor, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      error = res.error
    } else {
      const def = DEFAULTS.find(d => d.key === key)
      const res = await supabase.from('app_settings').insert({
        key,
        value: valor,
        type: def?.type || 'text',
        description: def?.description || null,
        ativo: true,
      })
      error = res.error
    }

    if (!error) {
      await supabase.from('admin_audit_logs').insert({
        user_id: adminId,
        action_type: 'UPDATE',
        target_type: 'app_setting',
        target_id: key,
        metadata: { key, valor_anterior: settings[key]?.value, novo_valor: valor },
      })
      setSaved(s => ({ ...s, [key]: true }))
      setTimeout(() => setSaved(s => ({ ...s, [key]: false })), 2000)
      setEditados(e => { const n = { ...e }; delete n[key]; return n })
      await load()
    }
    setSaving(null)
  }

  const criarNova = async () => {
    if (!novaKey.trim() || !adminId) return
    setSaving('__nova')
    const { error } = await supabase.from('app_settings').insert({
      key: novaKey.trim().toLowerCase().replace(/\s+/g, '_'),
      value: '',
      type: novoTipo,
      description: novaDesc || null,
      ativo: true,
    })
    if (!error) {
      setNovaKey(''); setNovaDesc(''); setNovoTipo('text'); setCriando(false)
      await load()
    }
    setSaving(null)
  }

  const toggleAtivo = async (s: AppSetting) => {
    await supabase.from('app_settings').update({ ativo: !s.ativo }).eq('id', s.id)
    await load()
  }

  // Settings do grupo ativo que existem no banco
  const grupo = GRUPOS.find(g => g.key === grupoAtivo)
  const keysDoGrupo = grupo?.keys || []

  const settingsDoGrupo = keysDoGrupo.map(key => {
    const def = DEFAULTS.find(d => d.key === key)
    return settings[key] || {
      id: '', key, value: def?.value || '', type: def?.type || 'text',
      description: def?.description || null, ativo: true,
    }
  })

  // Settings que existem no banco mas não estão em nenhum grupo
  // ─── FILTRO: exclui keys de banners (gerenciadas pela Central de Banners) ───
  const BANNER_PREFIXES = ['landing_top_banner_', 'dashboard_banner_', 'hero_media_']
  const keysConhecidas = new Set(DEFAULTS.map(d => d.key))
  const settingsExtras = Object.values(settings).filter(s =>
    !keysConhecidas.has(s.key) &&
    !BANNER_PREFIXES.some(p => s.key.startsWith(p))
  )

  const temAlteracoes = Object.keys(editados).length > 0

  return (
    <div style={{ display: 'flex', gap: 0, height: '100%' }}>

      {/* ── SIDEBAR DE GRUPOS ── */}
      <div style={{
        width: 200, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.07)',
        paddingTop: 8, background: '#0f0f0f',
      }}>
        <div style={{ padding: '0 12px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#444', textTransform: 'uppercase' }}>
          SEÇÕES
        </div>
        {GRUPOS.map(g => (
          <button key={g.key} onClick={() => setGrupoAtivo(g.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '10px 14px', border: 'none',
              background: grupoAtivo === g.key ? 'rgba(212,168,67,0.08)' : 'transparent',
              borderLeft: grupoAtivo === g.key ? '2px solid #D4A843' : '2px solid transparent',
              cursor: 'pointer', textAlign: 'left', fontSize: 13,
              color: grupoAtivo === g.key ? '#D4A843' : '#888',
              fontWeight: grupoAtivo === g.key ? 700 : 400,
            }}>
            <span>{g.icon}</span>
            <span style={{ flex: 1 }}>{g.label}</span>
            {g.key === 'banners' && (
              <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4,
                background: 'rgba(212,168,67,0.2)', color: '#D4A843', letterSpacing: 0.5 }}>
                NOVO
              </span>
            )}
            {g.key === 'tema' && (
              <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4,
                background: 'rgba(76,175,125,0.2)', color: '#34d399', letterSpacing: 0.5 }}>
                PRO
              </span>
            )}
          </button>
        ))}
        {settingsExtras.length > 0 && (
          <button onClick={() => setGrupoAtivo('extras')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '10px 14px', border: 'none',
              background: grupoAtivo === 'extras' ? 'rgba(212,168,67,0.08)' : 'transparent',
              borderLeft: grupoAtivo === 'extras' ? '2px solid #D4A843' : '2px solid transparent',
              cursor: 'pointer', textAlign: 'left', fontSize: 13,
              color: grupoAtivo === 'extras' ? '#D4A843' : '#888',
              fontWeight: grupoAtivo === 'extras' ? 700 : 400,
            }}>
            <span>🔧</span>
            <span>Extras ({settingsExtras.length})</span>
          </button>
        )}
      </div>

      {/* ── CONTEÚDO ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: grupoAtivo === 'banners' ? 0 : 24 }}>

        {/* ── CENTRAL DE BANNERS (aba especial) ── */}
        {grupoAtivo === 'banners' ? (
          <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
            <ModuloCentralBanners adminId={adminId}/>
          </div>
        ) : (
          <>
            {/* Header (apenas para abas não-banners) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 2 }}>
                  {GRUPOS.find(g => g.key === grupoAtivo)?.icon} {GRUPOS.find(g => g.key === grupoAtivo)?.label || 'Configurações extras'}
                </h2>
                <div style={{ fontSize: 12, color: '#555' }}>
                  {temAlteracoes ? `${Object.keys(editados).length} alteração(ões) não salva(s)` : 'Todas as configurações salvas'}
                </div>
              </div>
              <button onClick={() => setCriando(true)}
                style={{
                  background: 'linear-gradient(135deg,#D4A843,#E8621A)', border: 'none',
                  borderRadius: 8, padding: '7px 14px', color: '#000', fontSize: 12,
                  fontWeight: 700, cursor: 'pointer',
                }}>
                + Nova config
              </button>
            </div>

            {/* ── NOVO: Background Designer (apenas na aba Tema Visual) ── */}
            {grupoAtivo === 'tema' && !loading && (
              <BackgroundDesigner
                getValor={getValor}
                handleChange={handleChange}
                salvar={salvar}
                saving={saving}
                saved={saved}
                editados={editados}
                adminId={adminId}
              />
            )}

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} style={{ height: 80, borderRadius: 12, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s infinite' }} />
                ))}
                <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* ── Header opcional para campos avançados na aba tema ── */}
                {grupoAtivo === 'tema' && (
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: 2,
                    color: '#666', textTransform: 'uppercase',
                    marginBottom: 4, marginTop: 8,
                    paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    ⚙️ Configurações avançadas (acesso direto às keys)
                  </div>
                )}
                {(grupoAtivo === 'extras' ? settingsExtras : settingsDoGrupo).map(s => {
                  const foiEditado = editados[s.key] !== undefined
                  const foiSalvo  = saved[s.key]
                  const salvando  = saving === s.key

                  return (
                    <div key={s.key} style={{
                      background: '#1a1a1a',
                      border: `1px solid ${foiEditado ? 'rgba(212,168,67,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: 12, padding: '16px 18px',
                      transition: 'border-color 0.2s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <code style={{ fontSize: 12, color: '#D4A843', background: 'rgba(212,168,67,0.08)', padding: '1px 7px', borderRadius: 4 }}>
                              {s.key}
                            </code>
                            <span style={{
                              fontSize: 9, padding: '2px 6px', borderRadius: 100, fontWeight: 700,
                              color: '#888', background: 'rgba(255,255,255,0.06)',
                            }}>
                              {s.type}
                            </span>
                            {!s.ativo && s.id && (
                              <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 100, color: '#f87171', background: 'rgba(248,113,113,0.1)' }}>
                                INATIVO
                              </span>
                            )}
                          </div>
                          {s.description && (
                            <div style={{ fontSize: 11, color: '#555' }}>{s.description}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {s.id && (
                            <button onClick={() => toggleAtivo(s as AppSetting)}
                              style={{
                                background: 'none', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 6, padding: '4px 8px', color: '#555',
                                fontSize: 10, cursor: 'pointer',
                              }}>
                              {s.ativo ? 'Desativar' : 'Ativar'}
                            </button>
                          )}
                          <button
                            onClick={() => salvar(s.key)}
                            disabled={salvando || (!foiEditado && !!s.id)}
                            style={{
                              background: foiSalvo
                                ? 'rgba(52,211,153,0.15)'
                                : foiEditado ? 'linear-gradient(135deg,#D4A843,#E8621A)' : 'rgba(255,255,255,0.04)',
                              border: foiSalvo ? '1px solid #34d399' : 'none',
                              borderRadius: 6, padding: '5px 12px',
                              color: foiSalvo ? '#34d399' : foiEditado ? '#000' : '#444',
                              fontSize: 11, fontWeight: 700,
                              cursor: (salvando || (!foiEditado && !!s.id)) ? 'not-allowed' : 'pointer',
                              opacity: salvando ? 0.7 : 1,
                              minWidth: 64, transition: 'all 0.2s',
                            }}>
                            {salvando ? '⏳' : foiSalvo ? '✅ Salvo' : !s.id ? '+ Criar' : '💾 Salvar'}
                          </button>
                        </div>
                      </div>

                      <EditorCampo
                        setting={{ ...s, value: getValor(s.key) } as AppSetting}
                        onChange={v => handleChange(s.key, v)}
                      />

                      {s.key === 'maintenance_mode' && getValor(s.key) === 'true' && (
                        <div style={{
                          marginTop: 10, padding: '10px 14px',
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                          borderRadius: 8, fontSize: 12, color: '#f87171',
                        }}>
                          ⚠️ Modo de manutenção ATIVO — usuários verão mensagem de manutenção ao acessar a plataforma.
                        </div>
                      )}

                      {s.key === 'primary_color' && getValor(s.key) && (
                        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: '#555' }}>Preview:</span>
                          <div style={{
                            background: `linear-gradient(135deg, ${getValor(s.key)}, #E8621A)`,
                            borderRadius: 6, padding: '5px 14px', fontSize: 11, fontWeight: 700, color: '#000',
                          }}>
                            Botão Exemplo
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Modal nova configuração */}
            {criando && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
                  onClick={() => setCriando(false)} />
                <div style={{
                  position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                  zIndex: 301, width: '100%', maxWidth: 440,
                  background: '#111', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 16, padding: 24, boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Nova Configuração</div>
                    <button onClick={() => setCriando(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: 18 }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#555', display: 'block', marginBottom: 5 }}>KEY *</label>
                      <input value={novaKey} onChange={e => setNovaKey(e.target.value)} placeholder="ex: minha_configuracao"
                        style={{ width: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', color: '#D4A843', fontSize: 13, outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' as const }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#555', display: 'block', marginBottom: 5 }}>TIPO</label>
                      <select value={novoTipo} onChange={e => setNovoTipo(e.target.value)}
                        style={{ width: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', colorScheme: 'dark' as const, fontFamily: 'inherit' }}>
                        {['text', 'boolean', 'color', 'number', 'json'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#555', display: 'block', marginBottom: 5 }}>DESCRIÇÃO</label>
                      <input value={novaDesc} onChange={e => setNovaDesc(e.target.value)} placeholder="Para que serve esta configuração?"
                        style={{ width: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                    <button onClick={criarNova} disabled={!novaKey.trim() || saving === '__nova'}
                      style={{
                        flex: 1, background: 'linear-gradient(135deg,#D4A843,#E8621A)', border: 'none',
                        borderRadius: 8, padding: '11px', color: '#000', fontSize: 13, fontWeight: 700,
                        cursor: !novaKey.trim() ? 'not-allowed' : 'pointer', opacity: !novaKey.trim() ? 0.5 : 1,
                      }}>
                      {saving === '__nova' ? '⏳ Criando...' : '+ Criar'}
                    </button>
                    <button onClick={() => setCriando(false)}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '11px 16px', color: '#888', fontSize: 13, cursor: 'pointer' }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
