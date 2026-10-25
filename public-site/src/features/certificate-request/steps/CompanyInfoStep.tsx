import { JalaliDateInput } from "../../../components/ui/form/JalaliDateInput";
import { TextInput } from "../../../components/ui/form/TextInput";

export function CompanyInfoStep() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextInput
        name="companyName"
        label="نام شرکت متقاضی"
        required
        placeholder="مثال: صنایع ایمن آرارات"
      />
      <TextInput
        name="ceoName"
        label="نام و نام خانوادگی مدیر عامل"
        required
        placeholder="نام کامل مدیر عامل"
      />
      <TextInput
        name="ceoPhone"
        label="شماره تماس مدیر عامل"
        required
        type="tel"
        inputMode="tel"
        dir="ltr"
        placeholder="09xxxxxxxxx"
      />
      <TextInput
        name="activityType"
        label="نوع فعالیت شرکت"
        required
        placeholder="مثال: انبار، تولیدی، صنعتی"
      />
      <TextInput
        name="alternatePhone"
        label="شماره تماس جایگزین (جهت هماهنگی بازدید)"
        type="tel"
        inputMode="tel"
        dir="ltr"
        placeholder="اختیاری"
      />
      <TextInput
        name="referrerName"
        label="نام و نام خانوادگی معرف"
        placeholder="اختیاری"
      />
      <JalaliDateInput
        name="requestDate"
        label="تاریخ درخواست"
        className="sm:col-span-2 sm:max-w-xs"
      />
    </div>
  );
}
