import { prisma } from '@/app/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const [pickingCount, codeCount, pendingPicking, orderCount, planCount] = await Promise.all([
    prisma.pickingItem.count(),
    prisma.processingCode.count(),
    prisma.pickingItem.count({ where: { status: 'pending' } }),
    prisma.orderEntry.count(),
    prisma.planningEntry.count()
  ])

  const [pendingOrders, inProgressOrders] = await Promise.all([
    prisma.orderEntry.count({ where: { status: 'pending' } }),
    prisma.orderEntry.count({ where: { status: 'in_progress' } })
  ])

  const [pendingPlans, inProgressPlans] = await Promise.all([
    prisma.planningEntry.count({ where: { status: 'pending' } }),
    prisma.planningEntry.count({ where: { status: 'in_progress' } })
  ])

  // 今日の計画
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const todayPlans = await prisma.planningEntry.findMany({
    where: { planDate: { gte: today, lt: tomorrow } },
    take: 5
  })

  const recentOrders = await prisma.orderEntry.findMany({
    where: { status: { not: 'completed' } },
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">ダッシュボード</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-gray-400 text-xs">受注</p>
          <p className="text-2xl font-bold text-blue-400">{orderCount}</p>
          <p className="text-xs text-gray-500">未着手 {pendingOrders} / 加工中 {inProgressOrders}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-gray-400 text-xs">計画</p>
          <p className="text-2xl font-bold text-green-400">{planCount}</p>
          <p className="text-xs text-gray-500">未着手 {pendingPlans} / 加工中 {inProgressPlans}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-gray-400 text-xs">ピッキング</p>
          <p className="text-2xl font-bold text-yellow-400">{pickingCount.toLocaleString()}</p>
          <p className="text-xs text-gray-500">未処理 {pendingPicking.toLocaleString()}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-gray-400 text-xs">加工コード</p>
          <p className="text-2xl font-bold text-purple-400">{codeCount.toLocaleString()}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-gray-400 text-xs">本日の計画</p>
          <p className="text-2xl font-bold text-orange-400">{todayPlans.length}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link href="/orders-list" className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition text-sm">
          📋 受注一覧
        </Link>
        <Link href="/planning" className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 transition text-sm">
          📅 計画表
        </Link>
        <Link href="/picking" className="px-4 py-2 bg-yellow-600 rounded hover:bg-yellow-700 transition text-sm">
          📦 ピッキング
        </Link>
        <Link href="/codes" className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700 transition text-sm">
          🏷️ 加工コード
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Today's Plans */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4">📅 本日の計画</h3>
          {todayPlans.length === 0 ? (
            <p className="text-gray-500">本日の計画はありません</p>
          ) : (
            <div className="space-y-2">
              {todayPlans.map(plan => (
                <div key={plan.id} className="flex justify-between items-center p-2 bg-gray-800/30 rounded text-sm">
                  <div>
                    <span className="text-purple-400">{plan.processingCode}</span>
                    <span className="text-gray-400 ml-2">{plan.gardenName}</span>
                  </div>
                  <span className="text-orange-400">{Math.round(((plan.prepMinutes ?? 0) * 60 + (plan.plannedSeconds ?? 0)) / 60)}分</span>
                </div>
              ))}
            </div>
          )}
          <Link href="/planning" className="block mt-4 text-blue-400 hover:underline text-sm">
            計画表を開く →
          </Link>
        </div>

        {/* Recent Orders */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4">📋 未完了の受注</h3>
          {recentOrders.length === 0 ? (
            <p className="text-gray-500">未完了の受注はありません</p>
          ) : (
            <div className="space-y-2">
              {recentOrders.map(order => (
                <div key={order.id} className="flex justify-between items-center p-2 bg-gray-800/30 rounded text-sm">
                  <div>
                    <span className="text-purple-400">{order.processingCode}</span>
                    <span className="text-gray-400 ml-2">{order.customerName}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${order.status === 'pending' ? 'bg-yellow-900/50 text-yellow-300' : 'bg-orange-900/50 text-orange-300'
                    }`}>
                    {order.status === 'pending' ? '未着手' : '加工中'}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link href="/orders-list" className="block mt-4 text-blue-400 hover:underline text-sm">
            受注一覧を開く →
          </Link>
        </div>
      </div>
    </div>
  )
}
