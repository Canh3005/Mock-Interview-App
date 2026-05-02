export default function ResizeDivider({ onMouseDown }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="w-2 flex-shrink-0 flex items-center justify-center cursor-col-resize group"
    >
      <div className="w-0.5 h-10 rounded-full bg-slate-700 group-hover:bg-cta transition-colors duration-150" />
    </div>
  )
}
