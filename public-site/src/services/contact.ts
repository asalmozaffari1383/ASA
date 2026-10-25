import { apiClient } from "./apiClient";
export interface ContactSettings {
  title: string; subtitle: string; services_title: string; services: string[];
  links: { kind: string; label: string; text: string; href: string }[];
}
export const defaultContact: ContactSettings = {"title": "تماس با آسا", "subtitle": "مهندسین مشاور ایمنی آسا", "services_title": "ارزیابی و صدور گواهی ایمنی", "services": ["اعلام و اطفا حریق", "ظروف تحت فشار", "ایمنی برق"], "links": [{"kind": "instagram", "label": "اینستاگرام", "text": "@imensazanararat", "href": "https://www.instagram.com/imensazanararat/"}, {"kind": "web", "label": "وب‌سایت", "text": "www.asaeng.org", "href": "https://asaeng.org"}, {"kind": "mail", "label": "ایمیل", "text": "info@asaeng.org", "href": "mailto:info@asaeng.org"}, {"kind": "phone", "label": "تماس مستقیم", "text": "09141651365", "href": "tel:+989141651365"}, {"kind": "phone", "label": "شماره همراه، واتساپ و بله", "text": "09002652365", "href": "tel:+989002652365"}, {"kind": "map", "label": "نشانی", "text": "منطقه آزاد ماکو، روبه‌روی شهرداری", "href": "https://www.google.com/maps/search/?api=1&query=ماکو+شهرداری"}, {"kind": "chat", "label": "پیام‌رسان بله", "text": "ثبت درخواست در بات آسا", "href": "https://ble.ir/AsaengBot"}]};
export async function fetchContact() {
  return (await apiClient.get<ContactSettings>("/public/contact/")).data;
}
