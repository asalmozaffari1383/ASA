import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiClient } from "./apiClient";
export const defaultPageText = {
  "hero_eyebrow": "مهندسی، بازرسی و ایمنی کار",
  "hero_title": "ایمن سازان آرارات",
  "hero_subtitle": "دقت در بازرسی، اطمینان در ایمنی",
  "hero_description": "از ارزیابی فنی تجهیزات تا طراحی راهکارهای ایمنی؛ همراه صنایع و کارگاه‌ها برای شناخت ریسک، حفاظت از سرمایه و ساختن محیط کاری ایمن‌تر.",
  "hero_button": "خدمات تخصصی",
  "hero_image_alt": "بازرسی تخصصی تجهیزات صنعتی توسط کارشناس ایمنی آسا",
  "about_eyebrow": "مهندسی و مشاوره",
  "about_title": "تصمیم‌های ایمن، پیش از شروع پروژه",
  "about_description": "طراحی، اجرا و مشاوره پیش از پروژه در زمینه سیستم‌های ارتینگ و ایمنی حریق.",
  "about_description_extra": "آسا با نگاه مهندسی و مستندسازی دقیق، مسیر ارزیابی، طراحی و اخذ تأییدیه‌های ایمنی را برای سازمان‌ها و کارگاه‌های صنعتی ساده‌تر و قابل اتکاتر می‌کند.",
  "about_image_alt": "کارشناس بازرسی در میان مخازن تحت فشار",
  "services_eyebrow": "تخصص ما، اطمینان شما",
  "services_title": "ایمنی، در تمام جزئیات",
  "services_description": "راهکارهای تخصصی برای شناخت ریسک، حفاظت از سرمایه و ساختن محیط کاری که به آن اطمینان دارید.",
  "process_eyebrow": "فرآیند همکاری",
  "process_title": "روند صدور گواهی",
  "process_description": "مسیر تبدیل خدمات آسا به گزارش رسمی و گواهی معتبر — شفاف و قابل پیگیری.",
  "clients_eyebrow": "همراهان آسا",
  "clients_title": "شرکت‌هایی که به ما اعتماد کرده‌اند",
  "cta_eyebrow": "پیشگیری، ارزان‌ترین تصمیم است",
  "cta_title": "پیش از حادثه",
  "cta_subtitle": "اقدام کنید",
  "cta_description": "درخواست بازرسی امروز ثبت می‌شود؛ گزارش رسمی و گواهی ایمنی معتبر، پیش از آن‌که به آن نیاز پیدا کنید آماده است.",
  "pillars": [
    {
      "label": "تحلیل ریسک",
      "detail": "شناسایی و ارزیابی خطرات پیش از اجرا"
    },
    {
      "label": "طراحی ایمن",
      "detail": "راهکار مهندسی مطابق استاندارد"
    },
    {
      "label": "مستندسازی دقیق",
      "detail": "ثبت شواهد و گزارش رسمی هر بازرسی"
    },
    {
      "label": "پیگیری درخواست",
      "detail": "اطلاع از مراحل بررسی به‌صورت آنلاین"
    }
  ],
  "workflow_steps": [
    {
      "title": "ثبت درخواست و بررسی مدارک",
      "description": "دریافت اطلاعات اولیه، محدوده پروژه و آماده‌سازی برنامه بازرسی."
    },
    {
      "title": "بازدید، آزمون و مستندسازی",
      "description": "اجرای تست‌های فنی، ارزیابی ریسک و ثبت شواهد قابل پیگیری."
    },
    {
      "title": "رفع ایرادات و بازرسی مجدد",
      "description": "رفع ایرادات شناسایی‌شده و انجام بازرسی مجدد برای تأیید اصلاحات."
    },
    {
      "title": "گزارش نهایی و صدور گواهی",
      "description": "تحویل گزارش رسمی، اعلام اصلاحات احتمالی و امکان استعلام اعتبار."
    }
  ]
};
export type PageText = typeof defaultPageText;
export type PageContent = { content: PageText; hero_image_url: string; about_image_url: string; cta_image_url: string };
const defaults: PageContent = { content: defaultPageText, hero_image_url: "/images/hero.jpg", about_image_url: "/images/service-vessels.jpg", cta_image_url: "/images/cta-firefighter.jpg" };
const PageContext = createContext<PageContent>(defaults);
export const usePageContent = () => useContext(PageContext);
export function PageContentProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState(defaults);
  useEffect(() => {
    const controller = new AbortController();
    apiClient.get<PageContent>("/public/page-content/", { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setPage({ ...defaults, ...data, content: { ...defaultPageText, ...data.content } }); })
      .catch(() => { /* Keep the existing page available if the API is unavailable. */ });
    return () => controller.abort();
  }, []);
  return <PageContext.Provider value={page}>{children}</PageContext.Provider>;
}
