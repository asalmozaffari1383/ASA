export type PublicService = {
  id: number;
  title: string;
  description: string;
  details: string;
  applications: string;
  inspection_steps: string;
  specs: string[];
  image_url: string;
  image_alt: string;
};

export type CompanyPartner = {
  id: number;
  name: string;
  logo_url: string;
};
