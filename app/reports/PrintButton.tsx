'use client'

export function PrintButton() {
    return (
        <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center gap-2"
        >
            <span className="material-icons">print</span>
            印刷する
        </button>
    )
}
