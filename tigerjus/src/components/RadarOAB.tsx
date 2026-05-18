'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CalendarioOAB {
  id: number;
  numero_exame: number;
  edicao: string;
  data_edital_abertura: string;
  data_inscricao_inicio: string;
  data_inscricao_fim: string;
  data_edital_complementar: string;
  data_inscricao_reaproveitamento_inicio: string;
  data_inscricao_reaproveitamento_fim: string;
  data_prova_1fase: string;
  data_prova_2fase: string;
  observacao: string;
  link_oficial: string;
}

function diffDays(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function progressPct(startStr: string, endStr: string): number {
  const now = Date.now();
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  const pct = Math.round(((now - start) / (end - start)) * 100);
  return Math.min(100, Math.max(0, pct));
}

function isInscricaoAberta(inicio: string, fim: string): boolean {
  const now = new Date();
  return now >= new Date(inicio) && now <= new Date(fim);
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

interface ExameCardProps {
  exame: CalendarioOAB;
}

function ExameCard({ exame }: ExameCardProps) {
  const dias1fase = diffDays(exame.data_prova_1fase);
  const dias2fase = diffDays(exame.data_prova_2fase);
  const pct = progressPct(exame.data_edital_abertura, exame.data_prova_1fase);
  const inscAberta = isInscricaoAberta(exame.data_inscricao_inicio, exame.data_inscricao_fim);
  const isUrgente = dias1fase <= 30;
  const isProximo = dias1fase <= 90;

  return (
    <div
      style={{
        background: 'var(--color-background-primary)',
        border: isUrgente
          ? '1px solid #A32D2D'
          : isProximo
          ? '1px solid #BA7517'
          : '0.5px solid var(--color-border-tertiary)',
        borderRadius: 'var(--border-radius-lg)',
        padding: '1rem',
        marginBottom: '0.75rem',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
          {exame.numero_exame}º Exame OAB
        </span>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 500,
            padding: '2px 8px',
            borderRadius: '20px',
            background: isUrgente ? '#FCEBEB' : '#FAEEDA',
            color: isUrgente ? '#A32D2D' : '#854F0B',
          }}
        >
          {isUrgente ? 'Urgente!' : `${dias1fase}d restantes`}
        </span>
      </div>

      {/* Alerta inscrições abertas */}
      {inscAberta && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 8px',
            background: '#FAEEDA',
            borderRadius: 'var(--border-radius-md)',
            marginBottom: '0.75rem',
          }}
        >
          <span style={{ fontSize: '13px' }}>🔔</span>
          <span style={{ fontSize: '11px', color: '#854F0B', fontWeight: 500 }}>
            Inscrições abertas agora!
          </span>
        </div>
      )}

      {/* Countdown */}
      <div
        style={{
          background: 'var(--color-background-secondary)',
          borderRadius: 'var(--border-radius-md)',
          padding: '0.75rem',
          textAlign: 'center',
          marginBottom: '0.75rem',
        }}
      >
        <span
          style={{
            display: 'block',
            fontSize: '28px',
            fontWeight: 500,
            lineHeight: 1,
            color: isUrgente ? '#A32D2D' : isProximo ? '#BA7517' : 'var(--color-text-primary)',
          }}
        >
          {dias1fase}
        </span>
        <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
          dias para a 1ª fase
        </span>
      </div>

      {/* Fases */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#378ADD', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>1ª fase — prova objetiva</div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {formatDate(exame.data_prova_1fase)}
            </div>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
            {dias1fase}d
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#639922', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>2ª fase — prático-profissional</div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {formatDate(exame.data_prova_2fase)}
            </div>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
            {dias2fase}d
          </span>
        </div>
      </div>

      {/* Barra de progresso */}
      <div style={{ marginTop: '0.75rem' }}>
        <div
          style={{
            height: '3px',
            background: 'var(--color-border-tertiary)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: isUrgente ? '#E24B4A' : '#BA7517',
              borderRadius: '2px',
              transition: 'width 0.3s',
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: 'var(--color-text-tertiary)',
            marginTop: '3px',
          }}
        >
          <span>
            Inscrições: {formatDate(exame.data_inscricao_inicio)}–{formatDate(exame.data_inscricao_fim)}
          </span>
          <span>{pct}% do tempo</span>
        </div>
      </div>
    </div>
  );
}

export default function RadarOAB() {
  const [exames, setExames] = useState<CalendarioOAB[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCalendario() {
      const { data, error } = await supabase
        .from('calendario_oab')
        .select('*')
        .eq('status', 'ativo')
        .order('numero_exame');

      if (!error && data) setExames(data);
      setLoading(false);
    }

    fetchCalendario();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '0.75rem 0' }}>
        <div style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', padding: '0 0.5rem', marginBottom: '0.5rem' }}>
          Radar OAB
        </div>
        <div style={{ padding: '1rem', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
          Carregando...
        </div>
      </div>
    );
  }

  if (exames.length === 0) return null;

  return (
    <div style={{ padding: '0.75rem 0', fontFamily: 'var(--font-sans)' }}>
      <div style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', padding: '0 0.5rem', marginBottom: '0.5rem' }}>
        Radar OAB
      </div>

      {exames.map((exame) => (
        <ExameCard key={exame.id} exame={exame} />
      ))}

      <a
        href={exames[0]?.link_oficial || 'https://examedeordem.oab.org.br/Calendario'}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '5px',
          padding: '7px',
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 'var(--border-radius-md)',
          fontSize: '12px',
          color: 'var(--color-text-secondary)',
          textDecoration: 'none',
          marginTop: '0.25rem',
        }}
      >
        <span>↗</span>
        Ver calendário oficial OAB
      </a>
    </div>
  );
}
