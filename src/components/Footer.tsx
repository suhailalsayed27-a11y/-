import { Link, useLocation } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import Logo from './Logo';

export default function Footer() {
  const location = useLocation();

  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/auth')) {
    return null;
  }

  return (
    <footer className="border-t border-slate-200 bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <Logo size="md" />
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              منصة تربط أصحاب المهارات بالعملاء. اعرض مهارتك وابحث عن الخدمة التي تحتاجها في صنعاء وعدن.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-white mb-4">روابط سريعة</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-primary-400 transition-colors">الرئيسية</Link></li>
              <li><Link to="/services" className="hover:text-primary-400 transition-colors">الخدمات</Link></li>
              <li><Link to="/add-skill" className="hover:text-primary-400 transition-colors">أضف مهارتك</Link></li>
              <li><Link to="/auth/signin" className="hover:text-primary-400 transition-colors">تسجيل الدخول</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-white mb-4">تواصل معنا</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Mail size={16} className="text-primary-400" />
                <span dir="ltr">mahra.yemeni@gmail.com</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} className="text-primary-400" />
                <span dir="ltr">+967 781919119</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={16} className="text-primary-400" />
                <span>صنعاء، عدن - اليمن</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-400">
          <p>© 2026 مَهَرَة. جميع الحقوق محفوظة.</p>
          <p>صُنع بكل فخر في اليمن</p>
        </div>
      </div>
    </footer>
  );
}
