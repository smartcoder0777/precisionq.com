/**
 * Controller: authentication and security verification orchestration.
 */
import bcrypt from "bcryptjs";
import { getUserByEmail, getUserById } from "@/models/user.model";
import {
  getUserSecurityByUserAndQuestion,
  getUserSecurityByUserId,
} from "@/models/settings/user-security.model";
import { getSecurityQuestionById } from "@/models/settings/security-question.model";
import { getRolePermissionMapByRoleId } from "@/models/settings/role-permission.model";
import { clearAuthSession, getAuthSession, setAuthSession } from "@/lib/auth-session";
import { ROUTES } from "@/routes/index";

export type HttpResult<T extends object> = { status: number; body: T };

async function verifySecret(input: string, storedHash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(input, storedHash);
  } catch {
    return false;
  }
}

export const authController = {
  async login(input: {
    email?: string;
    password?: string;
  }): Promise<HttpResult<{ ok: boolean; message?: string; nextRoute?: string }>> {
    const email = input.email?.trim() || "";
    const password = input.password || "";
    if (!email || !password) {
      return {
        status: 400,
        body: { ok: false, message: "Email and password are required." },
      };
    }

    const user = await getUserByEmail(email);
    if (!user || !user.password || user.status !== 1) {
      return {
        status: 401,
        body: { ok: false, message: "Invalid email or password." },
      };
    }

    const isMatchedPassword = await verifySecret(password, user.password)
    if (isMatchedPassword === false) {
      return {
        status: 401,
        body: { ok: false, message: "Invalid email or password." },
      };
    }

    const freshUser = await getUserById(user.id);
    const permissions = user.role_id ? await getRolePermissionMapByRoleId(user.role_id) : {};

    const userSecurityRows = await getUserSecurityByUserId(user.id);
    if (userSecurityRows.length === 0) {
      await setAuthSession({
        userId: user.id,
        email: user.email,
        firstName: user.fname || "",
        lastName: user.lname || "",
        photo: freshUser?.photo ?? null,
        roleId: user.role_id,
        permissions,
        securityVerified: true,
        questionId: null,
        question: null,
      });
      return { status: 200, body: { ok: true, nextRoute: ROUTES.DASHBOARD } };
    }

    const index = Math.floor(Math.random() * userSecurityRows.length);
    const chosen = userSecurityRows[index];
    const question =
      chosen.question_id != null
        ? await getSecurityQuestionById(chosen.question_id)
        : null;

    await setAuthSession({
      userId: user.id,
      email: user.email,
      firstName: user.fname || "",
      lastName: user.lname || "",
      photo: freshUser?.photo ?? null,
      roleId: user.role_id,
      permissions,
      securityVerified: false,
      questionId: chosen.question_id ?? null,
      question: question?.question ?? "Security verification question",
    });

    return { status: 200, body: { ok: true, nextRoute: ROUTES.SECURITY } };
  },

  async verifySecurity(input: {
    answer?: string;
  }): Promise<HttpResult<{ ok: boolean; message?: string; nextRoute?: string }>> {
    const session = await getAuthSession();
    if (!session) {
      return { status: 401, body: { ok: false, message: "Not authenticated." } };
    }

    if (session.securityVerified) {
      return { status: 200, body: { ok: true, nextRoute: ROUTES.DASHBOARD } };
    }

    if (!session.questionId) {
      await clearAuthSession();
      return {
        status: 401,
        body: { ok: false, message: "Security challenge is missing." },
      };
    }

    const answer = input.answer?.trim() || "";
    if (!answer) {
      return { status: 400, body: { ok: false, message: "Answer is required." } };
    }

    const challenge = await getUserSecurityByUserAndQuestion(
      session.userId,
      session.questionId,
    );
    if (!challenge?.answer || !(await verifySecret(answer, challenge.answer))) {
      await clearAuthSession();
      return {
        status: 401,
        body: { ok: false, message: "Incorrect security answer." },
      };
    }

    await setAuthSession({
      ...session,
      securityVerified: true,
      questionId: null,
      question: null,
    });

    return { status: 200, body: { ok: true, nextRoute: ROUTES.DASHBOARD } };
  },

  async getSession(): Promise<
    HttpResult<{
      authenticated: boolean;
      securityVerified: boolean;
      user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        photo: string | null;
        roleId: number | null;
      } | null;
      question: string | null;
    }>
  > {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 200,
        body: {
          authenticated: false,
          securityVerified: false,
          user: null,
          question: null,
        },
      };
    }

    const freshUser = await getUserById(session.userId);
    const firstName = freshUser?.fname || session.firstName;
    const lastName = freshUser?.lname || session.lastName;
    const email = freshUser?.email || session.email;
    const photo = freshUser?.photo ?? session.photo ?? null;
    const roleId = freshUser?.role_id ?? session.roleId;

    return {
      status: 200,
      body: {
        authenticated: true,
        securityVerified: session.securityVerified,
        user: {
          id: String(session.userId),
          firstName,
          lastName,
          email,
          photo,
          roleId,
        },
        question: session.question,
      },
    };
  },

  async logout(): Promise<HttpResult<{ ok: boolean }>> {
    await clearAuthSession();
    return { status: 200, body: { ok: true } };
  },
};
