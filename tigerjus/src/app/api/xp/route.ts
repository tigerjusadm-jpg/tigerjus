import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId, action, metadata } = await request.json()
    if (!userId) return NextResponse.json({ error: 'NO_USER' }, { status: 400 })

    const supabase = supabaseAdmin()

    const XP_TABLE: Record<string, number> = {
      question_correct: 100,
      question_wrong: 10,
      simulado_complete: 500,
      streak_bonus: 150,
      daily_goal: 200,
      first_login: 50,
      subscribe: 500,
    }

    const xpEarned = XP_TABLE[action] || 0
    if (xpEarned === 0) return NextResponse.json({ xp: 0 })

    // Get current profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('xp, level, streak, last_study_date')
      .eq('id', userId)
      .single()

    if (!profile) return NextResponse.json({ error: 'NO_PROFILE' }, { status: 404 })

    const newXp = (profile.xp || 0) + xpEarned

    // Calculate new level
    const getLevelInfo = (xp: number) => {
      if (xp < 1000) return { level: 1, name: 'Filhote' }
      if (xp < 5000) return { level: 2, name: 'Caçador' }
      if (xp < 15000) return { level: 3, name: 'Alpha' }
      if (xp < 40000) return { level: 4, name: 'Tigre Supremo' }
      return { level: 5, name: 'Mestre TigerJus' }
    }

    const levelInfo = getLevelInfo(newXp)
    const leveledUp = levelInfo.level > (profile.level || 1)

    // Update streak
    const today = new Date().toISOString().split('T')[0]
    const lastStudy = profile.last_study_date
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const newStreak = lastStudy === yesterday ? (profile.streak || 0) + 1 : lastStudy === today ? profile.streak : 1

    // Update profile
    await supabase
      .from('profiles')
      .update({
        xp: newXp,
        level: levelInfo.level,
        level_name: levelInfo.name,
        streak: newStreak,
        last_study_date: today,
      })
      .eq('id', userId)

    // Log XP history
    await supabase.from('xp_history').insert({
      user_id: userId,
      amount: xpEarned,
      reason: action,
      metadata: metadata || {},
    })

    return NextResponse.json({
      xp_earned: xpEarned,
      total_xp: newXp,
      level: levelInfo,
      leveled_up: leveledUp,
      streak: newStreak,
    })
  } catch (error: any) {
    console.error('XP error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
