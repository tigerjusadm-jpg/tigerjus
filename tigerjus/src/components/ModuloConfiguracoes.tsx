'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

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
    key: 'branding',
    label: 'Branding',
    icon: '🎨',
    keys: ['site_name', 'site_tagline', 'site_description', 'logo_url', 'favicon_url'],
  },
  {
    key: 'tema',
    label: 'Tema Visual',
    icon: '🖌️',
    keys: ['primary_color', 'secondary_color', 'background_color', 'accent_color'],
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
  {
    key: 'cta',
    label: 'CTAs e Textos',
    icon: '📢',
    keys: [
      'welcome_message',
      'cta_upgrade_title', 'cta_upgrade_subtitle', 'cta_upgrade_button',
      'landing_headline',
    ],
  },
  {
    key: 'social',
    label: 'Social e Suporte',
    icon: '💬',
    keys: ['whatsapp_url', 'instagram_url', 'telegram_url', 'email_suporte', 'youtube_url'],
  },
]

// Settings padrão para criar quando não existem
const DEFAULTS: Omit<AppSetting, 'id' | 'ativo'>[] = [
  // Branding
  { key: 'site_name',          value: 'TigerJus',                    type: 'text',    description: 'Nome da plataforma' },
  { key: 'site_tagline',       value: 'Estude como um Tigre.',       type: 'text',    description: 'Slogan exibido na landing' },
  { key: 'site_description',   value: '',                            type: 'text',    description: 'Descrição para SEO' },
  { key: 'logo_url',           value: '',                            type: 'text',    description: 'URL do logo principal' },
  { key: 'favicon_url',        value: '',                            type: 'text',    description: 'URL do favicon' },
  // Tema
  { key: 'primary_color',      value: '#D4A843',                     type: 'color',   description: 'Cor primária do tema' },
  { key: 'secondary_color',    value: '#E8621A',                     type: 'color',   description: 'Cor secundária do tema' },
  { key: 'background_color',   value: '#0a0a0a',                     type: 'color',   description: 'Cor de fundo principal' },
  { key: 'accent_color',       value: '#34d399',                     type: 'color',   description: 'Cor de destaque (sucesso)' },
  // Plataforma
  { key: 'max_free_days',      value: '3',                           type: 'number',  description: 'Dias do plano gratuito' },
  { key: 'max_free_questions', value: '15',                          type: 'number',  description: 'Questões grátis por dia' },
  { key: 'max_free_ia',        value: '5',                           type: 'number',  description: 'Perguntas IA grátis' },
  { key: 'maintenance_mode',   value: 'false',                       type: 'boolean', description: 'Ativa modo de manutenção' },
  { key: 'maintenance_message',value: 'Voltamos em breve.',          type: 'text',    description: 'Mensagem de manutenção' },
  // IA
  { key: 'ia_enabled',         value: 'true',                        type: 'boolean', description: 'IA jurídica habilitada globalmente' },
  { key: 'ia_model',           value: 'claude-sonnet-4-20250514',   type: 'text',    description: 'Modelo de IA utilizado' },
  { key: 'ia_max_tokens',      value: '1000',                        type: 'number',  description: 'Máximo de tokens por resposta' },
  { key: 'ia_system_prompt',   value: '',                            type: 'json',    description: 'System prompt base da IA jurídica' },
  // CTAs e Textos
  { key: 'welcome_message',      value: 'Bem-vindo de volta! Continue sua jornada jurídica.', type: 'text', description: 'Mensagem de boas-vindas no dashboard' },
  { key: 'cta_upgrade_title',    value: 'Desbloqueie o TigerJus Premium', type: 'text', description: 'Título do modal de upgrade' },
  { key: 'cta_upgrade_subtitle', value: 'Acesse conteúdo ilimitado.',     type: 'text', description: 'Subtítulo do modal de upgrade' },
  { key: 'cta_upgrade_button',   value: 'DESBLOQUEAR AGORA',              type: 'text', description: 'Texto do botão de upgrade' },
  { key: 'landing_headline',     value: 'O jeito mais inteligente de evoluir no Direito.', type: 'text', description: 'Headline da landing page' },
  // Social e Suporte
  { key: 'whatsapp_url',   value: '', type: 'text', description: 'Link do WhatsApp de suporte (ex: https://wa.me/5511999999999)' },
  { key: 'instagram_url',  value: '', type: 'text', description: 'Link do Instagram (ex: https://instagram.com/tigerjus)' },
  { key: 'telegram_url',   value: '', type: 'text', description: 'Link do Telegram (ex: https://t.me/tigerjus)' },
  { key: 'email_suporte',  value: '', type: 'text', description: 'E-mail de suporte (ex: suporte@tigerjus.com.br)' },
  { key: 'youtube_url',    value: '', type: 'text', description: 'Link do canal YouTube (ex: https://youtube.com/@tigerjus)' },
]

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
      // Cria setting que não existe ainda
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

  // Combina: defaults do grupo + o que já existe no banco para esse grupo
  const settingsDoGrupo = keysDoGrupo.map(key => {
    const def = DEFAULTS.find(d => d.key === key)
    return settings[key] || {
      id: '', key, value: def?.value || '', type: def?.type || 'text',
      description: def?.description || null, ativo: true,
    }
  })

  // Settings que existem no banco mas não estão em nenhum grupo
  const keysConhecidas = new Set(DEFAULTS.map(d => d.key))
  const settingsExtras = Object.values(settings).filter(s => !keysConhecidas.has(s.key))

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
            <span>{g.label}</span>
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
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

        {/* Header */}
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

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ height: 80, borderRadius: 12, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s infinite' }} />
            ))}
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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

                  {/* Preview para maintenance_mode */}
                  {s.key === 'maintenance_mode' && getValor(s.key) === 'true' && (
                    <div style={{
                      marginTop: 10, padding: '10px 14px',
                      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: 8, fontSize: 12, color: '#f87171',
                    }}>
                      ⚠️ Modo de manutenção ATIVO — usuários verão mensagem de manutenção ao acessar a plataforma.
                    </div>
                  )}

                  {/* Preview de cor */}
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
      </div>
    </div>
  )
}
