/**
 * Users admin table + dialog shape (no password).
 */
export type UserRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  fax: string;
  /** Selected role id for forms */
  roleId: string;
  /** Role label for table / badges */
  roleName: string;
  /** From role.description */
  permission: string;
  /** Clinic row ids from `users.clinics` CSV */
  clinicIds: string[];
  photo: string;
};

export type RoleOption = { id: number; name: string; description: string | null };
export type ClinicOption = { id: number; name: string };

export type SecurityQuestionOption = { id: number; question: string };

export type UsersPagePayload = {
  rows: UserRecord[];
  roleOptions: RoleOption[];
  clinicOptions: ClinicOption[];
  securityQuestionOptions: SecurityQuestionOption[];
};

/** Values sent from add/edit dialog (no derived display fields). */
export type UserSavePayload = {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  fax: string;
  roleId: string;
  clinicIds: string[];
  photo: string;
  photoFile?: File | null;
};
