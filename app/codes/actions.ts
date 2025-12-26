'use server'

import { prisma } from '@/app/lib/prisma'
import { revalidatePath } from 'next/cache'

// 加工コードの時間を更新
export async function updateCodeTime(code: string, baldanTime: string | null, tajimaTime: string | null) {
    await prisma.processingCode.update({
        where: { code },
        data: {
            baldanTime,
            tajimaTime
        }
    })

    revalidatePath('/codes')
    revalidatePath('/planning')

    return { success: true }
}
