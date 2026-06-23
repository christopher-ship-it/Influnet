/**
 * Shared social profile parsing, validation, and canonical URL normalization.
 * Loaded before supabase-auth-bridge.js; exposed as window.INFLUNET_SOCIAL.
 */
(function () {
  const PLATFORM_DOMAINS = {
    instagram: ["instagram.com"],
    facebook: ["facebook.com", "fb.com", "m.facebook.com"],
    youtube: ["youtube.com", "youtu.be", "m.youtube.com"],
    linkedin: ["linkedin.com", "www.linkedin.com"],
    tiktok: ["tiktok.com"],
    twitter: ["twitter.com", "x.com"],
  };

  const UX = {
    instagram: { placeholder: "Instagram username", hint: "e.g. yourname" },
    facebook: { placeholder: "Facebook username", hint: "e.g. your.profile" },
    youtube: { placeholder: "YouTube channel", hint: "e.g. @yourchannel" },
    linkedin: { placeholder: "LinkedIn username", hint: "e.g. your-name" },
    tiktok: { placeholder: "TikTok username", hint: "e.g. yourname" },
    twitter: { placeholder: "X / Twitter username", hint: "e.g. yourname" },
  };

  function trim(raw) {
    return String(raw == null ? "" : raw).trim();
  }

  function hostFromUrl(href) {
    try {
      const u = new URL(href);
      return u.hostname.replace(/^www\./i, "").toLowerCase();
    } catch {
      return null;
    }
  }

  function pathPartsFromUrl(href) {
    try {
      const u = new URL(href);
      return u.pathname.split("/").filter(Boolean);
    } catch {
      return [];
    }
  }

  function hostMatchesPlatform(host, platform) {
    if (!host) return false;
    const domains = PLATFORM_DOMAINS[platform] || [];
    return domains.some((d) => host === d || host.endsWith("." + d));
  }

  function detectForeignPlatform(host, platform) {
    if (!host) return null;
    for (const [p, domains] of Object.entries(PLATFORM_DOMAINS)) {
      if (p === platform) continue;
      if (domains.some((d) => host === d || host.endsWith("." + d))) return p;
    }
    return null;
  }

  function asUrlCandidate(input) {
    if (/^https?:\/\//i.test(input)) return input;
    const lower = input.toLowerCase();
    const allDomains = Object.values(PLATFORM_DOMAINS).flat();
    const looksLikeSocialHost =
      lower.includes("youtu.be") || allDomains.some((d) => lower.includes(d));
    if (looksLikeSocialHost) {
      return `https://${input.replace(/^www\./i, "")}`;
    }
    return null;
  }

  function invalid(message) {
    return { status: "invalid", valid: false, url: null, display: "", message };
  }

  function valid(url, display) {
    return { status: "valid", valid: true, url, display };
  }

  function unverified(url, display, message) {
    return {
      status: "unverified",
      valid: true,
      url,
      display,
      message: message || "Unable to verify this profile link.",
    };
  }

  function validateInstagram(input) {
    const candidate = asUrlCandidate(input);
    if (candidate) {
      const host = hostFromUrl(candidate);
      const foreign = detectForeignPlatform(host, "instagram");
      if (foreign) {
        return invalid(
          foreign === "linkedin"
            ? "LinkedIn URLs cannot be used in the Instagram field."
            : `This looks like a ${foreign} link, not Instagram.`
        );
      }
      if (!hostMatchesPlatform(host, "instagram")) {
        return invalid("Enter a valid Instagram profile link or username.");
      }
      const parts = pathPartsFromUrl(candidate);
      const user = parts[0];
      if (!user || ["p", "reel", "reels", "stories", "explore", "accounts", "tv"].includes(user)) {
        return invalid("Enter your Instagram username, not a post or reel link.");
      }
      if (!/^[a-zA-Z0-9._]{1,30}$/.test(user)) {
        return invalid("Invalid Instagram username.");
      }
      return valid(`https://instagram.com/${user}`, user);
    }

    const user = input.replace(/^@+/, "").split("/").pop().replace(/^@+/, "");
    if (!user) return invalid("Enter your Instagram username.");
    if (!/^[a-zA-Z0-9._]{1,30}$/.test(user)) {
      return invalid("Invalid Instagram username (letters, numbers, . and _ only).");
    }
    return valid(`https://instagram.com/${user}`, user);
  }

  function validateFacebook(input) {
    const candidate = asUrlCandidate(input);
    if (candidate) {
      const host = hostFromUrl(candidate);
      const foreign = detectForeignPlatform(host, "facebook");
      if (foreign) {
        return invalid(`This looks like a ${foreign} link, not Facebook.`);
      }
      if (!hostMatchesPlatform(host, "facebook")) {
        return invalid("Enter a valid Facebook profile link or username.");
      }
      const parts = pathPartsFromUrl(candidate);
      const profile = parts[0];
      if (!profile) return invalid("Invalid Facebook profile URL.");
      if (["share", "sharer", "dialog", "login", "watch", "groups"].includes(profile)) {
        return unverified(candidate, profile, "Unable to verify this Facebook link format.");
      }
      if (profile === "profile.php") {
        return unverified(candidate, "profile", "Unable to verify numeric Facebook profile IDs.");
      }
      if (!/^[a-zA-Z0-9.]{2,50}$/.test(profile)) {
        return invalid("Invalid Facebook profile name.");
      }
      return valid(`https://facebook.com/${profile}`, profile);
    }

    const profile = input.replace(/^@+/, "").split("/").pop();
    if (!profile) return invalid("Enter your Facebook username.");
    if (!/^[a-zA-Z0-9.]{2,50}$/.test(profile)) {
      return invalid("Invalid Facebook username.");
    }
    return valid(`https://facebook.com/${profile}`, profile);
  }

  function validateYouTube(input) {
    const candidate = asUrlCandidate(input);
    if (candidate) {
      const host = hostFromUrl(candidate);
      const foreign = detectForeignPlatform(host, "youtube");
      if (foreign) {
        return invalid(`This looks like a ${foreign} link, not YouTube.`);
      }
      if (host && host.includes("youtu.be")) {
        const id = pathPartsFromUrl(candidate)[0];
        if (!id) return invalid("Invalid YouTube link.");
        return unverified(`https://youtu.be/${id}`, id, "Short YouTube links cannot be fully verified.");
      }
      if (!hostMatchesPlatform(host, "youtube")) {
        return invalid("Enter a valid YouTube channel link or handle.");
      }
      const parts = pathPartsFromUrl(candidate);
      if (parts[0] === "channel" && parts[1]) {
        return valid(`https://youtube.com/channel/${parts[1]}`, parts[1]);
      }
      if (parts[0] === "c" && parts[1]) {
        return valid(`https://youtube.com/c/${parts[1]}`, parts[1]);
      }
      const atPart = parts.find((p) => p.startsWith("@"));
      if (atPart) {
        const handle = atPart.startsWith("@") ? atPart : `@${atPart}`;
        return valid(`https://youtube.com/${handle}`, handle);
      }
      if (parts[0] && !["watch", "playlist", "shorts", "feed", "results"].includes(parts[0])) {
        const handle = parts[0].startsWith("@") ? parts[0] : `@${parts[0]}`;
        return valid(`https://youtube.com/${handle}`, handle);
      }
      return invalid("Enter a YouTube channel handle or channel URL.");
    }

    let s = input.replace(/^@+/, "");
    if (!s) return invalid("Enter your YouTube channel.");
    if (/^UC[\w-]{10,}$/i.test(s)) {
      return valid(`https://youtube.com/channel/${s}`, s);
    }
    const handle = s.startsWith("@") ? s : `@${s}`;
    if (!/^@[\w.-]{2,}$/.test(handle)) {
      return invalid("Invalid YouTube channel handle.");
    }
    return valid(`https://youtube.com/${handle}`, handle);
  }

  function validateLinkedIn(input) {
    const candidate = asUrlCandidate(input);
    if (candidate) {
      const host = hostFromUrl(candidate);
      const foreign = detectForeignPlatform(host, "linkedin");
      if (foreign) {
        return invalid(
          foreign === "instagram"
            ? "Instagram URLs cannot be used in the LinkedIn field."
            : `This looks like a ${foreign} link, not LinkedIn.`
        );
      }
      if (!hostMatchesPlatform(host, "linkedin")) {
        return invalid("Enter a valid LinkedIn profile link (linkedin.com/in/username).");
      }
      const parts = pathPartsFromUrl(candidate);
      const inIdx = parts.indexOf("in");
      if (inIdx < 0 || !parts[inIdx + 1]) {
        return invalid("LinkedIn URL must be linkedin.com/in/your-profile");
      }
      const slug = parts[inIdx + 1];
      if (!/^[a-zA-Z0-9-_%]{2,100}$/.test(slug)) {
        return invalid("Invalid LinkedIn username.");
      }
      return valid(`https://linkedin.com/in/${slug}`, slug);
    }

    if (/instagram\.com/i.test(input)) {
      return invalid("Instagram URLs cannot be used in the LinkedIn field.");
    }
    const slug = input.replace(/^@+/, "").split("/").pop();
    if (!slug) return invalid("Enter your LinkedIn username.");
    if (!/^[a-zA-Z0-9-_%]{2,100}$/.test(slug)) {
      return invalid("Invalid LinkedIn username.");
    }
    return valid(`https://linkedin.com/in/${slug}`, slug);
  }

  function validateTikTok(input) {
    const candidate = asUrlCandidate(input);
    if (candidate) {
      const host = hostFromUrl(candidate);
      const foreign = detectForeignPlatform(host, "tiktok");
      if (foreign) return invalid(`This looks like a ${foreign} link, not TikTok.`);
      if (!hostMatchesPlatform(host, "tiktok")) {
        return invalid("Enter a valid TikTok profile link or username.");
      }
      const parts = pathPartsFromUrl(candidate);
      const user = (parts.find((p) => p.startsWith("@")) || parts[0] || "").replace(/^@+/, "");
      if (!user || !/^[\w.]{2,24}$/.test(user)) return invalid("Invalid TikTok username.");
      return valid(`https://tiktok.com/@${user}`, user);
    }
    const user = input.replace(/^@+/, "").split("/").pop();
    if (!user || !/^[\w.]{2,24}$/.test(user)) return invalid("Invalid TikTok username.");
    return valid(`https://tiktok.com/@${user}`, user);
  }

  function validateTwitter(input) {
    const candidate = asUrlCandidate(input);
    if (candidate) {
      const host = hostFromUrl(candidate);
      const foreign = detectForeignPlatform(host, "twitter");
      if (foreign) return invalid(`This looks like a ${foreign} link, not X/Twitter.`);
      if (!hostMatchesPlatform(host, "twitter")) {
        return invalid("Enter a valid X/Twitter profile link or username.");
      }
      const parts = pathPartsFromUrl(candidate);
      const user = (parts[0] || "").replace(/^@+/, "");
      if (!user || !/^[a-zA-Z0-9_]{1,15}$/.test(user)) return invalid("Invalid X/Twitter username.");
      return valid(`https://x.com/${user}`, user);
    }
    const user = input.replace(/^@+/, "").split("/").pop();
    if (!user || !/^[a-zA-Z0-9_]{1,15}$/.test(user)) return invalid("Invalid X/Twitter username.");
    return valid(`https://x.com/${user}`, user);
  }

  const VALIDATORS = {
    instagram: validateInstagram,
    facebook: validateFacebook,
    youtube: validateYouTube,
    linkedin: validateLinkedIn,
    tiktok: validateTikTok,
    twitter: validateTwitter,
  };

  function validateSocialProfile(platform, raw) {
    const input = trim(raw);
    if (!input) {
      return { status: "empty", valid: true, url: null, display: "", message: "" };
    }
    const fn = VALIDATORS[platform];
    if (!fn) {
      return invalid("Unsupported platform.");
    }
    return fn(input);
  }

  function normalizeForStorage(platform, raw) {
    if (raw == null) return undefined;
    const input = trim(raw);
    if (!input) return null;
    const result = validateSocialProfile(platform, input);
    if (!result.valid || !result.url) return null;
    return result.url;
  }

  function displayFromStored(platform, stored) {
    const s = trim(stored);
    if (!s) return "";
    if (!/^https?:\/\//i.test(s)) {
      return s.replace(/^@+/, "");
    }
    const result = validateSocialProfile(platform, s);
    if (result.display) return result.display;
    return s;
  }

  function statusLabel(status) {
    if (status === "valid") return "✓ Valid Profile Link";
    if (status === "invalid") return "❌ Invalid Profile Link";
    if (status === "unverified") return "⚠ Unable to Verify";
    return "";
  }

  window.INFLUNET_SOCIAL = {
    validate: validateSocialProfile,
    normalizeForStorage,
    displayFromStored,
    statusLabel,
    UX,
    PLATFORMS: Object.keys(VALIDATORS),
  };
})();
