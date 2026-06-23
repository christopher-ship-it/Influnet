import { useCallback, useEffect, useMemo, useState } from "react";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

const USERNAME_RE = /^[a-z0-9][a-z0-9._]{2,29}$/;

function useDebouncedUsernameCheck(username: string, delayMs = 500) {
  const [status, setStatus] = useState<UsernameStatus>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const normalized = username.trim().toLowerCase().replace(/\s+/g, "");
    if (!normalized) {
      setStatus("idle");
      setMessage("");
      return;
    }
    if (!USERNAME_RE.test(normalized)) {
      setStatus("invalid");
      setMessage("Use 3–30 characters: lowercase letters, numbers, dots, underscores.");
      return;
    }

    setStatus("checking");
    setMessage("Checking availability…");
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/influencer-profile/username/check?username=${encodeURIComponent(normalized)}`,
          { credentials: "same-origin" }
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (data.available) {
          setStatus("available");
          setMessage("✓ This Influnet name is available");
        } else {
          setStatus("taken");
          setMessage("✕ Name already taken. Try another");
        }
      } catch {
        if (!cancelled) {
          setStatus("taken");
          setMessage("Could not check availability. Try again.");
        }
      }
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [username, delayMs]);

  return { status, message };
}

export type InfluencerSignupStep1Props = {
  onBack?: () => void;
  onSubmit?: (payload: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    username: string;
    password: string;
  }) => void | Promise<void>;
};

export function InfluencerSignupStep1({ onBack, onSubmit }: InfluencerSignupStep1Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { status: usernameStatus, message: usernameMessage } =
    useDebouncedUsernameCheck(username);

  const canProceed = useMemo(() => usernameStatus === "available", [usernameStatus]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canProceed || submitting) return;
      setSubmitting(true);
      try {
        await onSubmit?.({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          username: username.trim().toLowerCase(),
          password,
        });
      } finally {
        setSubmitting(false);
      }
    },
    [canProceed, submitting, onSubmit, firstName, lastName, email, phone, username, password]
  );

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 md:p-6">
      <nav className="flex items-center gap-2 mb-5 text-[0.62rem] font-extrabold tracking-widest uppercase">
        <span className="text-[#ee3e96]">Account</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-500">Profile</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-500">Social</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-500">Collab</span>
      </nav>

      <div className="w-full max-w-xl bg-[#0d1117] rounded-2xl border border-slate-900 p-6 md:p-8 shadow-2xl space-y-6">
        <header>
          <h1 className="text-white text-2xl font-bold tracking-tight">
            Create your Influencer Account
          </h1>
          <p className="text-slate-400 text-sm mt-1">Start your journey on Influnet</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.65rem] font-bold tracking-wider uppercase text-slate-200">
                First name
              </span>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="rounded-lg border border-slate-700/40 bg-slate-900/60 text-white px-3 py-2.5 text-sm focus:border-[#ee3e96] focus:ring-1 focus:ring-[#ee3e96] outline-none"
                required
                autoComplete="given-name"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.65rem] font-bold tracking-wider uppercase text-slate-200">
                Last name
              </span>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="rounded-lg border border-slate-700/40 bg-slate-900/60 text-white px-3 py-2.5 text-sm focus:border-[#ee3e96] focus:ring-1 focus:ring-[#ee3e96] outline-none"
                required
                autoComplete="family-name"
              />
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[0.65rem] font-bold tracking-wider uppercase text-slate-200">
              Choose your Influnet name
            </span>
            <div className="flex rounded-lg border border-slate-700/40 bg-slate-900/60 overflow-hidden focus-within:border-[#ee3e96] focus-within:ring-1 focus-within:ring-[#ee3e96]">
              <span className="inline-flex items-center px-3 text-sm text-slate-400 bg-slate-950/60 border-r border-slate-700/30 shrink-0">
                influnet.com/
              </span>
              <input
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))
                }
                className="flex-1 bg-transparent text-white px-3 py-2.5 text-sm outline-none min-w-0"
                required
                autoComplete="username"
                placeholder="priya.creates"
              />
            </div>
            {usernameMessage ? (
              <p
                className={`text-xs font-medium ${
                  usernameStatus === "checking"
                    ? "text-slate-400"
                    : usernameStatus === "available"
                      ? "text-emerald-500"
                      : "text-rose-500"
                }`}
              >
                {usernameMessage}
              </p>
            ) : null}
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[0.65rem] font-bold tracking-wider uppercase text-slate-200">
              Email address
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-lg border border-slate-700/40 bg-slate-900/60 text-white px-3 py-2.5 text-sm focus:border-[#ee3e96] focus:ring-1 focus:ring-[#ee3e96] outline-none"
              required
              autoComplete="email"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[0.65rem] font-bold tracking-wider uppercase text-slate-200">
              Phone number
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="rounded-lg border border-slate-700/40 bg-slate-900/60 text-white px-3 py-2.5 text-sm focus:border-[#ee3e96] focus:ring-1 focus:ring-[#ee3e96] outline-none"
              required
              autoComplete="tel"
            />
          </label>

          <label className="flex flex-col gap-1.5 relative">
            <span className="text-[0.65rem] font-bold tracking-wider uppercase text-slate-200">
              Password
            </span>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              minLength={6}
              className="rounded-lg border border-slate-700/40 bg-slate-900/60 text-white px-3 py-2.5 pr-10 text-sm focus:border-[#ee3e96] focus:ring-1 focus:ring-[#ee3e96] outline-none"
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 bottom-2.5 text-slate-500 hover:text-slate-300 p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "🙈" : "👁"}
            </button>
          </label>

          <p className="text-xs text-slate-500 flex items-center gap-2">
            🔒 Your data is encrypted and never shared without consent.
          </p>

          <div className="flex gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 rounded-lg border border-slate-700 text-slate-300 py-3 text-sm font-semibold hover:border-slate-500 transition-colors"
            >
              &lt; Back
            </button>
            <button
              type="submit"
              disabled={!canProceed || submitting || usernameStatus === "checking"}
              className="flex-[1.35] rounded-lg bg-[#ee3e96] text-white py-3 text-sm font-bold hover:bg-[#d63384] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-pink-500/30"
            >
              Next Step &gt;
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InfluencerSignupStep1;
