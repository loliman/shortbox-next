import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { RateLimiterMemory, type RateLimiterRes } from "rate-limiter-flexible";
import { readUserByName } from "../lib/read/user-read";
import { clearUserSession, updateUserLoginSession } from "../lib/server/user-write";

type LoginInput = {
  name?: string | null;
  password?: string | null;
};

type PasswordVerificationResult = {
  valid: boolean;
  upgradePassword?: string;
};

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export class LoginRateLimitError extends Error {
  public readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Zu viele Login-Versuche");
    this.name = "LoginRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class UserService {
  private static readonly HASH_PREFIX = "scrypt";
  private static readonly LOGIN_RATE_LIMIT_MAX_ATTEMPTS = parsePositiveInt(
    process.env.LOGIN_MAX_ATTEMPTS,
    8
  );
  private static readonly LOGIN_RATE_LIMIT_WINDOW_SECONDS = parsePositiveInt(
    process.env.LOGIN_WINDOW_SECONDS,
    900
  );
  private static readonly LOGIN_RATE_LIMIT_LOCK_SECONDS = parsePositiveInt(
    process.env.LOGIN_LOCK_SECONDS,
    900
  );
  private static readonly loginRateLimiter = new RateLimiterMemory({
    keyPrefix: "login",
    points: UserService.LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    duration: UserService.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
    blockDuration: UserService.LOGIN_RATE_LIMIT_LOCK_SECONDS,
  });

  constructor(private requestId?: string) {
    void this.requestId;
  }

  private isSha256Hex(value: string): boolean {
    return /^[a-f0-9]{64}$/i.test(value);
  }

  private safeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    if (leftBuffer.length !== rightBuffer.length) return false;
    return timingSafeEqual(leftBuffer, rightBuffer);
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString("base64url");
    const hash = scryptSync(password, salt, 64).toString("base64url");
    return `${UserService.HASH_PREFIX}$${salt}$${hash}`;
  }

  private verifyPassword(inputPassword: string, storedPassword: string): PasswordVerificationResult {
    if (storedPassword.startsWith(`${UserService.HASH_PREFIX}$`)) {
      const [, salt, expectedHash] = storedPassword.split("$");
      if (!salt || !expectedHash) return { valid: false };

      const calculatedHash = scryptSync(inputPassword, salt, 64).toString("base64url");
      return {
        valid: this.safeEqual(expectedHash, calculatedHash),
      };
    }

    if (this.safeEqual(storedPassword, inputPassword)) {
      const legacyClientSentHash =
        this.isSha256Hex(storedPassword) && this.isSha256Hex(inputPassword);
      return {
        valid: true,
        upgradePassword: legacyClientSentHash ? undefined : inputPassword,
      };
    }

    return { valid: false };
  }

  private buildLoginRateLimitKey(name: string, requestIp?: string): string {
    const normalizedName = name.trim().toLowerCase() || "unknown";
    const normalizedIp = (requestIp || "").trim() || "unknown";
    return `${normalizedName}|${normalizedIp}`;
  }

  private toRetryAfterSeconds(msBeforeNext: number | undefined): number {
    if (!msBeforeNext || msBeforeNext <= 0) return 1;
    return Math.max(1, Math.ceil(msBeforeNext / 1000));
  }

  private asRateLimiterRes(error: unknown): RateLimiterRes | null {
    if (!error || typeof error !== "object") return null;
    if (!("msBeforeNext" in error) || !("remainingPoints" in error)) return null;
    return error as RateLimiterRes;
  }

  private async clearLoginRateLimit(key: string) {
    await UserService.loginRateLimiter.delete(key);
  }

  private async ensureLoginRateLimitNotExceeded(key: string) {
    const state = await UserService.loginRateLimiter.get(key);
    if (!state) return;

    if (state.remainingPoints <= 0 && state.msBeforeNext > 0) {
      throw new LoginRateLimitError(this.toRetryAfterSeconds(state.msBeforeNext));
    }
  }

  private async registerLoginFailure(key: string) {
    try {
      await UserService.loginRateLimiter.consume(key, 1);
    } catch (error) {
      const state = this.asRateLimiterRes(error);
      if (state) {
        throw new LoginRateLimitError(this.toRetryAfterSeconds(state.msBeforeNext));
      }
      throw error;
    }
  }

  async login(user: LoginInput, requestIp?: string) {
    const name = (user.name || "").trim();
    const loginRateLimitKey = this.buildLoginRateLimitKey(name, requestIp);

    await this.ensureLoginRateLimitNotExceeded(loginRateLimitKey);

    const userRecord = await readUserByName(name);

    if (!userRecord || !userRecord.password) {
      await this.registerLoginFailure(loginRateLimitKey);
      return null;
    }

    const passwordVerification = this.verifyPassword(user.password || "", userRecord.password);
    if (!passwordVerification.valid) {
      await this.registerLoginFailure(loginRateLimitKey);
      return null;
    }

    await this.clearLoginRateLimit(loginRateLimitKey);

    const nextSessionId = randomBytes(18).toString("hex");
    const data: {
      sessionId: string;
      updatedAt: Date;
      password?: string;
    } = {
      sessionId: nextSessionId,
      updatedAt: new Date(),
    };

    if (
      !userRecord.password.startsWith(`${UserService.HASH_PREFIX}$`) &&
      passwordVerification.upgradePassword
    ) {
      data.password = this.hashPassword(passwordVerification.upgradePassword);
    }

    const updatedUser = await updateUserLoginSession({
      userId: userRecord.id,
      sessionId: data.sessionId,
      updatedAt: data.updatedAt,
      password: data.password,
    });

    return updatedUser;
  }

  async logout(userId: number | bigint | string) {
    await clearUserSession(userId);

    return true;
  }
}
