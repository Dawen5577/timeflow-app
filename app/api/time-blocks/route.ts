import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const errors: string[] = []
    const user_id = body?.user_id
    const start_time = body?.start_time
    const end_time = body?.end_time
    const category_id = body?.category_id ?? null
    const notes = body?.note ?? body?.notes ?? null

    if (!user_id || typeof user_id !== 'string') errors.push('缺少必填字段 user_id')
    if (!start_time || typeof start_time !== 'string') errors.push('缺少必填字段 start_time')
    if (!end_time || typeof end_time !== 'string') errors.push('缺少必填字段 end_time')
    const s = new Date(start_time).getTime(), e = new Date(end_time).getTime()
    if (!isFinite(s) || !isFinite(e)) errors.push('时间字段必须为有效的 ISO 字符串')
    if (isFinite(s) && isFinite(e) && !(s < e)) errors.push('结束时间必须晚于开始时间')
    if (notes !== null && typeof notes !== 'string') errors.push('note/notes 必须为字符串')
    if (notes && notes.length > 500) errors.push('notes 超出长度限制（≤500）')

    if (errors.length) return NextResponse.json({ error: 'Bad Request', details: errors }, { status: 400 })

    const { data, error } = await supabase
      .from('time_blocks')
      .insert({
        user_id,
        start_time,
        end_time,
        category_id,
        notes,
        mood_rating: typeof body?.mood_rating === 'number' ? body.mood_rating : 3
      })
      .select()

    if (error) return NextResponse.json({ error: 'Bad Request', details: [error.message] }, { status: 400 })
    return NextResponse.json({ data }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Bad Request', details: [String(e?.message || e)] }, { status: 400 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    if (!body.id || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'Bad Request', details: ['缺少必填字段 id'] }, { status: 400 })
    }
    const notesAlias = body?.note ?? body?.notes ?? null

    const { data, error } = await supabase
      .from('time_blocks')
      .update({
        start_time: body.start_time,
        end_time: body.end_time,
        category_id: body.category_id,
        notes: notesAlias,
        mood_rating: body.mood_rating ?? 3
      })
      .eq('id', body.id)
      .eq('user_id', body.user_id)
      .select()

    if (error) return NextResponse.json({ error: 'Bad Request', details: [error.message] }, { status: 400 })
    return NextResponse.json({ data }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Bad Request', details: [String(e?.message || e)] }, { status: 400 })
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const id = body?.id
    const user_id = body?.user_id
    if (!id || !user_id) {
      return NextResponse.json({ error: 'Bad Request', details: ['缺少必填字段 id 或 user_id'] }, { status: 400 })
    }
    const { error } = await supabase
      .from('time_blocks')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id)

    if (error) return NextResponse.json({ error: 'Bad Request', details: [error.message] }, { status: 400 })
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Bad Request', details: [String(e?.message || e)] }, { status: 400 })
  }
}
