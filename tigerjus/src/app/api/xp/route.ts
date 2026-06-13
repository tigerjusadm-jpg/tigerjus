import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const XP_ACTIONS: Record<string, number> = {
  question_correct: 100,
  question_wrong: 10,
  simulado_complete: 500,
  daily_login: 50,
  streak_bonus: 200,
  quiz_complete: 150,
}

const LEVELS = [
  { nivel: 1, name: 'Filhote',         min: 0,     max: 999    },
  { nivel: 2, name: 'Caçador',         min: 1000,  max: 4999   },
  { nivel: 3, name: 'Alpha',           min: 5000,  max: 14999  },
  { nivel: 4, name: 'Tigre Supremo',   min: 15000, max: 39999  },
  { nivel: 5, name: 'Mestre TigerJus', min: 40000, max: 999999 },
]

function getLevel(xp: number) {
  return LEVELS.find(l => xp >= l.min && xp <= l.max) || LEVELS[0]
}

export async function POST(req: NextRequest) {
  try {
    const { userId, action } = await req.json()
    if (!userId || !action) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

    const xpEarned = XP_ACTIONS[action] || 0

    // FIX: removido "level_name" — coluna inexistente que quebrava o UPDATE inteiro
    const { data: profile } = await supabase
      .from('profiles')
      .select('xp, nivel, streak, ultimo_acesso, questoes_respondidas, questoes_corretas')
      .eq('id', userId)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const today = new Date().toISOString().split('T')[0]
    const lastAccess = profile.ultimo_acesso

    let newStreak = profile.streak || 0
    if (lastAccess !== today) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      newStreak = lastAccess === yesterdayStr ? newStreak + 1 : 1
    }

    const oldXp = profile.xp || 0
    const newXp = oldXp + xpEarned
    const oldLevel = getLevel(oldXp)
    const newLevel = getLevel(newXp)
    const leveledUp = newLevel.name !== oldLevel.name

    // FIX: usar "nivel" (integer) em vez de "level_name" (coluna inexistente)
    const updates: any = {
      xp: newXp,
      nivel: newLevel.nivel,
      streak: newStreak,
      ultimo_acesso: today,
    }

    if (action === 'question_correct') {
      updates.questoes_respondidas = (profile.questoes_respondidas || 0) + 1
      updates.questoes_corretas = (profile.questoes_corretas || 0) + 1
    } else if (action === 'question_wrong') {
      updates.questoes_respondidas = (profile.questoes_respondidas || 0) + 1
    }

    await supabase.from('profiles').update(updates).eq('id', userId)

    // xp_historico é opcional — falha silenciosa se a tabela não existir
    if (xpEarned > 0) {
      await supabase.from('xp_historico').insert({
        user_id: userId,
        xp: xpEarned,
        motivo: action,
      })
    }

    return NextResponse.json({
      xp_earned: xpEarned,
      total_xp: newXp,
      level: newLevel,
      leveled_up: leveledUp,
      streak: newStreak,
    })

  } catch (error) {
    console.error('XP Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
