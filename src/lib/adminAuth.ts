// Admin-only credentials (subset of all valid users)
const ADMIN_EMAILS = [
  "francisgbohunmi@gmail.com",
  "realdiamonddigital@gmail.com",
  "tolludare@yahoo.com",
];

export interface AdminUser {
  email: string;
  isAdmin: true;
}

export const isAdminEmail = (email: string): boolean => {
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
};

export const getAdminSession = (): AdminUser | null => {
  const stored = localStorage.getItem("admin_session");
  if (!stored) return null;
  
  try {
    const session = JSON.parse(stored);
    if (session.email && isAdminEmail(session.email)) {
      return session as AdminUser;
    }
  } catch {
    return null;
  }
  return null;
};

export const setAdminSession = (email: string): boolean => {
  if (!isAdminEmail(email)) return false;
  
  localStorage.setItem("admin_session", JSON.stringify({
    email: email.toLowerCase().trim(),
    isAdmin: true,
  }));
  return true;
};

export const clearAdminSession = (): void => {
  localStorage.removeItem("admin_session");
};
