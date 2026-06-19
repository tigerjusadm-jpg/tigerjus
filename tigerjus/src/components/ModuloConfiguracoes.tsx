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

const GRUPOS: { key: string; label: string; icon: string; desc: string; keys: string[] }[] = [
  { key: 'marca',   label: 'Marca & Logo',         icon: '🎨', desc: 'Logo, favicon, nome, slogan e cores da marca.',
    keys: ['logo_url', 'favicon_url', 'site_name', 'site_tagline', 'site_description', 'primary_color', 'secondary_color'] },
  { key: 'fundo',   label: 'Fundo da plataforma',  icon: '🖼️', desc: 'Imagem, cor ou gradiente — com arraste pra posicionar.',
    keys: ['background_type', 'background_image_url', 'background_color', 'background_gradient', 'background_overlay_opacity', 'background_blur', 'background_position'] },
  { key: 'banner',  label: 'Banner do topo',       icon: '📢', desc: 'Banners de parceiros: imagem, link e liga/desliga.',
    keys: [] },
  { key: 'redes',   label: 'Redes & Contato',      icon: '🔗', desc: 'Instagram, WhatsApp, YouTube, TikTok, Telegram + e-mail.',
    keys: ['instagram_url', 'whatsapp_url', 'youtube_url', 'tiktok_url', 'telegram_url', 'email_suporte'] },
  { key: 'textos',  label: 'Textos da plataforma', icon: '✍️', desc: 'TODOS os textos da landing e do app num lugar só. Dica: ponha **palavra** pra deixá-la em dourado.',
    keys: ['hero_badge', 'hero_headline', 'hero_subtitle', 'hero_quote', 'hero_cta_primary',
           'final_cta_title', 'final_cta_subtitle', 'final_cta_button', 'final_cta_footer', 'footer_copyright',
           'welcome_message', 'dashboard_subtitle',
           'cta_upgrade_title', 'cta_upgrade_subtitle', 'cta_upgrade_button', 'upgrade_footer_text', 'cta_downgrade_button',
           'features_tag', 'features_title', 'features_subtitle',
           'como_funciona_tag', 'como_funciona_title',
           'depoimentos_tag', 'depoimentos_title',
           'depo_1_nome', 'depo_1_papel', 'depo_1_texto',
           'depo_2_nome', 'depo_2_papel', 'depo_2_texto',
           'depo_3_nome', 'depo_3_papel', 'depo_3_texto'] },
  { key: 'planos',  label: 'Planos & Limites',     icon: '💳', desc: 'Desconto anual e limites do modo degustação.',
    keys: ['max_free_days', 'max_free_questions', 'max_free_ia', 'desconto_anual_ativo', 'desconto_anual_percent'] },
  { key: 'ia',      label: 'IA Jurídica',          icon: '🤖', desc: 'Liga/desliga, saudação e instruções do tutor.',
    keys: ['ia_enabled', 'ia_welcome_message', 'ia_system_prompt'] },
  { key: 'sistema', label: 'Sistema',              icon: '🛠️', desc: 'Modo manutenção e mensagem para os usuários.',
    keys: ['maintenance_mode', 'maintenance_message'] },
  { key: 'avancado',label: 'Avançado',             icon: '🔧', desc: 'Campos extras e criação manual de chaves.',
    keys: [] },
]

// Sub-seções recolhíveis (sanfona) da aba "Textos da plataforma".
// O ADM vê uma lista limpa; clica numa seção e só então abrem os campos dela.
const SUBGRUPOS_TEXTOS: { label: string; icon: string; keys: string[] }[] = [
  { label: 'Topo da landing (Hero)',     icon: '🦅', keys: ['hero_badge', 'hero_headline', 'hero_subtitle', 'hero_quote', 'hero_cta_primary'] },
  { label: 'Seção "A Plataforma"',       icon: '🐯', keys: ['features_tag', 'features_title', 'features_subtitle'] },
  { label: 'Seção "Como Funciona"',      icon: '📍', keys: ['como_funciona_tag', 'como_funciona_title'] },
  { label: 'Seção "Depoimentos"',        icon: '⭐', keys: ['depoimentos_tag', 'depoimentos_title'] },
  { label: 'Depoimento 1',               icon: '💬', keys: ['depo_1_nome', 'depo_1_papel', 'depo_1_texto'] },
  { label: 'Depoimento 2',               icon: '💬', keys: ['depo_2_nome', 'depo_2_papel', 'depo_2_texto'] },
  { label: 'Depoimento 3',               icon: '💬', keys: ['depo_3_nome', 'depo_3_papel', 'depo_3_texto'] },
  { label: 'Chamada final (CTA)',        icon: '🚀', keys: ['final_cta_title', 'final_cta_subtitle', 'final_cta_button', 'final_cta_footer'] },
  { label: 'Rodapé',                     icon: '📄', keys: ['footer_copyright'] },
  { label: 'Dashboard (área logada)',    icon: '🏠', keys: ['welcome_message', 'dashboard_subtitle'] },
  { label: 'Modal de Upgrade',           icon: '🔓', keys: ['cta_upgrade_title', 'cta_upgrade_subtitle', 'cta_upgrade_button', 'upgrade_footer_text', 'cta_downgrade_button'] },
]

// Rótulos amigáveis (o ADM vê isto, não a "key" técnica)
const LABELS: Record<string, string> = {
  logo_url: 'Logo principal', favicon_url: 'Favicon (aba do navegador)',
  site_name: 'Nome do site', site_tagline: 'Slogan', site_description: 'Descrição (SEO)',
  primary_color: 'Cor principal', secondary_color: 'Cor secundária',
  hero_badge: 'Selo do topo (badge)', hero_headline: 'Título principal', hero_subtitle: 'Subtítulo',
  hero_quote: 'Frase de efeito', hero_cta_primary: 'Botão principal',
  final_cta_title: 'CTA final — título', final_cta_subtitle: 'CTA final — subtítulo',
  final_cta_button: 'CTA final — botão', final_cta_footer: 'CTA final — rodapé',
  footer_copyright: 'Copyright do rodapé',
  welcome_message: 'Boas-vindas (dashboard)', dashboard_subtitle: 'Subtítulo do dashboard',
  cta_upgrade_title: 'Upgrade — título', cta_upgrade_subtitle: 'Upgrade — subtítulo',
  cta_upgrade_button: 'Upgrade — botão', upgrade_footer_text: 'Upgrade — rodapé',
  cta_downgrade_button: 'Botão "continuar grátis"',
  max_free_days: 'Dias grátis', max_free_questions: 'Questões grátis por dia', max_free_ia: 'Perguntas de IA grátis',
  desconto_anual_ativo: 'Desconto anual ativo', desconto_anual_percent: 'Desconto anual (%)',
  ia_enabled: 'IA ligada', ia_welcome_message: 'Saudação do tutor IA', ia_system_prompt: 'Instruções do tutor (avançado)',
  maintenance_mode: 'Modo manutenção', maintenance_message: 'Mensagem de manutenção',
  features_tag: 'Plataforma — selo', features_title: 'Plataforma — título', features_subtitle: 'Plataforma — subtítulo',
  como_funciona_tag: 'Como Funciona — selo', como_funciona_title: 'Como Funciona — título',
  depoimentos_tag: 'Depoimentos — selo', depoimentos_title: 'Depoimentos — título',
  depo_1_nome: 'Depoimento 1 — nome', depo_1_papel: 'Depoimento 1 — papel', depo_1_texto: 'Depoimento 1 — texto',
  depo_2_nome: 'Depoimento 2 — nome', depo_2_papel: 'Depoimento 2 — papel', depo_2_texto: 'Depoimento 2 — texto',
  depo_3_nome: 'Depoimento 3 — nome', depo_3_papel: 'Depoimento 3 — papel', depo_3_texto: 'Depoimento 3 — texto',
}

// Dicas de tamanho recomendado (aparecem nos campos de imagem)
const HINTS: Record<string, string> = {
  logo_url: 'Quadrada · PNG transparente · ~512px',
  favicon_url: 'Quadrado · PNG · 64–128px',
}

// Chaves que abrem upload de imagem (miniatura + enviar)
const IMAGE_KEYS = new Set<string>(['logo_url', 'favicon_url'])

// Redes sociais (ícone + link + salvar, na mesma linha)
const SOCIAIS: { key: string; iconKey: string; label: string; emoji: string; ph: string }[] = [
  { key: 'instagram_url', iconKey: 'instagram_icon_url', label: 'Instagram', emoji: '📸', ph: 'instagram.com/seu_perfil' },
  { key: 'whatsapp_url',  iconKey: 'whatsapp_icon_url',  label: 'WhatsApp',  emoji: '💬', ph: 'wa.me/55999999999' },
  { key: 'youtube_url',   iconKey: 'youtube_icon_url',   label: 'YouTube',   emoji: '▶️', ph: 'youtube.com/@seucanal' },
  { key: 'tiktok_url',    iconKey: 'tiktok_icon_url',    label: 'TikTok',    emoji: '🎵', ph: 'tiktok.com/@seu_perfil' },
  { key: 'telegram_url',  iconKey: 'telegram_icon_url',  label: 'Telegram',  emoji: '✈️', ph: 't.me/seucanal' },
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
  { key: 'tiktok_url',         value: '', type: 'text', description: 'Link do TikTok' },
  { key: 'tiktok_icon_url',    value: '', type: 'text', description: 'URL de ícone customizado TikTok (vazio = emoji padrão)' },
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
  // Seções da landing + depoimentos (use **palavra** para dourado)
  { key: 'features_tag',        value: '🐯 A PLATAFORMA',                                              type: 'text', description: 'Selo da seção A Plataforma' },
  { key: 'features_title',      value: 'Tudo que você precisa para **ser aprovado.**',                 type: 'text', description: 'Título da seção A Plataforma' },
  { key: 'features_subtitle',   value: 'Uma experiência completa que combina tecnologia, disciplina e performance jurídica.', type: 'text', description: 'Subtítulo da seção A Plataforma' },
  { key: 'como_funciona_tag',   value: '📍 COMO FUNCIONA',                                             type: 'text', description: 'Selo da seção Como Funciona' },
  { key: 'como_funciona_title', value: 'Sua jornada no **TigerJus.**',                                 type: 'text', description: 'Título da seção Como Funciona' },
  { key: 'depoimentos_tag',     value: '⭐ DEPOIMENTOS',                                               type: 'text', description: 'Selo da seção Depoimentos' },
  { key: 'depoimentos_title',   value: 'Tigres que já **foram aprovados.**',                           type: 'text', description: 'Título da seção Depoimentos' },
  { key: 'depo_1_nome',  value: 'Fernanda O.',          type: 'text', description: 'Depoimento 1 — nome' },
  { key: 'depo_1_papel', value: 'Aprovada OAB 1ª Fase', type: 'text', description: 'Depoimento 1 — papel' },
  { key: 'depo_1_texto', value: 'A IA jurídica me salvou nas dúvidas de madrugada. Estudei 3 meses e fui aprovada. O TigerJus é diferente de tudo que usei.', type: 'text', description: 'Depoimento 1 — texto' },
  { key: 'depo_2_nome',  value: 'Gabriel M.',  type: 'text', description: 'Depoimento 2 — nome' },
  { key: 'depo_2_papel', value: 'Aprovado OAB', type: 'text', description: 'Depoimento 2 — papel' },
  { key: 'depo_2_texto', value: 'O sistema de ranking me fez estudar mais do que qualquer cursinho. A competição saudável com outros alunos é viciante.', type: 'text', description: 'Depoimento 2 — texto' },
  { key: 'depo_3_nome',  value: 'Isabela R.',       type: 'text', description: 'Depoimento 3 — nome' },
  { key: 'depo_3_papel', value: 'Estudante 5º ano', type: 'text', description: 'Depoimento 3 — papel' },
  { key: 'depo_3_texto', value: 'Os simulados são idênticos à OAB real. Minha taxa de acerto foi de 52% para 78% em apenas 6 semanas de uso.', type: 'text', description: 'Depoimento 3 — texto' },
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
  const previewRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const bgType = (getValor('background_type') || 'preset').toLowerCase().trim()
  const bgColor = getValor('background_color') || '#0a0a0a'
  const bgImageUrl = getValor('background_image_url')
  const bgGradient = getValor('background_gradient')
  const bgOverlay = parseInt(getValor('background_overlay_opacity') || '70', 10)
  const bgBlur = parseInt(getValor('background_blur') || '0', 10)
  const bgPosition = getValor('background_position') || 'center'

  // ── Posição via ARRASTE no preview (estilo "reposicionar capa") ──
  const clampPct = (n: number) => Math.max(0, Math.min(100, n))
  // Converte o valor salvo (keyword OU "x% y%") em números 0-100
  const parsePos = (v: string): { x: number; y: number } => {
    const k = (v || 'center').trim().toLowerCase()
    const KW: Record<string, [number, number]> = {
      'center': [50, 50], 'top': [50, 0], 'bottom': [50, 100], 'left': [0, 50], 'right': [100, 50],
      'top left': [0, 0], 'left top': [0, 0], 'top right': [100, 0], 'right top': [100, 0],
      'bottom left': [0, 100], 'left bottom': [0, 100], 'bottom right': [100, 100], 'right bottom': [100, 100],
    }
    if (KW[k]) return { x: KW[k][0], y: KW[k][1] }
    const m = k.match(/(-?\d+(?:\.\d+)?)%?\s+(-?\d+(?:\.\d+)?)%?/)
    if (m) return { x: clampPct(parseFloat(m[1])), y: clampPct(parseFloat(m[2])) }
    return { x: 50, y: 50 }
  }
  const posXY = parsePos(bgPosition)

  const onDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (bgType !== 'image' || !bgImageUrl) return
    const start = parsePos(bgPosition)
    dragRef.current = { x: e.clientX, y: e.clientY, px: start.x, py: start.y }
    setDragging(true)
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
  }
  const onDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    const el = previewRef.current
    if (!d || !el) return
    const rect = el.getBoundingClientRect()
    // "pega e arrasta": mover a imagem revela o lado oposto → subtrai o delta
    const nx = clampPct(d.px - ((e.clientX - d.x) / rect.width) * 100)
    const ny = clampPct(d.py - ((e.clientY - d.y) / rect.height) * 100)
    handleChange('background_position', `${Math.round(nx)}% ${Math.round(ny)}%`)
  }
  const onDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null
    setDragging(false)
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
  }

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

          {/* Posição da imagem — ARRASTE no preview abaixo para reposicionar */}
          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#888', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
              POSIÇÃO DA IMAGEM — <span style={{ color: '#D4A843' }}>{posXY.x}% {posXY.y}%</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 11, color: '#888', lineHeight: 1.5, flex: 1, minWidth: 180 }}>
                🖐 Arraste a imagem na <strong style={{ color: '#aaa' }}>prévia abaixo</strong> para posicionar. Ela sempre preenche a tela inteira (sem faixas/cortes brancos).
              </div>
              <button
                type="button"
                onClick={() => handleChange('background_position', '50% 50%')}
                style={{
                  fontSize: 11, fontWeight: 700, padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#aaa', whiteSpace: 'nowrap',
                }}
              >⟳ Centralizar</button>
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
        <div
          ref={previewRef}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          style={{
            ...previewStyle,
            ...(bgType === 'image' && bgImageUrl
              ? ({ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none', userSelect: 'none' } as React.CSSProperties)
              : {}),
          }}
        >
          {overlayStyle && <div style={overlayStyle} />}
          {bgType === 'image' && bgImageUrl && (
            <div style={{
              position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
              zIndex: 2, pointerEvents: 'none', whiteSpace: 'nowrap',
              fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
              background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.14)',
              color: '#e6e9f0', padding: '4px 10px', borderRadius: 100,
              backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
            }}>
              {dragging ? `${posXY.x}% ${posXY.y}%` : '🖐 Arraste para posicionar'}
            </div>
          )}
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

// ─── UPLOAD INLINE DE IMAGEM (logo, favicon, ícones sociais) ──────────────────
function AssetUploader({
  value, onChange, adminId, emoji, hint, compact,
}: {
  value: string
  onChange: (url: string) => void
  adminId?: string
  emoji?: string
  hint?: string
  compact?: boolean
}) {
  const [uploading, setUploading] = useState(false)
  const [hover, setHover] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setErr(null); setUploading(true)
    try {
      const { data, error } = await uploadAsset({
        file, categoria: 'branding', subcategoria: 'identidade',
        nome: file.name.replace(/\.[^.]+$/, ''),
        alt_text: 'Imagem da marca', descricao: 'Asset enviado pelo painel',
        criado_por: adminId || null,
      })
      if (error || !data) setErr(error || 'Erro ao enviar arquivo')
      else onChange(data.url)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erro inesperado no upload')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const thumb = (
    <div
      onClick={() => inputRef.current?.click()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Enviar / trocar imagem"
      style={{
        width: 48, height: 48, borderRadius: 11, flexShrink: 0, cursor: 'pointer',
        display: 'grid', placeItems: 'center', overflow: 'hidden', position: 'relative',
        background: value ? '#0a0a0a' : 'rgba(212,168,67,0.08)',
        border: '1px solid rgba(255,255,255,0.13)', fontSize: 22,
      }}
    >
      {value
        ? <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        : <span>{emoji || '＋'}</span>}
      <div style={{
        position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
        background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 9, fontWeight: 700,
        opacity: (hover || uploading) ? 1 : 0, transition: 'opacity 0.15s', pointerEvents: 'none',
      }}>
        {uploading ? '⏳' : '↑ trocar'}
      </div>
    </div>
  )

  if (compact) {
    return (
      <>
        <input ref={inputRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
        {thumb}
        {err && <span style={{ fontSize: 10, color: '#f87171' }}>{err}</span>}
      </>
    )
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {thumb}
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            type="text" value={value} onChange={e => onChange(e.target.value)}
            placeholder="cole a URL ou clique no ícone para enviar"
            style={{
              width: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12.5,
              outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' as const,
            }}
          />
          {hint && <div style={{ fontSize: 10.5, color: '#666', marginTop: 5 }}>{hint}</div>}
          {value && (
            <button onClick={() => onChange('')}
              style={{ marginTop: 6, background: 'none', border: 'none', color: '#a55', fontSize: 10.5, cursor: 'pointer', padding: 0 }}>
              remover
            </button>
          )}
        </div>
      </div>
      {err && <div style={{ fontSize: 11, color: '#f87171', marginTop: 6 }}>{err}</div>}
    </div>
  )
}

// ─── MÓDULO PRINCIPAL ─────────────────────────────────────────────────────────

export default function ModuloConfiguracoes({ adminId }: { adminId?: string }) {
  const [settings, setSettings]     = useState<Record<string, AppSetting>>({})
  const [editados, setEditados]     = useState<Record<string, string>>({})
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState<string | null>(null)
  const [saved, setSaved]           = useState<Record<string, boolean>>({})
  const [grupoAtivo, setGrupoAtivo] = useState('marca')
  const [subAberto, setSubAberto] = useState<string | null>(null)
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
    // Tem linha salva no banco → usa ela (mesmo se for vazia, respeita escolha do ADM)
    if (settings[key] !== undefined) return settings[key].value ?? ''
    // Não tem linha salva → mostra o valor PADRÃO (o mesmo texto que está no ar)
    return DEFAULTS.find(d => d.key === key)?.value ?? ''
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
  const editadosNo = (keys: string[]) => keys.filter(k => editados[k] !== undefined).length
  const salvarGrupo = async (keys: string[]) => { for (const k of keys) if (editados[k] !== undefined) await salvar(k) }
  const grupoSel = GRUPOS.find(g => g.key === grupoAtivo) || GRUPOS[0]

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 'clamp(16px,3vw,26px)' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>

        {/* GRID DE CARDS-CONCEITO */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 12, marginBottom: 22 }}>
          {GRUPOS.map(g => {
            const active = g.key === grupoAtivo
            const nedit = editadosNo(g.keys)
            return (
              <button key={g.key} onClick={() => setGrupoAtivo(g.key)} style={{
                textAlign: 'left', cursor: 'pointer', borderRadius: 16, padding: 16,
                background: active ? 'rgba(212,168,67,0.08)' : '#141414',
                border: active ? '1px solid rgba(212,168,67,0.5)' : '1px solid rgba(255,255,255,0.07)',
                transition: 'all 0.15s',
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, display: 'grid', placeItems: 'center', fontSize: 20, marginBottom: 10, background: 'rgba(212,168,67,0.09)', border: '1px solid rgba(212,168,67,0.18)' }}>{g.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{g.label}</div>
                <div style={{ fontSize: 11.5, color: '#777', lineHeight: 1.45, minHeight: 33 }}>{g.desc}</div>
                {nedit > 0 && <div style={{ marginTop: 9, fontSize: 10, fontWeight: 700, color: '#D4A843' }}>● {nedit} não salvo</div>}
              </button>
            )
          })}
        </div>

        {/* PAINEL DO GRUPO SELECIONADO */}
        <div style={{ background: '#101010', border: '1px solid rgba(212,168,67,0.2)', borderRadius: 18, padding: 'clamp(14px,2.5vw,22px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
            <div style={{ width: 44, height: 44, borderRadius: 11, display: 'grid', placeItems: 'center', fontSize: 22, background: 'rgba(212,168,67,0.12)', border: '1px solid rgba(212,168,67,0.3)' }}>{grupoSel.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{grupoSel.label}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{temAlteracoes ? `${Object.keys(editados).length} alteração(ões) não salva(s)` : 'Tudo salvo'}</div>
            </div>
            {grupoSel.keys.length > 0 && grupoAtivo !== 'fundo' && grupoAtivo !== 'redes' && (
              <button onClick={() => salvarGrupo(grupoSel.keys)} disabled={editadosNo(grupoSel.keys) === 0}
                style={{
                  background: editadosNo(grupoSel.keys) > 0 ? 'linear-gradient(135deg,#D4A843,#E8621A)' : 'rgba(255,255,255,0.05)',
                  color: editadosNo(grupoSel.keys) > 0 ? '#000' : '#555', border: 'none', borderRadius: 10,
                  padding: '10px 18px', fontSize: 13, fontWeight: 800,
                  cursor: editadosNo(grupoSel.keys) > 0 ? 'pointer' : 'not-allowed',
                }}>
                💾 Salvar
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...Array(3)].map((_, i) => <div key={i} style={{ height: 64, borderRadius: 12, background: 'rgba(255,255,255,0.04)' }} />)}
            </div>
          ) : grupoAtivo === 'fundo' ? (
            <BackgroundDesigner getValor={getValor} handleChange={handleChange} salvar={salvar} saving={saving} saved={saved} editados={editados} adminId={adminId} />
          ) : grupoAtivo === 'banner' ? (
            <ModuloCentralBanners adminId={adminId} />
          ) : grupoAtivo === 'redes' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div style={{ fontSize: 12, color: '#999', background: 'rgba(212,168,67,0.05)', border: '1px solid rgba(212,168,67,0.14)', borderRadius: 10, padding: '10px 13px', lineHeight: 1.5 }}>
                🖐 Clique no ícone para enviar/trocar a imagem, cole o link e salve. Preenchido = aparece no rodapé e na sidebar; vazio = ocultado.
              </div>
              {SOCIAIS.map(s => {
                const dirty = editados[s.key] !== undefined || editados[s.iconKey] !== undefined
                return (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#161616', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 13, padding: '12px 14px', flexWrap: 'wrap' }}>
                    <AssetUploader value={getValor(s.iconKey)} onChange={v => handleChange(s.iconKey, v)} adminId={adminId} emoji={s.emoji} compact />
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 5 }}>{s.label}</div>
                      <input value={getValor(s.key)} onChange={e => handleChange(s.key, e.target.value)} placeholder={s.ph}
                        style={{ width: '100%', background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '8px 11px', color: '#fff', fontSize: 12.5, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' as const }} />
                    </div>
                    <button onClick={async () => { if (editados[s.key] !== undefined) await salvar(s.key); if (editados[s.iconKey] !== undefined) await salvar(s.iconKey) }}
                      disabled={!dirty}
                      style={{ background: dirty ? 'linear-gradient(135deg,#D4A843,#E8621A)' : 'rgba(255,255,255,0.05)', color: dirty ? '#000' : '#555', border: 'none', borderRadius: 9, padding: '9px 15px', fontSize: 12, fontWeight: 800, cursor: dirty ? 'pointer' : 'not-allowed' }}>
                      {(saving === s.key || saving === s.iconKey) ? '⏳' : (saved[s.key] || saved[s.iconKey]) ? '✅' : 'Salvar'}
                    </button>
                  </div>
                )
              })}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#161616', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 13, padding: '12px 14px', flexWrap: 'wrap' }}>
                <div style={{ width: 48, height: 48, borderRadius: 11, flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 22, background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(255,255,255,0.13)' }}>✉️</div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 5 }}>E-mail de suporte</div>
                  <input value={getValor('email_suporte')} onChange={e => handleChange('email_suporte', e.target.value)} placeholder="suporte@tigerjus.com"
                    style={{ width: '100%', background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '8px 11px', color: '#fff', fontSize: 12.5, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' as const }} />
                </div>
                <button onClick={() => salvar('email_suporte')} disabled={editados['email_suporte'] === undefined}
                  style={{ background: editados['email_suporte'] !== undefined ? 'linear-gradient(135deg,#D4A843,#E8621A)' : 'rgba(255,255,255,0.05)', color: editados['email_suporte'] !== undefined ? '#000' : '#555', border: 'none', borderRadius: 9, padding: '9px 15px', fontSize: 12, fontWeight: 800, cursor: editados['email_suporte'] !== undefined ? 'pointer' : 'not-allowed' }}>
                  {saving === 'email_suporte' ? '⏳' : saved['email_suporte'] ? '✅' : 'Salvar'}
                </button>
              </div>
            </div>
          ) : grupoAtivo === 'avancado' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => setCriando(true)}
                style={{ alignSelf: 'flex-start', background: 'linear-gradient(135deg,#D4A843,#E8621A)', border: 'none', borderRadius: 8, padding: '8px 14px', color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                + Nova configuração
              </button>
              {settingsExtras.length === 0
                ? <div style={{ fontSize: 12, color: '#666' }}>Nenhum campo extra — está tudo organizado nos cards acima.</div>
                : settingsExtras.map(s => (
                  <div key={s.key} style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                      <code style={{ fontSize: 12, color: '#D4A843', background: 'rgba(212,168,67,0.08)', padding: '1px 7px', borderRadius: 4 }}>{s.key}</code>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {s.id && <button onClick={() => toggleAtivo(s as AppSetting)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '4px 8px', color: '#666', fontSize: 10, cursor: 'pointer' }}>{s.ativo ? 'Desativar' : 'Ativar'}</button>}
                        <button onClick={() => salvar(s.key)} style={{ background: editados[s.key] !== undefined ? 'linear-gradient(135deg,#D4A843,#E8621A)' : 'rgba(255,255,255,0.04)', color: editados[s.key] !== undefined ? '#000' : '#555', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{saving === s.key ? '⏳' : saved[s.key] ? '✅' : '💾'}</button>
                      </div>
                    </div>
                    <EditorCampo setting={{ ...s, value: getValor(s.key) } as AppSetting} onChange={v => handleChange(s.key, v)} />
                  </div>
                ))}
            </div>
          ) : grupoAtivo === 'textos' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {SUBGRUPOS_TEXTOS.map(sub => {
                const aberto = subAberto === sub.label
                const nedit = sub.keys.filter(k => editados[k] !== undefined).length
                return (
                  <div key={sub.label} style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden', background: '#141414' }}>
                    <button onClick={() => setSubAberto(aberto ? null : sub.label)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: aberto ? 'rgba(212,168,67,0.06)' : 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ fontSize: 18 }}>{sub.icon}</span>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#fff' }}>{sub.label}</span>
                      {nedit > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#D4A843' }}>● {nedit} não salvo</span>}
                      <span style={{ color: '#777', fontSize: 12 }}>{aberto ? '▲' : '▼'}</span>
                    </button>
                    {aberto && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '6px 16px 18px' }}>
                        {sub.keys.map(k => {
                          const def = DEFAULTS.find(d => d.key === k)
                          const setting: AppSetting = settings[k] || { id: '', key: k, value: def?.value || '', type: def?.type || 'text', description: def?.description || null, ativo: true }
                          return (
                            <div key={k}>
                              <label style={{ fontSize: 11, fontWeight: 700, color: '#aaa', display: 'block', marginBottom: 7 }}>{LABELS[k] || k}</label>
                              {IMAGE_KEYS.has(k)
                                ? <AssetUploader value={getValor(k)} onChange={v => handleChange(k, v)} adminId={adminId} hint={HINTS[k]} />
                                : <EditorCampo setting={{ ...setting, value: getValor(k) } as AppSetting} onChange={v => handleChange(k, v)} />}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {grupoSel.keys.map(k => {
                const def = DEFAULTS.find(d => d.key === k)
                const setting: AppSetting = settings[k] || { id: '', key: k, value: def?.value || '', type: def?.type || 'text', description: def?.description || null, ativo: true }
                return (
                  <div key={k}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#aaa', display: 'block', marginBottom: 7 }}>{LABELS[k] || k}</label>
                    {IMAGE_KEYS.has(k)
                      ? <AssetUploader value={getValor(k)} onChange={v => handleChange(k, v)} adminId={adminId} hint={HINTS[k]} />
                      : <EditorCampo setting={{ ...setting, value: getValor(k) } as AppSetting} onChange={v => handleChange(k, v)} />}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL NOVA CONFIG (avançado) */}
      {criando && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }} onClick={() => setCriando(false)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 301, width: '100%', maxWidth: 440, background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Nova Configuração</div>
              <button onClick={() => setCriando(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: 18 }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#555', display: 'block', marginBottom: 5 }}>KEY *</label>
                <input value={novaKey} onChange={e => setNovaKey(e.target.value)} placeholder="ex: minha_configuracao" style={{ width: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', color: '#D4A843', fontSize: 13, outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#555', display: 'block', marginBottom: 5 }}>TIPO</label>
                <select value={novoTipo} onChange={e => setNovoTipo(e.target.value)} style={{ width: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', colorScheme: 'dark' as const, fontFamily: 'inherit' }}>
                  {['text', 'boolean', 'color', 'number', 'json'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#555', display: 'block', marginBottom: 5 }}>DESCRIÇÃO</label>
                <input value={novaDesc} onChange={e => setNovaDesc(e.target.value)} placeholder="Para que serve esta configuração?" style={{ width: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button onClick={criarNova} disabled={!novaKey.trim() || saving === '__nova'} style={{ flex: 1, background: 'linear-gradient(135deg,#D4A843,#E8621A)', border: 'none', borderRadius: 8, padding: '11px', color: '#000', fontSize: 13, fontWeight: 700, cursor: !novaKey.trim() ? 'not-allowed' : 'pointer', opacity: !novaKey.trim() ? 0.5 : 1 }}>
                {saving === '__nova' ? '⏳ Criando...' : '+ Criar'}
              </button>
              <button onClick={() => setCriando(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '11px 16px', color: '#888', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
