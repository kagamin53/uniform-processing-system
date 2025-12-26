import { PrismaClient } from '../node_modules/.prisma/client/client'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const prisma = new PrismaClient({
    datasourceUrl: "file:./dev.db"
})

async function main() {
    console.log('Seeding data...')

    const customer = await prisma.customer.create({
        data: {
            name: 'Suzuki Hanako',
            phone: '090-1234-5678',
            childName: 'Taro',
            kindergartenName: 'Sunflower Kindergarten',
            className: 'Tulip',
            orders: {
                create: {
                    dueDate: new Date(new Date().setDate(new Date().getDate() + 7)), // 1 week later
                    items: {
                        create: [
                            {
                                itemType: 'Polo Shirt',
                                size: '110',
                                processingDetails: {
                                    create: [
                                        {
                                            processingType: 'Embroidery',
                                            description: 'Name: TARO (Blue)',
                                            price: 500
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                }
            }
        }
    })

    console.log('Created customer with order:', customer)
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
