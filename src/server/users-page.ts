import "server-only";

import { userDbToTableRow } from "@/lib/users-db-mapper";
import * as ClinicModel from "@/models/clinic.model";
import * as RoleModel from "@/models/settings/role.model";
import * as SecurityQuestionModel from "@/models/settings/security-question.model";
import * as UserModel from "@/models/user.model";
import type { ClinicOption, RoleOption, SecurityQuestionOption, UsersPagePayload } from "@/types/users-page";

function isSecurityQuestionActive(status: number | null | undefined): boolean {
  if (status === null || status === undefined) return true;
  return status === 1;
}

export async function loadUsersPagePayload(): Promise<UsersPagePayload> {
  const [userRows, roles, clinics, questions] = await Promise.all([
    UserModel.getAllUsers(),
    RoleModel.getAllRoles(),
    ClinicModel.getAllClinics(),
    SecurityQuestionModel.getAllSecurityQuestions(),
  ]);

  const roleOptions: RoleOption[] = roles.map(r => ({
    id: r.id,
    name: (r.name ?? "").trim() || `Role #${r.id}`,
    description: r.description,
  }));

  const roleById = new Map(roleOptions.map(o => [o.id, { name: o.name, description: o.description }]));

  const clinicOptions: ClinicOption[] = clinics.map(c => ({
    id: c.id,
    name: (c.name ?? "").trim() || `Clinic #${c.id}`,
  }));

  const rows = userRows.map(u => userDbToTableRow(u, roleById));

  const securityQuestionOptions: SecurityQuestionOption[] = questions
    .filter(q => isSecurityQuestionActive(q.status))
    .map(q => ({
      id: q.id,
      question: (q.question ?? "").trim() || `Question #${q.id}`,
    }));

  return { rows, roleOptions, clinicOptions, securityQuestionOptions };
}
