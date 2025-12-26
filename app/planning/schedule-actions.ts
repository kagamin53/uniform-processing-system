'use server'

import { prisma } from '@/app/lib/prisma'
import { revalidatePath } from 'next/cache'

// 時間文字列 (例: "3'45" or "3'45") を秒に変換
// Note: データには通常アポストロフィ(')と右シングル引用符(')の両方が使われる
// \u0027 = ', \u2019 = ' (right single quote), \u02BC = ʼ
function parseTimeToSeconds(timeStr: string | null): number {
    if (!timeStr) return 0

    // "3'45" または "3'45" 形式を解析 (分'秒)
    const match = timeStr.match(/(\d+)[\u0027\u2019\u02BC](\d+)/)
    if (match) {
        const minutes = parseInt(match[1])
        const seconds = parseInt(match[2])
        return minutes * 60 + seconds
    }

    // 数値のみの場合（分として扱う）
    const num = parseFloat(timeStr)
    if (!isNaN(num)) return Math.round(num * 60)

    return 0
}

// 分を "HH:MM" 形式に変換
function minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

// スケジュールオプション
interface ScheduleOptions {
    startHour: number
    endHour: number
    breakStart: number
    breakEnd: number
    sortBy: 'deadline' | 'quantity' | 'processingTime'
    startDate: string
}

// 共通スケジュールロジック: 指定された計画リストを指定日以降にスケジュールする
async function schedulePlans(plans: any[], startDate: Date, options?: Partial<ScheduleOptions>) {
    const START_HOUR = options?.startHour || 8      // 開始時間: 8:00
    const END_HOUR = options?.endHour || 17         // 終了時間: 17:00
    const BREAK_START = (options?.breakStart || 12) * 60  // 昼休憩開始
    const BREAK_END = (options?.breakEnd || 13) * 60      // 昼休憩終了
    const MAX_MINUTES_PER_DAY = (END_HOUR - START_HOUR) * 60 - (BREAK_END - BREAK_START) // 休憩を除く

    if (plans.length === 0) {
        return { message: 'スケジュールする項目がありません', scheduled: 0 }
    }

    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 3) // 3ヶ月先まで検索

    // 休日一覧を取得
    const holidays = await prisma.holiday.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate
            }
        }
    })
    const holidayDates = new Set(
        holidays.map(h => new Date(h.date).toISOString().split('T')[0])
    )

    // 日ごとの経過時間（分）を追跡
    const dailyUsed: { [key: string]: number } = {}

    // 日付を初期化
    let current = new Date(startDate)
    while (current <= endDate) {
        const isoDate = current.toISOString().split('T')[0]

        // 休日はスキップ（dailyUsedに追加しない）
        if (holidayDates.has(isoDate)) {
            current.setDate(current.getDate() + 1)
            continue
        }

        // ISO形式をキーとして使用（new Date()で正しく変換可能）
        const dateKey = isoDate

        // 既存のスケジュールを確認して、使用済み時間を計算
        const startOfDay = new Date(current)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(current)
        endOfDay.setHours(23, 59, 59, 999)

        const existingPlans = await prisma.planningEntry.findMany({
            where: {
                planDate: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        })

        let used = 0
        for (const p of existingPlans) {
            const prep = p.prepMinutes || 15
            const proc = Math.ceil((p.plannedSeconds || 0) / 60)
            used += (prep + proc)
        }

        dailyUsed[dateKey] = used
        current.setDate(current.getDate() + 1)
    }

    let scheduled = 0

    // 計画ごとの所要時間を事前計算
    const planTimes: { plan: any; totalMinutes: number; secondsPerPiece: number }[] = []
    for (const plan of plans) {
        let secondsPerPiece = 0
        if (plan.baldanTime || plan.tajimaTime) {
            const timeStr = plan.usedMachine === 'baldan' ? plan.baldanTime : plan.tajimaTime
            secondsPerPiece = parseTimeToSeconds(timeStr || '0')
        } else if (plan.plannedSeconds) {
            secondsPerPiece = Math.ceil(plan.plannedSeconds / (plan.totalQuantity || 1))
        }

        const quantity = plan.totalQuantity || 1
        const prepMinutes = plan.prepMinutes || 15
        const processingMinutes = Math.ceil((secondsPerPiece * quantity) / 60)
        const totalMinutes = prepMinutes + processingMinutes

        if (totalMinutes > 0) {
            planTimes.push({ plan, totalMinutes, secondsPerPiece })
        }
    }

    // 日付キーをソート（早い日から順に）
    const sortedDateKeys = Object.keys(dailyUsed).sort()

    // 各計画を配置（納期順を維持しつつ、その日に入るものを詰め込む）
    const remainingPlans = [...planTimes]

    for (const dateKey of sortedDateKeys) {
        if (remainingPlans.length === 0) break

        let changed = true
        while (changed && remainingPlans.length > 0) {
            changed = false

            // 現在の使用時間から実際の開始時間を計算
            const currentStartMinutes = START_HOUR * 60 + dailyUsed[dateKey]

            // 昼休憩後の調整
            let adjustedCurrentStart = currentStartMinutes
            if (adjustedCurrentStart >= BREAK_START && adjustedCurrentStart < BREAK_END) {
                adjustedCurrentStart = BREAK_END
            }

            // 実際に使える残り時間（17:00まで）
            const actualRemainingMinutes = END_HOUR * 60 - adjustedCurrentStart

            if (actualRemainingMinutes <= 0) {
                break // この日はもう入らない
            }

            // この日の残り時間に入る計画を探す（納期順を維持）
            for (let i = 0; i < remainingPlans.length; i++) {
                const { plan, totalMinutes, secondsPerPiece } = remainingPlans[i]

                // 昼休憩をまたぐ場合を考慮
                let startMinutesForPlan = adjustedCurrentStart
                if (startMinutesForPlan < BREAK_START && startMinutesForPlan + totalMinutes > BREAK_START) {
                    // 昼休憩前に終わらない場合は休憩後にずらす
                    startMinutesForPlan = BREAK_END
                }

                // 終了時間が17:00を超える場合はこの計画はスキップ
                if (startMinutesForPlan + totalMinutes > END_HOUR * 60) {
                    continue
                }

                const startTimeStr = minutesToTime(startMinutesForPlan)

                // この日に割り当て
                await prisma.planningEntry.update({
                    where: { id: plan.id },
                    data: {
                        planDate: new Date(dateKey),
                        startTime: startTimeStr,
                        plannedSeconds: secondsPerPiece * (plan.totalQuantity || 1)
                    }
                })

                // 使用時間を更新（休憩時間も考慮）
                dailyUsed[dateKey] = startMinutesForPlan + totalMinutes - (START_HOUR * 60)

                // リストから削除
                remainingPlans.splice(i, 1)
                scheduled++
                changed = true
                break
            }
        }
    }

    return scheduled
}

// 予定を自動スケジュール（時間軸付き）
export async function autoSchedulePlanning(options?: Partial<ScheduleOptions>) {
    // 未スケジュールの計画エントリを取得
    const plans = await prisma.planningEntry.findMany({
        where: {
            planDate: null,
            status: { not: 'completed' }
        }
    })

    if (plans.length === 0) {
        return { message: 'スケジュールする項目がありません', scheduled: 0 }
    }

    // ソート順の適用
    const sortBy = options?.sortBy || 'deadline'
    const sortedPlans = plans.sort((a, b) => {
        if (sortBy === 'quantity') {
            // 数量が多い順
            return (b.totalQuantity || 0) - (a.totalQuantity || 0)
        } else if (sortBy === 'processingTime') {
            // 加工時間が短い順
            return (a.plannedSeconds || 0) - (b.plannedSeconds || 0)
        } else {
            // 納期が早い順（デフォルト）
            const parseDeadline = (d: string | null): number => {
                if (!d) return Infinity // 納期なしは最後
                const match = d.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/)
                if (match) {
                    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3])).getTime()
                }
                return Infinity
            }
            const dateA = parseDeadline(a.deadline)
            const dateB = parseDeadline(b.deadline)
            if (dateA !== dateB) return dateA - dateB
            return (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)
        }
    })

    // 開始日の設定
    let startDate: Date
    if (options?.startDate) {
        startDate = new Date(options.startDate)
    } else {
        const today = new Date()
        startDate = new Date(today)
        startDate.setDate(startDate.getDate() + 1)
    }
    startDate.setHours(0, 0, 0, 0)

    const scheduled = await schedulePlans(sortedPlans, startDate, options)

    revalidatePath('/planning')
    revalidatePath('/')

    return { message: `${scheduled}件の計画をスケジュールしました`, scheduled }
}

// デバッグ用：スケジュールをリセット
export async function resetSchedule() {
    await prisma.planningEntry.updateMany({
        data: {
            planDate: null,
            startTime: null,
            plannedSeconds: null
        }
    })

    revalidatePath('/planning')
    revalidatePath('/')

    return { message: 'スケジュールをリセットしました' }
}

// 使用機を変更し、所要時間を再計算
export async function updateMachine(id: number, machine: string) {
    const plan = await prisma.planningEntry.findUnique({
        where: { id }
    })

    if (!plan) {
        return { error: '計画エントリが見つかりません' }
    }

    const timeStr = machine === 'baldan' ? plan.baldanTime : plan.tajimaTime
    const secondsPerPiece = parseTimeToSeconds(timeStr)
    const totalQuantity = plan.totalQuantity || 1
    const plannedSeconds = secondsPerPiece * totalQuantity

    const updated = await prisma.planningEntry.update({
        where: { id },
        data: {
            usedMachine: machine,
            plannedSeconds: plannedSeconds > 0 ? plannedSeconds : null
        }
    })

    if (updated.planDate) {
        // 同じ日の他のエントリを再計算
        await recalculateDay(updated.planDate)
    }

    revalidatePath('/planning')

    return { success: true }
}

// 準備時間を更新
export async function updatePrepTime(id: number, prepMinutes: number) {
    const updated = await prisma.planningEntry.update({
        where: { id },
        data: { prepMinutes }
    })

    if (updated.planDate) {
        // 同じ日の他のエントリを再計算
        await recalculateDay(updated.planDate)
    }

    revalidatePath('/planning')

    return { success: true }
}

// 開始時間を手動で更新
export async function updateStartTime(id: number, startTime: string) {
    const updated = await prisma.planningEntry.update({
        where: { id },
        data: { startTime }
    })

    if (updated.planDate) {
        // 同じ日の後続のエントリを再計算
        await recalculateDay(updated.planDate)
    }

    revalidatePath('/planning')

    return { success: true }
}

// 順序変更（ドラッグ&ドロップ）
export async function reorderPlanning(planDate: string, orderedIds: number[]) {
    // 休憩時間設定を取得（デフォルト: 12:00-13:00）
    const BREAK_START = 12 * 60 // 12:00
    const BREAK_END = 13 * 60   // 13:00
    const START_HOUR = 8

    // 指定された日の全エントリを取得
    const plans = await prisma.planningEntry.findMany({
        where: { id: { in: orderedIds } }
    })

    // IDでマップを作成
    type PlanEntry = typeof plans[0]
    const planMap = new Map<number, PlanEntry>(plans.map((p: PlanEntry) => [p.id, p]))

    // 現在の時間（分）
    let currentMinutes = START_HOUR * 60

    // 順序通りに開始時間を割り当て
    for (const id of orderedIds) {
        const plan = planMap.get(id)
        if (!plan) continue

        // 準備時間＋加工時間
        const processingMinutes = Math.ceil((plan.plannedSeconds || 0) / 60)
        const prepMinutes = plan.prepMinutes || 15
        const durationMinutes = prepMinutes + processingMinutes

        // 休憩時間をスキップ
        if (currentMinutes < BREAK_START && currentMinutes + durationMinutes > BREAK_START) {
            // 休憩をまたぐ場合、休憩後に開始
            currentMinutes = BREAK_END
        } else if (currentMinutes >= BREAK_START && currentMinutes < BREAK_END) {
            // 休憩中の場合、休憩後に開始
            currentMinutes = BREAK_END
        }

        const startTimeStr = minutesToTime(currentMinutes)

        await prisma.planningEntry.update({
            where: { id },
            data: { startTime: startTimeStr }
        })

        currentMinutes += durationMinutes
    }

    // この日のSpilloverチェックを実行するために再計算を呼び出す
    await recalculateDay(planDate)

    revalidatePath('/planning')

    return { success: true }
}

// 休憩時間を考慮して日の時間を再計算
export async function recalculateDay(targetDate: Date | string) {
    const BREAK_START = 12 * 60 // 12:00
    const BREAK_END = 13 * 60   // 13:00
    const START_HOUR = 8
    const END_HOUR = 17

    // 日付の範囲を設定（時間を無視）
    const planDate = new Date(targetDate)
    const startOfDay = new Date(planDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(planDate)
    endOfDay.setHours(23, 59, 59, 999)

    const plans = await prisma.planningEntry.findMany({
        where: {
            planDate: {
                gte: startOfDay,
                lte: endOfDay
            }
        },
        orderBy: { startTime: 'asc' }
    })

    // 計画を開始時間順でソートし、各計画の開始時間を前の終了時間以降に調整
    let nextAvailableMinutes = START_HOUR * 60
    const spilledPlans: any[] = []

    for (const plan of plans) {
        // 準備時間＋加工時間
        const processingMinutes = Math.ceil((plan.plannedSeconds || 0) / 60)
        const prepMinutes = plan.prepMinutes || 15
        const durationMinutes = prepMinutes + processingMinutes

        // この計画の現在の開始時間
        const currentStartTime = plan.startTime
        let currentStartMinutes = START_HOUR * 60
        if (currentStartTime) {
            const [h, m] = currentStartTime.split(':').map(Number)
            currentStartMinutes = h * 60 + m
        }

        // 開始時間は、次に利用可能な時間か、現在設定されている時間のいずれか遅い方
        // ただし、重複を防ぐため、必ず nextAvailableMinutes 以降にする
        let newStartMinutes = Math.max(currentStartMinutes, nextAvailableMinutes)

        // 休憩時間をスキップ
        if (newStartMinutes < BREAK_START && newStartMinutes + durationMinutes > BREAK_START) {
            newStartMinutes = BREAK_END
        } else if (newStartMinutes >= BREAK_START && newStartMinutes < BREAK_END) {
            newStartMinutes = BREAK_END
        }

        // 17:00 を超えるかチェック
        if (newStartMinutes + durationMinutes > END_HOUR * 60) {
            // あふれたタスクとしてリストに追加
            spilledPlans.push(plan)
            continue
        }

        const startTimeStr = minutesToTime(newStartMinutes)

        if (plan.startTime !== startTimeStr) {
            await prisma.planningEntry.update({
                where: { id: plan.id },
                data: { startTime: startTimeStr }
            })
        }

        nextAvailableMinutes = newStartMinutes + durationMinutes
    }

    // あふれたタスクがある場合、それらを翌日以降にスケジュール
    if (spilledPlans.length > 0) {
        // 現在の日付からスケジュールを削除
        for (const p of spilledPlans) {
            await prisma.planningEntry.update({
                where: { id: p.id },
                data: {
                    planDate: null,
                    startTime: null
                }
            })
        }

        // 翌日を計算
        const nextDay = new Date(planDate)
        nextDay.setDate(nextDay.getDate() + 1)

        // 再スケジュール実行
        await schedulePlans(spilledPlans, nextDay)
    }

    revalidatePath('/planning')

    return { success: true }
}

// 加工時間を更新（バルダン/タジマ）
export async function updateProcessingTime(
    id: number,
    baldanTime: string,
    tajimaTime: string,
    syncToMaster: boolean = false
) {
    // 1. 計画エントリを取得
    const plan = await prisma.planningEntry.findUnique({
        where: { id }
    })

    if (!plan) return { error: '計画が見つかりません' }

    // 2. 秒変換と計算
    const baldanSeconds = parseTimeToSeconds(baldanTime)
    const tajimaSeconds = parseTimeToSeconds(tajimaTime)

    // どちらのマシンを使うかによって計算を変えるべきだが、
    // ここでは安全のため長いほうを採用するか、あるいは現在の usedMachine を考慮する
    // シンプルに「長い方」を基準にするのが安全（ボトルネックベース）
    const secondsPerPiece = Math.max(baldanSeconds, tajimaSeconds)

    // 予定時間を再計算 (枚数 × 1枚あたりの時間)
    const totalQuantity = plan.totalQuantity || 0
    const plannedSeconds = secondsPerPiece * totalQuantity

    // 3. 計画エントリ更新
    await prisma.planningEntry.update({
        where: { id },
        data: {
            baldanTime,
            tajimaTime,
            plannedSeconds
        }
    })

    // 4. マスター更新 (オプション)
    if (syncToMaster && plan.processingCode) {
        try {
            // マスターを更新
            await prisma.processingCode.update({
                where: { code: plan.processingCode },
                data: {
                    baldanTime,
                    tajimaTime
                }
            })
        } catch (e) {
            console.error('マスター更新エラー:', e)
            // マスター更新失敗しても計画更新は成功しているため、エラーにはしない
        }
    }

    revalidatePath('/planning')
    revalidatePath('/codes')

    return { success: true }
}
// 日付を更新
export async function updatePlanDate(id: number, dateStr: string) {
    const plan = await prisma.planningEntry.findUnique({
        where: { id }
    })

    if (!plan) return { error: '計画が見つかりません' }

    const oldDate = plan.planDate

    // 新しい日付を設定（時間はクリアして、再計算で割り当てさせる）
    // 日付のみ変更し、時間は維持する場合、その日の並び順に影響する
    // ここでは、とりあえず日付を変更し、時間はそのままにする（recalculateDayでソートされる）
    const newDate = new Date(dateStr)

    await prisma.planningEntry.update({
        where: { id },
        data: {
            planDate: newDate
        }
    })

    // 旧・新の両方の日付を再計算
    if (oldDate) {
        await recalculateDay(oldDate)
    }
    await recalculateDay(newDate)

    revalidatePath('/planning')

    return { success: true }
}
