// License key types
export type LicenseType = 'single' | 'family' | 'pro' | 'business';

// License key interface
export interface LicenseKey {
  key: string;
  type: LicenseType;
  expires: string;
  expirationDate: Date;
}

// Function to get expiration date (120 days from now)
function getExpirationDate() {
  const date = new Date();
  date.setDate(date.getDate() + 120);
  
  const formatted = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return { date, formatted };
}

// Single User Licenses
export const singleUserLicenses: LicenseKey[] = [
  {
    key: "RNKJ-XTPB-LFGM-QVWC3",
    type: "single",
    expires: getExpirationDate().formatted,
    expirationDate: getExpirationDate().date
  },
  {
    key: "HZXD-YVGP-QNMK-JBSF7",
    type: "single",
    expires: getExpirationDate().formatted,
    expirationDate: getExpirationDate().date
  },
  {
    key: "TPWL-QVNM-KZXD-JBGF5",
    type: "single",
    expires: getExpirationDate().formatted,
    expirationDate: getExpirationDate().date
  },
  {
    key: "ABCD-EFGH-IJKL-MNOP1",
    type: "single",
    expires: getExpirationDate().formatted,
    expirationDate: getExpirationDate().date
  },
  {
    key: "QRST-UVWX-YZAB-CDEF2",
    type: "single",
    expires: getExpirationDate().formatted,
    expirationDate: getExpirationDate().date
  },
  {
    key: "GHIJ-KLMN-OPQR-STUV3",
    type: "single",
    expires: getExpirationDate().formatted,
    expirationDate: getExpirationDate().date
  }
];

// Family Plan Licenses
export const familyLicenses: LicenseKey[] = [
  {
    key: "GFTP-QVNM-KZXD-JBSF9",
    type: "family",
    expires: getExpirationDate().formatted,
    expirationDate: getExpirationDate().date
  },
  {
    key: "KZXD-JBSF-GFTP-QVNM3",
    type: "family",
    expires: getExpirationDate().formatted,
    expirationDate: getExpirationDate().date
  },
  {
    key: "QVNM-KZXD-JBSF-GFTP1",
    type: "family",
    expires: getExpirationDate().formatted,
    expirationDate: getExpirationDate().date
  },
  {
    key: "WXYZ-ABCD-EFGH-IJKL4",
    type: "family",
    expires: getExpirationDate().formatted,
    expirationDate: getExpirationDate().date
  },
  {
    key: "MNOP-QRST-UVWX-YZAB5",
    type: "family",
    expires: getExpirationDate().formatted,
    expirationDate: getExpirationDate().date
  },
  {
    key: "CDEF-GHIJ-KLMN-OPQR6",
    type: "family",
    expires: getExpirationDate().formatted,
    expirationDate: getExpirationDate().date
  }
];

// Pro Licenses
export const proLicenses: LicenseKey[] = [
  {
    key: "PRTK-JVNM-QZXD-LBSF2",
    type: "pro",
    expires: getExpirationDate().formatted,
    expirationDate: getExpirationDate().date
  },
  {
    key: "PRLM-NVBQ-KZXD-JBSF4",
    type: "pro",
    expires: getExpirationDate().formatted,
    expirationDate: getExpirationDate().date
  },
  {
    key: "PRWL-QVNM-KZXD-JBGF8",
    type: "pro",
    expires: getExpirationDate().formatted,
    expirationDate: getExpirationDate().date
  },
  {
    key: "PRCD-EFGH-IJKL-MNOP9",
    type: "pro",
    expires: getExpirationDate().formatted,
    expirationDate: getExpirationDate().date
  },
  {
    key: "PRST-UVWX-YZAB-CDEF6",
    type: "pro",
    expires: getExpirationDate().formatted,
    expirationDate: getExpirationDate().date
  },
  {
    key: "PRIJ-KLMN-OPQR-STUV7",
    type: "pro",
    expires: getExpirationDate().formatted,
    expirationDate: getExpirationDate().date
  }
];

// Business Plan Licenses
export const businessLicenses: LicenseKey[] = [
  {
    key: "JBSF-GFTP-QVNM-KZXD7",
    type: "business",
    expires: getExpirationDate().formatted,
    expirationDate: getExpirationDate().date
  },
  {
    key: "QVNM-KZXD-JBSF-GFTP5",
    type: "business",
    expires: getExpirationDate().formatted,
    expirationDate: getExpirationDate().date
  },
  {
    key: "KZXD-JBSF-GFTP-QVNM9",
    type: "business",
    expires: getExpirationDate().formatted,
    expirationDate: getExpirationDate().date
  },
  {
    key: "STUV-WXYZ-ABCD-EFGH7",
    type: "business",
    expires: getExpirationDate().formatted,
    expirationDate: getExpirationDate().date
  },
  {
    key: "IJKL-MNOP-QRST-UVWX8",
    type: "business",
    expires: getExpirationDate().formatted,
    expirationDate: getExpirationDate().date
  },
  {
    key: "YZAB-CDEF-GHIJ-KLMN9",
    type: "business",
    expires: getExpirationDate().formatted,
    expirationDate: getExpirationDate().date
  }
];

// All licenses combined
export const allLicenseKeys: LicenseKey[] = [
  ...singleUserLicenses,
  ...familyLicenses,
  ...proLicenses,
  ...businessLicenses
];

// Utility functions
export function validateLicenseKey(key: string): boolean {
  // Check format
  const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  if (!pattern.test(key)) {
    return false;
  }
  
  // Check if it's in our list of valid keys
  return allLicenseKeys.some(license => license.key === key);
}

export function getLicenseType(key: string): LicenseType | null {
  const license = allLicenseKeys.find(license => license.key === key);
  return license ? license.type : null;
}

export function isLicenseExpired(key: string): boolean {
  const license = allLicenseKeys.find(license => license.key === key);
  if (!license) return true;
  
  return new Date() > license.expirationDate;
}