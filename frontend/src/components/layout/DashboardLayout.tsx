import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import type { PermissionFlag } from "../../types";

interface NavItem {
  to: string;
  label: string;
  permission: PermissionFlag;
}

const NAV: NavItem[] = [
  { to: "/panel/secretary", label: "درخواست‌ها", permission: "can_fill_bale_forms" },
  { to: "/panel/expert", label: "میز کار کارشناس", permission: "can_do_inspection" },
  { to: "/panel/ceo/financial", label: "امور مالی", permission: "can_manage_financial" },
  { to: "/panel/ceo/certificates", label: "صدور گواهی‌نامه", permission: "can_issue_certificate" },
];

export function DashboardLayout() {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  const items = NAV.filter((n) => can(n.permission));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 font-bold text-white">آسا</span>
            <span className="hidden font-bold text-slate-700 sm:block">پنل مدیریت</span>
          </div>
          <nav className="flex flex-1 flex-wrap gap-1 overflow-x-auto">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${
                    isActive ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-100"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            {user?.role === "ceo" && <NavLink to="/panel/ceo/site-content" className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${isActive ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-100"}`}>محتوای سایت</NavLink>}
            {user?.role === "ceo" && <NavLink to="/panel/ceo/site-partners" className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${isActive ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-100"}`}>لوگوی همکاران</NavLink>}
            {user?.role === "ceo" && <NavLink to="/panel/ceo/site-pages" className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${isActive ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-100"}`}>صفحه اصلی و درباره ما</NavLink>}
            {user?.role === "ceo" && <NavLink to="/panel/ceo/site-contact" className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${isActive ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-100"}`}>تماس با ما</NavLink>}
            {user?.role === "ceo" && <NavLink to="/panel/ceo/bot-settings" className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${isActive ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-100"}`}>تنظیمات بات</NavLink>}
          </nav>
          <div className="flex items-center gap-3">
            <NavLink
              to="/panel/settings"
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-100"
                }`
              }
            >
              پروفایل و تنظیمات
            </NavLink>
            <span className="hidden text-sm text-slate-500 sm:block">{user?.username}</span>
            <button
              className="btn-ghost px-3 py-1.5 text-sm"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              خروج
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
