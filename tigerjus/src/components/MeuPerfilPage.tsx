'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TigerAvatar, TIGER_IDS, isTigerId } from '@/components/TigerAvatars'

/**
 * Página "Meu Perfil": escolher avatar de tigre + editar nome, faculdade,
 * período, cidade/UF e bio. Salva em profiles (só o próprio, protegido por RLS).
 *
 * Props: profile, onUpdate(novosCampos) -> atualiza o profile no app.
 */

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']
const PERIODOS = ['1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º', '9º', '10º', 'Formado(a)']

export default function MeuPerfilPage(props: any) {
  const profile = props?.profile
  const onUpdate = props?.onUpdate
  const [avatar, setAvatar] = useState<string>(isTigerId(profile?.avatar_url) ? profile.avatar_url : TIGER_IDS[0])
  const [nome, setNome] = useState<string>(profile?.nome || '')
  const [faculdade, setFaculdade] = useState<string>(profile?.faculdade || '')
  const [periodo, setPeriodo] = useState<string>(profile?.periodo || '')
  const [cidade, setCidade] = useState<string>(profile?.cidade || '')
  const [uf, setUf] = useState<string>(profile?.uf || '')
  const [bio, setBio] = useState<string>(profile?.bio || '')
  const [telefone, setTelefone] = useState<string>(profile?.telefone || '')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; txt: string } | null>(null)

  if (!profile?.id) {
    return <div style={{ flex: 1, padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Faça login para editar seu perfil.</div>
  }

  async function salvar() {
    if (salvando) return
    if (!nome.trim()) { setMsg({ tipo: 'erro', txt: 'Coloque seu nome.' }); return }
    setSalvando(true); setMsg(null)
    const tel = telefone.replace(/\D/g, '')
    if (tel && (tel.length < 10 || tel.length > 11)) { setMsg({ tipo: 'erro', txt: 'WhatsApp inválido. Use DDD + número (ex.: 11987654321).' }); setSalvando(false); return }
    const campos = { nome: nome.trim(), avatar_url: avatar, telefone: tel || null, faculdade: faculdade.trim() || null, periodo: periodo || null, cidade: cidade.trim() || null, uf: uf || null, bio: bio.trim() || null }
    const { error } = await supabase.from('profiles').update(campos).eq('id', profile.id)
    if (error) { setMsg({ tipo: 'erro', txt: 'Não foi possível salvar. Tente novamente.' }) }
    else { setMsg({ tipo: 'ok', txt: 'Perfil salvo! ✓' }); if (onUpdate) onUpdate(campos) }
    setSalvando(false)
  }

  const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }
  const input: React.CSSProperties = { width: '100%', background: 'var(--gray)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 13px', color: 'var(--white)', fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none' }

  return (
    <div style={{ flex: 1, padding: '24px 20px', overflowY: 'auto' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,4vw,30px)', fontWeight: 900, marginBottom: 4 }}>Meu <span style={{ color: 'var(--gold)' }}>Perfil</span></h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 22 }}>Escolha seu avatar e conte um pouco sobre você. Aparece na Comunidade e no ranking.</p>

        {/* topo: avatar atual + nome */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22, padding: 16, background: 'linear-gradient(135deg,rgba(212,168,67,0.10),rgba(232,98,26,0.05))', border: '1px solid rgba(212,168,67,0.22)', borderRadius: 16 }}>
          <div style={{ width: 76, height: 76, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, boxShadow: '0 4px 14px -4px rgba(0,0,0,0.5)' }}><TigerAvatar id={avatar} size={76} /></div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800 }}>{nome || 'Seu nome'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{[faculdade, periodo && `${periodo} período`, [cidade, uf].filter(Boolean).join('/')].filter(Boolean).join(' · ') || 'Complete seus dados abaixo'}</div>
            <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700, marginTop: 4, textTransform: 'uppercase' }}>{profile?.plano || ''}</div>
          </div>
        </div>

        {/* galeria de avatares */}
        <label style={label}>Escolha seu tigre</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(56px,1fr))', gap: 10, marginBottom: 24 }}>
          {TIGER_IDS.map(tid => (
            <button key={tid} onClick={() => setAvatar(tid)} title="Escolher este avatar" style={{ padding: 3, borderRadius: '50%', cursor: 'pointer', background: 'none', border: avatar === tid ? '3px solid var(--gold)' : '3px solid transparent', boxShadow: avatar === tid ? '0 0 12px -2px var(--gold)' : 'none', lineHeight: 0 }}>
              <span style={{ display: 'block', width: '100%', aspectRatio: '1', borderRadius: '50%', overflow: 'hidden' }}><TigerAvatar id={tid} size={54} /></span>
            </button>
          ))}
        </div>

        {/* campos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>Nome</label>
            <input style={input} value={nome} maxLength={60} onChange={e => setNome(e.target.value)} placeholder="Seu nome" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>Faculdade</label>
            <input style={input} value={faculdade} maxLength={80} onChange={e => setFaculdade(e.target.value)} placeholder="Ex.: Universidade de São Paulo" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>WhatsApp <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>(com DDD — usamos só para avisos importantes)</span></label>
            <input style={input} value={telefone} maxLength={15} onChange={e => setTelefone(e.target.value)} placeholder="Ex.: 11987654321" inputMode="numeric" />
          </div>
          <div>
            <label style={label}>Período</label>
            <select style={input} value={periodo} onChange={e => setPeriodo(e.target.value)}>
              <option value="">—</option>
              {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>UF</label>
            <select style={input} value={uf} onChange={e => setUf(e.target.value)}>
              <option value="">—</option>
              {UFS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>Cidade</label>
            <input style={input} value={cidade} maxLength={60} onChange={e => setCidade(e.target.value)} placeholder="Sua cidade" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>Bio <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>({bio.length}/300)</span></label>
            <textarea style={{ ...input, resize: 'vertical', minHeight: 70 }} value={bio} maxLength={300} onChange={e => setBio(e.target.value)} placeholder="Uma frase sobre você e seus objetivos na OAB…" />
          </div>
        </div>

        {msg && <div style={{ marginTop: 14, fontSize: 13, fontWeight: 700, color: msg.tipo === 'ok' ? 'var(--success)' : 'var(--danger)' }}>{msg.txt}</div>}

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary" onClick={salvar} disabled={salvando} style={{ fontSize: 14, padding: '12px 28px' }}>{salvando ? 'Salvando…' : '💾 Salvar perfil'}</button>
        </div>
      </div>
    </div>
  )
}
