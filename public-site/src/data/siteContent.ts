import type {
  NavItem,
  Partner,
  Service,
  SocialLink,
  WorkflowStep,
} from "../types/content";

export const navItems: NavItem[] = [
  { label: "صفحه اصلی", href: "#" },
  { label: "خدمات", href: "#services" },
  { label: "فرآیند همکاری", href: "#process" },
  { label: "درباره ما", href: "#about" },
  { label: "تماس با ما", href: "#contact" },
];

export const services: Service[] = [
  {
    title: "ارزیابی ایمنی ظروف تحت فشار",
    description:
      "ضخامت‌سنجی اولتراسونیک، تست هیدرو استاتیک و بازرسی فنی دیگ‌های بخار و آبگرم",
    specs: ["ضخامت‌سنجی اولتراسونیک", "تست هیدرواستاتیک", "دیگ بخار و آبگرم"],
  },
  {
    title: "ارزیابی ایمنی برق",
    description:
      "تست ادواری سیستم اتصال به زمین (ارتینگ) و ایمنی تاسیسات الکتریکی در کارگاه‌های صنعتی",
    specs: ["تست ارتینگ", "تاسیسات الکتریکی", "بازرسی ادواری"],
  },
  {
    title: "اعلام و اطفاء حریق",
    description: "ارزیابی تخصصی، طراحی و اجرای سیستم‌های اعلام و اطفاء حریق هوشمند",
    specs: ["سیستم اعلام حریق", "سیستم اطفاء", "طراحی و اجرا"],
  },
];

export const workflowSteps: WorkflowStep[] = [
  {
    title: "ثبت درخواست و بررسی مدارک",
    description: "دریافت اطلاعات اولیه، محدوده پروژه و آماده‌سازی برنامه بازرسی.",
  },
  {
    title: "بازدید، آزمون و مستندسازی",
    description: "اجرای تست‌های فنی، ارزیابی ریسک و ثبت شواهد قابل پیگیری.",
  },
  {
    title: "رفع ایرادات و بازرسی مجدد",
    description: "رفع ایرادات شناسایی‌شده و انجام بازرسی مجدد برای تأیید اصلاحات.",
  },
  {
    title: "گزارش نهایی و صدور گواهی",
    description: "تحویل گزارش رسمی، اعلام اصلاحات احتمالی و امکان استعلام اعتبار.",
  },
];

// Placeholder clients/partners. To use real logos later, add a `logo` URL to an
// entry (e.g. logo: "/logos/acme.png"); the card renders the image automatically.
export const partners: Partner[] = [
  { name: "فولاد آرین" },
  { name: "پتروشیمی پارس" },
  { name: "صنایع البرز" },
  { name: "نیرو گستر" },
  { name: "ماشین‌سازی کاوه" },
  { name: "سیمان داتیس" },
  { name: "پالایش زاگرس" },
  { name: "گروه صنعتی مانا" },
];

export const socialLinks: SocialLink[] = [
  { label: "Instagram", href: "#", text: "IG" },
  { label: "LinkedIn", href: "#", text: "in" },
  { label: "WhatsApp", href: "#", text: "WA" },
];
