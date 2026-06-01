/**
 * Base URL for the Influnet React app (built from influnet.io into /app/).
 * Same host as index.html — no separate port unless you opt in (see below).
 */
(function (global) {
  function getInflunetAppBase() {
    var meta = document.querySelector('meta[name="influnet-app-base"]');
    if (meta && meta.content) {
      return meta.content.replace(/\/$/, "");
    }

    /* Optional: Vite dev server on :5000 — add to index.html:
       <meta name="influnet-app-dev" content="http://localhost:5000/app"> */
    var devMeta = document.querySelector('meta[name="influnet-app-dev"]');
    if (devMeta && devMeta.content) {
      return devMeta.content.replace(/\/$/, "");
    }

    var host = location.hostname;
    var port = location.port;

    if (location.protocol === "file:") {
      return "./app";
    }

    if (host === "localhost" || host === "127.0.0.1") {
      return "/app";
    }

    return "/app";
  }

  function influnetAppUrl(path) {
    var base = getInflunetAppBase();
    var p = path.charAt(0) === "/" ? path : "/" + path;
    if (base.indexOf("http") === 0) {
      return base + p;
    }
    if (base.indexOf("./") === 0) {
      return base + p;
    }
    return base + p;
  }

  global.getInflunetAppBase = getInflunetAppBase;
  global.influnetAppUrl = influnetAppUrl;
})(typeof window !== "undefined" ? window : globalThis);
