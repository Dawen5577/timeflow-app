export function isISODateString(v: any): v is string {
  if (typeof v !== 'string') return false
  const d = new Date(v)
  return !isNaN(d.getTime()) && /\d{4}-\d{2}-\d{2}T/.test(v)
}

export function validateTimeBlockPayload(body: any) {
  const errors: string[] = []
  if (!body || typeof body !== 'object') errors.push('请求体必须是JSON对象')
  if (!body.user_id || typeof body.user_id !== 'string') errors.push('缺少必填字段 user_id')
  if (!body.start_time || !isISODateString(body.start_time)) errors.push('start_time 必须为 ISO 日期字符串')
  if (!body.end_time || !isISODateString(body.end_time)) errors.push('end_time 必须为 ISO 日期字符串')
  if (!body.category_id || typeof body.category_id !== 'string') errors.push('缺少必填字段 category_id')
  if (body.notes && typeof body.notes !== 'string') errors.push('notes 必须为字符串')
  if (body.notes && body.notes.length > 500) errors.push('notes 超出长度限制（≤500）')
  if (body.mood_rating && typeof body.mood_rating !== 'number') errors.push('mood_rating 必须为数字')
  if (isISODateString(body.start_time) && isISODateString(body.end_time)) {
    const s = new Date(body.start_time).getTime()
    const e = new Date(body.end_time).getTime()
    if (!(s < e)) errors.push('结束时间必须晚于开始时间')
  }
  return { ok: errors.length === 0, errors }
}

