'use server'

import { prisma } from '@/app/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createOrderEntry(formData: FormData) {
    const receptionDateStr = formData.get('receptionDate') as string

    await prisma.orderEntry.create({
        data: {
            receptionDate: receptionDateStr ? new Date(receptionDateStr) : null,
            completionDate: formData.get('completionDate') as string || null,
            processingCode: formData.get('processingCode') as string || null,
            customerCode: formData.get('customerCode') as string || null,
            city: formData.get('city') as string || null,
            customerName: formData.get('customerName') as string || null,
            position: formData.get('position') as string || null,
            productCode: formData.get('productCode') as string || null,
            productName: formData.get('productName') as string || null,
            modelNumber: formData.get('modelNumber') as string || null,
            colorCode: formData.get('colorCode') as string || null,
            colorName: formData.get('colorName') as string || null,
            colorName2: formData.get('colorName2') as string || null,
            totalQuantity: parseInt(formData.get('totalQuantity') as string) || null,
            costPrice: parseInt(formData.get('costPrice') as string) || null,
            sellingPrice: parseInt(formData.get('sellingPrice') as string) || null,
            threadColor: formData.get('threadColor') as string || null,
            baldanTime: formData.get('baldanTime') as string || null,
            tajimaTime: formData.get('tajimaTime') as string || null,
        }
    })
    revalidatePath('/orders-list')
}

export async function updateOrderStatus(id: number, status: string) {
    await prisma.orderEntry.update({
        where: { id },
        data: { status }
    })
    revalidatePath('/orders-list')
}

export async function createPlanningEntry(formData: FormData) {
    const planDateStr = formData.get('planDate') as string
    const receptionDateStr = formData.get('receptionDate') as string

    await prisma.planningEntry.create({
        data: {
            planDate: planDateStr ? new Date(planDateStr) : null,
            receptionDate: receptionDateStr ? new Date(receptionDateStr) : null,
            returnDate: formData.get('returnDate') as string || null,
            processingCode: formData.get('processingCode') as string || null,
            customerCode: formData.get('customerCode') as string || null,
            city: formData.get('city') as string || null,
            gardenName: formData.get('gardenName') as string || null,
            position: formData.get('position') as string || null,
            productCode: formData.get('productCode') as string || null,
            productName: formData.get('productName') as string || null,
            modelNumber: formData.get('modelNumber') as string || null,
            colorCode: formData.get('colorCode') as string || null,
            colorName: formData.get('colorName') as string || null,
            colorName2: formData.get('colorName2') as string || null,
            totalQuantity: parseInt(formData.get('totalQuantity') as string) || null,
            costPrice: parseInt(formData.get('costPrice') as string) || null,
            sellingPrice: parseInt(formData.get('sellingPrice') as string) || null,
            threadColor: formData.get('threadColor') as string || null,
            baldanTime: formData.get('baldanTime') as string || null,
            tajimaTime: formData.get('tajimaTime') as string || null,
            deadline: formData.get('deadline') as string || null,
            plannedSeconds: parseInt(formData.get('plannedSeconds') as string) || null,
            notes: formData.get('notes') as string || null,
            adjustMinutes: parseInt(formData.get('adjustMinutes') as string) || null,
            embroideryMinutes: parseInt(formData.get('embroideryMinutes') as string) || null,
            prepMinutes: parseInt(formData.get('prepMinutes') as string) || 15,
        }
    })
    revalidatePath('/planning')
}

export async function updatePlanningStatus(id: number, status: string) {
    await prisma.planningEntry.update({
        where: { id },
        data: { status }
    })
    revalidatePath('/planning')
}
