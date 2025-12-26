'use client'

interface MonthSelectorProps {
    currentType: string
    currentMonth: string | undefined
    options: { value: string; label: string }[]
}

export function MonthSelector({ currentType, currentMonth, options }: MonthSelectorProps) {
    return (
        <select
            className="bg-slate-600 text-white px-3 py-2 rounded font-bold cursor-pointer"
            defaultValue={currentMonth || ''}
            onChange={(e) => {
                if (e.target.value) {
                    window.location.href = `/planning/history?type=${currentType}&month=${e.target.value}`
                } else {
                    window.location.href = `/planning/history?type=${currentType}`
                }
            }}
        >
            <option value="">過去30日</option>
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    )
}
