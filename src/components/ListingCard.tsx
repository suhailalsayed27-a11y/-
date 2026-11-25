import { Link } from 'react-router-dom';
import { MapPin, Eye, ShieldCheck } from 'lucide-react';
import type { Listing } from '@/types';
import { getCategoryColor } from '@/types';
import StarRating from './StarRating';

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const color = getCategoryColor(listing.category?.name || '');
  const providerExtra = (listing.provider || {}) as Record<string, any>;
  const avatar = listing.provider?.avatar_url;
  const providerName = listing.provider?.full_name || 'مقدم خدمة';
  const isVerified = Boolean(providerExtra.is_verified || listing.provider?.provider_verified);
  const isAvailable = providerExtra.is_available_now !== false;
  const district = providerExtra.district as string | undefined;

  return (
    <Link
      to={`/listings/${listing.id}`}
      className="card card-hover group flex flex-col overflow-hidden"
    >
      {/* Top: Avatar + Category badge */}
      <div className={`relative h-24 ${color.bg}`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${color.gradient} opacity-90`} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-black text-white/30">{listing.category?.name?.charAt(0)}</span>
        </div>
        <div className="absolute -bottom-7 right-4">
          {avatar ? (
            <img
              src={avatar}
              alt={providerName}
              className="h-14 w-14 rounded-full bg-slate-50 object-contain p-0.5 ring-4 ring-white shadow-md"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full bg-white text-lg font-bold text-slate-600 ring-4 ring-white shadow-md ${
              avatar ? 'hidden' : ''
            }`}
          >
            {providerName.charAt(0)}
          </div>
          {isAvailable && (
            <span
              title="متاح للعمل الآن"
              className="absolute bottom-0.5 left-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white"
            />
          )}
        </div>
        {listing.featured && (
          <span className="absolute top-3 left-3 rounded-full bg-accent-500 px-2.5 py-1 text-xs font-bold text-white shadow-md">
            مميزة
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 pt-9">
        <h3 className="text-base font-bold text-slate-800 group-hover:text-primary-600 transition-colors line-clamp-1">
          {listing.service_name}
        </h3>

        <div className="mt-1 flex items-center gap-1.5 min-w-0">
          <p className="text-sm text-slate-500 truncate">{providerName}</p>
          {isVerified && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">
              <ShieldCheck size={12} />
              موثق
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <MapPin size={14} className="text-primary-500 shrink-0" />
            <span>
              {listing.city}
              {district ? ` - ${district}` : ''}
            </span>
          </span>
          {isAvailable && (
            <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              متاح الآن
            </span>
          )}
        </div>

        <div className="mt-3">
          <StarRating rating={listing.rating} size={14} showNumber count={listing.rating_count} />
        </div>

        <div className="mt-auto flex items-center justify-between pt-4">
          <div>
            <span className="text-lg font-black text-primary-600">
              {Number(listing.price).toLocaleString('ar-EG')}
            </span>
            <span className="text-xs text-slate-400 mr-1">ر.ي</span>
          </div>
          <span className="flex items-center gap-1 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700 transition-colors group-hover:bg-primary-100">
            <Eye size={14} />
            عرض الخدمة
          </span>
        </div>
      </div>
    </Link>
  );
}