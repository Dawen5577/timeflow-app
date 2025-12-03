import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateTimeBlockPayload } from '@/lib/validation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const v = validateTimeBlockPayload(body)
    if (!v.ok) return NextResponse.json({ error: 'Bad Request', details: v.errors }, { status: 400 })

    const { data, error } = await supabase
      .from('time_blocks')
      .insert({
        user_id: body.user_id,
        start_time: body.start_time,
        end_time: body.end_time,
        category_id: body.category_id,
        group_id: body.group_id,
        notes: body.notes,
        mood_rating: body.mood_rating ?? 3
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
    const v = validateTimeBlockPayload(body)
    if (!v.ok) return NextResponse.json({ error: 'Bad Request', details: v.errors }, { status: 400 })

    const { data, error } = await supabase
      .from('time_blocks')
      .update({
        start_time: body.start_time,
        end_time: body.end_time,
        category_id: body.category_id,
        group_id: body.group_id,
        notes: body.notes,
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

