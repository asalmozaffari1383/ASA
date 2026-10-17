export type NavItem = {
  label: string;
  href: string;
};

export type Service = {
  title: string;
  description: string;
  /** Short technical keywords shown as a spec row on the service card. */
  specs: string[];
};

export type Partner = {
  name: string;
  /** Optional logo URL. When omitted, a monogram placeholder is shown. */
  logo?: string;
};

export type SocialLink = {
  label: string;
  href: string;
  text: string;
};

export type WorkflowStep = {
  title: string;
  description: string;
};

export type CertificateStatus = "valid" | "invalid" | "idle";

export type CertificateResult = {
  status: CertificateStatus;
  certificateNumber: string;
  validUntil?: string;
  message: string;
};
