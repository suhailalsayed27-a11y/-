import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  size?: number;
  showNumber?: boolean;
  count?: number;
}

export default function StarRating({ rating, size = 16, showNumber = false, count }: StarRatingProps) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={size}
            className={
              i <= Math.round(rating)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-slate-200 text-slate-200'
            }
          />
        ))}
      </div>
      {showNumber && (
        <span className="text-sm font-bold text-slate-700 mr-1">{rating.toFixed(1)}</span>
      )}
      {count !== undefined && count > 0 && (
        <span className="text-xs text-slate-400">({count})</span>
      )}
    </div>
  );
}
