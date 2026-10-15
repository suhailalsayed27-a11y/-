interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ className = '', showText = true, size = 'md' }: LogoProps) {
  const sizes = {
    sm: { box: 'h-9 w-9', text: 'text-lg', sub: 'text-[10px]' },
    md: { box: 'h-12 w-12', text: 'text-xl', sub: 'text-xs' },
    lg: { box: 'h-16 w-16', text: 'text-3xl', sub: 'text-sm' },
  };
  const s = sizes[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src="/مهرة1.png"
        alt="مَهَرَة"
        className={`${s.box} rounded-2xl object-cover shadow-lg shadow-primary-600/20 shrink-0`}
      />
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`${s.text} font-black text-slate-800`}>مَهَرَة</span>
          <span className={`${s.sub} text-slate-400 font-medium mt-0.5`}>مهارات وخدمات</span>
        </div>
      )}
    </div>
  );
}
