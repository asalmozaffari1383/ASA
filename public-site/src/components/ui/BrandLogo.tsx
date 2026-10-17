import asaLogo from "../../assets/brand/asa-logo.svg";

type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className = "" }: BrandLogoProps) {
  return (
    <img
      src={asaLogo}
      alt="لوگوی ایمن سازان آرارات"
      className={`h-full w-full object-contain ${className}`}
      loading="eager"
      decoding="async"
    />
  );
}
