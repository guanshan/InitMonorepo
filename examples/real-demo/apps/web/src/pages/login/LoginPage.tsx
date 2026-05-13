import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import type { DevAccount } from "@real-demo/shared";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";

import {
  fetchCurrentUser,
  fetchDevAccounts,
  fetchSignInCaptcha,
  signIn,
} from "../../shared/api/auth";
import { useAuthStore } from "../../shared/store/auth-store";

import styles from "./LoginPage.module.css";

const DEV_ACCOUNT_LABEL_KEYS: Record<DevAccount["role"], string> = {
  SUPER_ADMIN: "login.devAccounts.superAdmin",
  ADMIN: "login.devAccounts.admin",
  USER: "login.devAccounts.user",
};

const normalizeRedirect = (raw: string | null): string => {
  const value = raw?.trim() ?? "";
  if (!value) return "/";
  // Same-site relative paths only — blocks open redirects via `//evil.com`.
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
};

export const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const setUser = useAuthStore((s) => s.setUser);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devAccounts, setDevAccounts] = useState<DevAccount[]>([]);
  const [captchaId, setCaptchaId] = useState("");
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const captchaImageSrc = useMemo(() => {
    if (!captchaSvg) return "";
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(captchaSvg)}`;
  }, [captchaSvg]);

  const redirectAfterLogin = normalizeRedirect(searchParams.get("redirect"));

  const refreshCaptcha = useCallback(async (signal?: AbortSignal) => {
    setCaptchaLoading(true);
    try {
      const challenge = await fetchSignInCaptcha({ signal });
      if (signal?.aborted) return;
      setCaptchaId(challenge.captchaId);
      setCaptchaSvg(challenge.svg);
      setCaptchaAnswer("");
    } catch {
      if (signal?.aborted) return;
      setCaptchaId("");
      setCaptchaSvg("");
    } finally {
      if (!signal?.aborted) {
        setCaptchaLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectAfterLogin, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectAfterLogin]);

  useEffect(() => {
    const controller = new AbortController();
    if (import.meta.env.DEV) {
      void fetchDevAccounts({ signal: controller.signal }).then((accounts) => {
        if (controller.signal.aborted) return;
        setDevAccounts(accounts);
      });
    }
    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refreshCaptcha(controller.signal);
    return () => {
      controller.abort();
    };
  }, [refreshCaptcha]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError("");
      setLoading(true);

      try {
        await signIn({ email, password, captchaId, captchaAnswer });
        try {
          const user = await fetchCurrentUser();
          if (user) {
            setUser(user);
            navigate(redirectAfterLogin, { replace: true });
          } else {
            setError(t("login.error.generic"));
          }
        } catch {
          setError(t("login.error.userLoadFailed"));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("login.error.generic"));
        // Captcha is one-shot: refresh regardless of outcome so a new
        // attempt can't replay the previous challenge.
        void refreshCaptcha();
      } finally {
        setLoading(false);
      }
    },
    [
      email,
      password,
      captchaId,
      captchaAnswer,
      navigate,
      redirectAfterLogin,
      refreshCaptcha,
      setUser,
      t,
    ],
  );

  const handleDevLogin = useCallback(
    async (devEmail: string, devPassword: string) => {
      setError("");
      setLoading(true);
      try {
        await signIn({
          email: devEmail,
          password: devPassword,
          captchaId: "__dev_bypass__",
          captchaAnswer: "bypass",
        });
        const user = await fetchCurrentUser();
        if (user) {
          setUser(user);
          navigate(redirectAfterLogin, { replace: true });
        } else {
          setError(t("login.error.generic"));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("login.error.generic"));
        void refreshCaptcha();
      } finally {
        setLoading(false);
      }
    },
    [navigate, redirectAfterLogin, refreshCaptcha, setUser, t],
  );

  return (
    <div className={styles.page}>
      <aside className={styles.hero} aria-hidden="true">
        <div className={styles.heroBackdrop}>
          <div className={styles.heroOrbOne} />
          <div className={styles.heroOrbTwo} />
        </div>
        <div className={styles.heroContent}>
          <div className={styles.heroBrand}>
            <span className={styles.heroLogo} aria-hidden="true">
              <img
                src={`${import.meta.env.BASE_URL}favicon.svg`}
                alt=""
                width={32}
                height={32}
              />
            </span>
            <span className={styles.heroBrandName}>{t("app.title", { appName: "Real Demo" })}</span>
          </div>
          <div className={styles.heroCopy}>
            <p className={styles.heroKicker}>{t("login.hero.kicker")}</p>
            <h2 className={styles.heroTitle}>{t("login.hero.title")}</h2>
            <p className={styles.heroSubtitle}>{t("login.hero.subtitle")}</p>
          </div>
        </div>
      </aside>

      <section className={styles.formSide}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>{t("login.title")}</h1>
            <p className={styles.subtitle}>{t("login.subtitle")}</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-email">
                {t("login.email.label")}
              </label>
              <input
                id="login-email"
                className={styles.input}
                type="email"
                autoComplete="email"
                required
                placeholder={t("login.email.placeholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-password">
                {t("login.password.label")}
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  id="login-password"
                  className={styles.input}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder={t("login.password.placeholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword
                      ? t("login.password.hide")
                      : t("login.password.show")
                  }
                >
                  {showPassword ? t("login.password.hide") : t("login.password.show")}
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-captcha">
                {t("login.captcha.label")}
              </label>
              <div className={styles.captchaRow}>
                <input
                  id="login-captcha"
                  className={styles.input}
                  type="text"
                  autoComplete="off"
                  inputMode="text"
                  required
                  placeholder={t("login.captcha.placeholder")}
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className={styles.captchaImage}
                  onClick={() => {
                    void refreshCaptcha();
                  }}
                  aria-label={t("login.captcha.refresh")}
                  disabled={captchaLoading}
                  title={t("login.captcha.refresh")}
                >
                  {captchaImageSrc ? (
                    <img
                      aria-hidden="true"
                      alt=""
                      className={styles.captchaGraphic}
                      draggable={false}
                      src={captchaImageSrc}
                    />
                  ) : (
                    <span className={styles.captchaPlaceholder}>
                      {t("login.captcha.refresh")}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <button
              className={styles.submitButton}
              type="submit"
              disabled={loading || !captchaId}
            >
              {loading ? t("login.submitting") : t("login.submit")}
            </button>
          </form>

          {devAccounts.length > 0 && (
            <>
              <div className={styles.divider}>
                <span>{t("login.devAccounts.title")}</span>
              </div>
              <div className={styles.devAccounts}>
                {devAccounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    className={styles.devAccountButton}
                    onClick={() => handleDevLogin(account.email, account.password)}
                    disabled={loading}
                  >
                    <span className={styles.devAccountLabel}>
                      {t(DEV_ACCOUNT_LABEL_KEYS[account.role] ?? account.role)}
                    </span>
                    <span className={styles.devAccountEmail}>{account.email}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <p className={styles.footer}>{t("login.footer")}</p>
        </div>
      </section>
    </div>
  );
};
