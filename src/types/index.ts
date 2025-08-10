export interface PasswordEntry {
  id: string;
  accountName: string;
  username: string;
  password: string;
  notes?: string;
  balance?: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}