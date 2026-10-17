import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../../auth/AuthContext";
import {
  createUser,
  deleteUser,
  listUsers,
  updateMe,
  updateUser,
} from "../../api/endpoints";
import { Spinner } from "../../components/ui/Spinner";
import { Toggle } from "../../components/ui/Toggle";
import { PERMISSION_OPTIONS, ROLE_LABELS, ROLE_OPTIONS } from "../../lib/labels";
import type { ManagedUser } from "../../types";

type Tab = "profile" | "users";

export function ProfileSettings() {
  const { user } = useAuth();
  const isCeo = user?.role === "ceo";
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TabButton active={tab === "profile"} onClick={() => setTab("profile")}>پروفایل من</TabButton>
        {isCeo && (
          <TabButton active={tab === "users"} onClick={() => setTab("users")}>مدیریت کاربران</TabButton>
        )}
      </div>
      {tab === "profile" ? <ProfileTab /> : isCeo ? <UsersTab /> : null}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-1.5 text-sm transition ${
        active ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

// --------------------------------------------------------------------------- //
// Profile tab: self-service signature upload                                  //
// --------------------------------------------------------------------------- //
function ProfileTab() {
  const { user, refreshUser } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const onPick = (f: File | null) => {
    setFile(f);
    setMsg("");
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const save = async () => {
    if (!file) return;
    setBusy(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("signature_image", file);
      await updateMe(fd);
      await refreshUser();
      setFile(null);
      setPreview(null);
      setMsg("امضا با موفقیت ذخیره شد.");
    } catch {
      setMsg("ذخیره امضا با خطا مواجه شد.");
    } finally {
      setBusy(false);
    }
  };

  const currentSignature = preview ?? user?.signature_image ?? null;

  return (
    <div className="max-w-xl space-y-4">
      <div className="card space-y-2">
        <h2 className="font-bold text-slate-800">اطلاعات کاربری</h2>
        <Row label="نام کاربری" value={user?.username ?? "—"} />
        <Row label="نقش" value={user ? ROLE_LABELS[user.role] ?? user.role : "—"} />
        {user?.title ? <Row label="سمت" value={user.title} /> : null}
      </div>

      <div className="card space-y-3">
        <h2 className="font-bold text-slate-800">امضای دیجیتال</h2>
        <p className="text-sm text-slate-500">
          تصویر امضای شفاف (PNG) خود را بارگذاری کنید. این امضا به‌صورت خودکار روی گواهی‌نامه‌هایی که صادر می‌کنید درج می‌شود.
        </p>
        <div className="grid place-items-center rounded-xl bg-slate-50 p-4">
          {currentSignature ? (
            <img src={currentSignature} alt="امضا" className="max-h-32 object-contain" />
          ) : (
            <span className="text-sm text-slate-400">امضایی ثبت نشده است.</span>
          )}
        </div>
        <input
          type="file"
          accept="image/png,image/jpeg"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-600 file:me-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-brand-700"
        />
        {msg && <p className="text-sm text-slate-500">{msg}</p>}
        <button className="btn-primary w-full py-2.5" onClick={save} disabled={!file || busy}>
          {busy ? "در حال ذخیره..." : "ذخیره امضا"}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  );
}

// --------------------------------------------------------------------------- //
// User management tab (CEO only)                                              //
// --------------------------------------------------------------------------- //
interface UserForm {
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  title: string;
  role: string;
  is_active: boolean;
  can_manage_financial: boolean;
  can_fill_bale_forms: boolean;
  can_do_inspection: boolean;
  can_issue_certificate: boolean;
}

const EMPTY_FORM: UserForm = {
  username: "", password: "", first_name: "", last_name: "", title: "",
  role: "secretary", is_active: true,
  can_manage_financial: false, can_fill_bale_forms: false,
  can_do_inspection: false, can_issue_certificate: false,
};

function UsersTab() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ManagedUser | "new" | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await listUsers();
    setUsers(Array.isArray(data) ? data : data.results);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) return <Spinner label="در حال بارگذاری کاربران..." />;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">کاربران</h2>
          <button className="btn-primary px-4 py-1.5 text-sm" onClick={() => setEditing("new")}>
            + کاربر جدید
          </button>
        </div>
        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id}>
              <button
                onClick={() => setEditing(u)}
                className={`w-full rounded-xl p-3 text-start ring-1 transition ${
                  editing !== "new" && editing?.id === u.id ? "bg-brand-50 ring-brand-500" : "ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">
                    {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : u.username}
                  </span>
                  <span className="text-xs text-slate-400">{ROLE_LABELS[u.role] ?? u.role}</span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  @{u.username}{u.title ? ` — ${u.title}` : ""}{u.is_active ? "" : " (غیرفعال)"}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {editing ? (
        <UserEditor
          key={editing === "new" ? "new" : editing.id}
          target={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      ) : (
        <div className="card grid place-items-center text-sm text-slate-400">
          یک کاربر را برای ویرایش انتخاب کنید یا کاربر جدیدی بسازید.
        </div>
      )}
    </div>
  );
}

function UserEditor({ target, onClose, onSaved }: {
  target: ManagedUser | "new";
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = target === "new";
  const [form, setForm] = useState<UserForm>(
    isNew
      ? EMPTY_FORM
      : {
          ...EMPTY_FORM,
          username: target.username,
          first_name: target.first_name,
          last_name: target.last_name,
          title: target.title,
          role: target.role,
          is_active: target.is_active,
          can_manage_financial: target.can_manage_financial,
          can_fill_bale_forms: target.can_fill_bale_forms,
          can_do_inspection: target.can_do_inspection,
          can_issue_certificate: target.can_issue_certificate,
        },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof UserForm>(k: K, v: UserForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("username", form.username);
      fd.append("first_name", form.first_name);
      fd.append("last_name", form.last_name);
      fd.append("title", form.title);
      fd.append("role", form.role);
      fd.append("is_active", String(form.is_active));
      for (const p of PERMISSION_OPTIONS) fd.append(p.key, String(form[p.key]));
      if (form.password) fd.append("password", form.password);
      if (isNew) await createUser(fd);
      else await updateUser(target.id, fd);
      onSaved();
    } catch {
      setError("ذخیره کاربر با خطا مواجه شد. نام کاربری تکراری یا رمز کوتاه است؟");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (isNew) return;
    if (!confirm("این کاربر حذف شود؟")) return;
    setBusy(true);
    try {
      await deleteUser(target.id);
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800">{isNew ? "کاربر جدید" : "ویرایش کاربر"}</h3>
        <button className="btn-ghost text-sm" onClick={onClose}>بستن</button>
      </div>
      {error && <p className="rounded-xl bg-red-50 p-2 text-sm text-red-600">{error}</p>}

      <Field label="نام کاربری">
        <input className="input" value={form.username} disabled={!isNew}
          onChange={(e) => set("username", e.target.value)} />
      </Field>
      <Field label={isNew ? "رمز عبور" : "رمز عبور جدید (اختیاری)"}>
        <input className="input" type="password" value={form.password}
          onChange={(e) => set("password", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="نام"><input className="input" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} /></Field>
        <Field label="نام خانوادگی"><input className="input" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></Field>
      </div>
      <Field label="سمت / عنوان شغلی">
        <input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="مثلاً کارشناس ارشد ایمنی" />
      </Field>
      <Field label="نقش">
        <select className="input" value={form.role} onChange={(e) => set("role", e.target.value)}>
          {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>

      <div className="space-y-2 rounded-xl bg-slate-50 p-3">
        <span className="text-sm font-medium text-slate-600">دسترسی‌ها</span>
        {PERMISSION_OPTIONS.map((p) => (
          <Toggle key={p.key} label={p.label} checked={form[p.key]} onChange={(v) => set(p.key, v)} />
        ))}
      </div>

      <Toggle label="فعال" checked={form.is_active} onChange={(v) => set("is_active", v)} />

      <div className="flex gap-2 pt-1">
        <button className="btn-primary flex-1 py-2.5" onClick={save} disabled={busy}>
          {busy ? "در حال ذخیره..." : "ذخیره"}
        </button>
        {!isNew && (
          <button className="btn-danger px-4 py-2.5 text-sm" onClick={remove} disabled={busy}>حذف</button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="label">{label}</span>
      {children}
    </div>
  );
}
