/**
 * Admin CRUD and account actions for `users`.
 */
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { getAuthSession } from "@/lib/auth-session";
import { clinicIdsToCsv } from "@/lib/users-db-mapper";
import { normalizeUsPhone } from "@/lib/phone-format";
import { getSecurityQuestionById } from "@/models/settings/security-question.model";
import { deleteUserSecuritiesByUserId, upsertUserSecurityAnswer } from "@/models/settings/user-security.model";
import type { CreateUserInput, UserUpdateInput } from "@/models/user.model";
import * as UserModel from "@/models/user.model";
import type { HttpResult } from "./health.controller";
import { requireRolePermission } from "./_permission";
import { unlinkUserStoredPhoto } from "@/lib/server/unlink-user-photo";

async function unauthorized(): Promise<HttpResult<{ ok: false; message: string }>> {
  return { status: 401, body: { ok: false, message: "Unauthorized." } };
}

function strOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function parseId(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toMysqlDatetime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const DEFAULT_NEW_USER_PASSWORD = "Changeme123!";

export const usersController = {
  async create(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; id?: number; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "users", "create");
    if (denied) return denied;

    const email = strOrNull(input.email);
    const fname = strOrNull(input.firstName);
    const lname = strOrNull(input.lastName);
    const roleId = parseId(input.roleId);
    if (!email || !fname || !lname || roleId == null) {
      return {
        status: 400,
        body: { ok: false, message: "Email, first name, last name, and role are required." },
      };
    }

    const existing = await UserModel.getUserByEmail(email);
    if (existing) {
      return { status: 409, body: { ok: false, message: "A user with this email already exists." } };
    }

    const plain =
      typeof input.password === "string" && input.password.trim()
        ? input.password.trim()
        : DEFAULT_NEW_USER_PASSWORD;
    const hash = await bcrypt.hash(plain, 10);

    const clinicIds = Array.isArray(input.clinicIds) ? input.clinicIds.map(String) : [];
    const clinics = clinicIdsToCsv(clinicIds);

    const payload: CreateUserInput = {
      fname,
      lname,
      email,
      phone: normalizeUsPhone(input.phone),
      fax: normalizeUsPhone(input.fax),
      address: strOrNull(input.address),
      city: strOrNull(input.city),
      state: strOrNull(input.state) ?? "",
      zip: strOrNull(input.zip),
      role_id: roleId,
      password: hash,
      status: 1,
      resetToken: null,
      resetTokenExpiry: null,
      clinics,
      photo: null,
    };

    try {
      const id = await UserModel.createUser(payload);
      const photo = strOrNull(input.photo);
      if (photo) {
        await UserModel.updateUserById(id, { photo });
      }
      return { status: 201, body: { ok: true, id } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Create failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async update(
    id: number,
    input: Record<string, unknown>,
  ): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "users", "edit");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid user id." } };
    }

    const row = await UserModel.getUserById(id);
    if (!row) {
      return { status: 404, body: { ok: false, message: "User not found." } };
    }

    const patch: UserUpdateInput = {};

    if (input.firstName !== undefined) patch.fname = strOrNull(input.firstName);
    if (input.lastName !== undefined) patch.lname = strOrNull(input.lastName);
    if (input.phone !== undefined) patch.phone = normalizeUsPhone(input.phone);
    if (input.fax !== undefined) patch.fax = normalizeUsPhone(input.fax);
    if (input.address !== undefined) patch.address = strOrNull(input.address);
    if (input.city !== undefined) patch.city = strOrNull(input.city);
    if (input.state !== undefined) patch.state = strOrNull(input.state) ?? "";
    if (input.zip !== undefined) patch.zip = strOrNull(input.zip);

    if (input.email !== undefined) {
      const ne = strOrNull(input.email);
      if (ne) {
        const other = await UserModel.getUserByEmail(ne);
        if (other && other.id !== id) {
          return { status: 409, body: { ok: false, message: "Email already in use." } };
        }
        patch.email = ne;
      }
    }

    if (input.roleId !== undefined) {
      const rid = parseId(input.roleId);
      if (rid != null) patch.role_id = rid;
    }

    if (input.clinicIds !== undefined) {
      const clinicIds = Array.isArray(input.clinicIds) ? input.clinicIds.map(String) : [];
      patch.clinics = clinicIdsToCsv(clinicIds);
    }
    if (input.photo !== undefined) {
      patch.photo = strOrNull(input.photo);
    }

    if (Object.keys(patch).length === 0) {
      return { status: 400, body: { ok: false, message: "No valid fields to update." } };
    }

    try {
      await UserModel.updateUserById(id, patch);
      if (input.photo !== undefined) {
        const oldPhoto = row.photo ?? null;
        const newPhoto = patch.photo ?? null;
        if (oldPhoto && oldPhoto !== newPhoto) {
          await unlinkUserStoredPhoto(oldPhoto);
        }
      }
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Update failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async remove(id: number): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "users", "delete");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid user id." } };
    }

    const row = await UserModel.getUserById(id);
    if (!row) {
      return { status: 404, body: { ok: false, message: "User not found." } };
    }

    try {
      await unlinkUserStoredPhoto(row.photo);
      await deleteUserSecuritiesByUserId(id);
      await UserModel.deleteUserById(id);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async resetPassword(id: number): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "users", "edit");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid user id." } };
    }

    const row = await UserModel.getUserById(id);
    if (!row) {
      return { status: 404, body: { ok: false, message: "User not found." } };
    }

    const token = randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    try {
      await UserModel.updateUserById(id, {
        resetToken: token,
        resetTokenExpiry: toMysqlDatetime(expiry),
      });
      return {
        status: 200,
        body: {
          ok: true,
          message: "A password reset token was saved on the account (valid 7 days).",
        },
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Reset failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async clearSecurityQuestions(id: number): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "users", "edit");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid user id." } };
    }

    const row = await UserModel.getUserById(id);
    if (!row) {
      return { status: 404, body: { ok: false, message: "User not found." } };
    }

    try {
      await deleteUserSecuritiesByUserId(id);
      return { status: 200, body: { ok: true, message: "Security answers cleared for this user." } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Clear failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  /**
   * Set login password (bcrypt hash stored server-side; never log plaintext).
   */
  async updatePassword(
    id: number,
    input: Record<string, unknown>,
  ): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "users", "edit");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid user id." } };
    }

    const row = await UserModel.getUserById(id);
    if (!row) {
      return { status: 404, body: { ok: false, message: "User not found." } };
    }

    const password = typeof input.password === "string" ? input.password : "";
    if (password.length < 8) {
      return {
        status: 400,
        body: { ok: false, message: "Password must be at least 8 characters." },
      };
    }

    try {
      const hash = await bcrypt.hash(password, 10);
      await UserModel.updateUserById(id, {
        password: hash,
        resetToken: null,
        resetTokenExpiry: null,
      });
      return { status: 200, body: { ok: true, message: "Password updated." } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Password update failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  /**
   * Add or update one security answer for this user. Other questions they already answered stay in `user_securities`
   * so login can present a random challenge among all stored rows (see `authController.login`).
   */
  async setSecurityQuestion(
    id: number,
    input: Record<string, unknown>,
  ): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "users", "edit");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid user id." } };
    }

    const userRow = await UserModel.getUserById(id);
    if (!userRow) {
      return { status: 404, body: { ok: false, message: "User not found." } };
    }

    const questionId = parseId(input.questionId);
    const answer = typeof input.answer === "string" ? input.answer.trim() : "";
    if (questionId == null) {
      return { status: 400, body: { ok: false, message: "Security question is required." } };
    }
    if (!answer) {
      return { status: 400, body: { ok: false, message: "Answer is required." } };
    }

    const q = await getSecurityQuestionById(questionId);
    if (!q) {
      return { status: 400, body: { ok: false, message: "Invalid security question." } };
    }
    const active = q.status === null || q.status === undefined || q.status === 1;
    if (!active) {
      return { status: 400, body: { ok: false, message: "That security question is not available." } };
    }

    try {
      const answerHash = await bcrypt.hash(answer, 10);
      await upsertUserSecurityAnswer({ userId: id, questionId, answerHash });
      return { status: 200, body: { ok: true, message: "Security answer saved." } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Save failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },
};
