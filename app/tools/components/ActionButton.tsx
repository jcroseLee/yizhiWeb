import React from 'react'

export interface ActionButtonProps {
  icon: React.ElementType
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
}

export const ActionButton = ({ icon: Icon, label, onClick, disabled = false, active = false }: ActionButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all active:scale-95 ${
      active 
        ? 'bg-[#C82E31]/5 border-[#C82E31] text-[#C82E31]' 
        : 'bg-white border-stone-100 text-stone-600 hover:bg-stone-50'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'shadow-sm'}`}
  >
    <Icon className={`w-5 h-5 ${active ? 'fill-current' : ''}`} />
    <span className="text-[0.625rem] font-medium">{label}</span>
  </button>
)
