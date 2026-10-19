
(() => {
  const measurementId = "G-Q5W00LDHZD";
  const storageKey = "precocerto_analytics_consent";
  let analyticsLoaded = false;
  let consentOverride;

  function getConsent() {
    if (consentOverride !== undefined) return consentOverride;
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  }

  function setConsent(value) {
    consentOverride = value;
    try {
      localStorage.setItem(storageKey, value);
      consentOverride = undefined;
    } catch {
      return false;
    }
    return true;
  }

  function startAnalytics() {
    window["ga-disable-" + measurementId] = false;
    if (analyticsLoaded) return;

    analyticsLoaded = true;
    window.dataLayer = window.dataLayer || [];

    window.gtag = function () {
      if (getConsent() === "accepted") window.dataLayer.push(arguments);
    };

    window.gtag("js", new Date());
    window.gtag("config", measurementId);

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + measurementId;

    document.head.appendChild(script);
  }

  function initialize() {
    const style = document.createElement("style");

    style.textContent = `
      #pc-consent-panel {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: calc(100% - 32px);
        max-width: 520px;
        padding: 22px;
        background: #ffffff;
        color: #172033;
        border: 1px solid #dbe1e8;
        border-radius: 14px;
        box-shadow: 0 8px 32px rgba(0,0,0,.18);
        z-index: 99999;
        font-family: Arial, sans-serif;
        box-sizing: border-box;
      }

      #pc-consent-panel h2 {
        font-size: 18px;
        margin: 0 0 10px;
        color: #172033;
      }

      #pc-consent-panel p {
        font-size: 14px;
        line-height: 1.6;
        margin: 0 0 15px;
        color: #394456;
      }

      #pc-consent-panel a {
        color: #155db8;
        text-decoration: underline;
      }

      .pc-consent-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .pc-consent-actions button {
        flex: 1;
        min-width: 130px;
        padding: 12px 15px;
        border-radius: 8px;
        border: 1px solid #1e3a5f;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
      }

      #pc-consent-accept {
        background: #1e3a5f;
        color: #ffffff;
      }

      #pc-consent-reject {
        background: #ffffff;
        color: #1e3a5f;
      }

      #pc-consent-settings {
        position: fixed;
        bottom: 12px;
        left: 12px;
        padding: 8px 12px;
        background: #ffffff;
        color: #172033;
        border: 1px solid #c9d1da;
        border-radius: 8px;
        font-size: 12px;
        font-family: Arial, sans-serif;
        box-shadow: 0 2px 10px rgba(0,0,0,.1);
        cursor: pointer;
        z-index: 99998;
      }
    `;

    document.head.appendChild(style);

    const panel = document.createElement("section");
    panel.id = "pc-consent-panel";
    panel.setAttribute("aria-label", "Preferências de privacidade");

    panel.innerHTML = `
      <h2>Privacidade e análise de visitas</h2>
      <p>
        Utilizamos o Google Analytics para entender como nosso site é
        utilizado e melhorar nossas ferramentas. Com sua autorização,
        podemos usar cookies de análise. Você pode recusar ou alterar
        sua escolha quando quiser.
        Consulte nossa <a href="privacidade.html">Política de Privacidade</a>.
      </p>
      <div class="pc-consent-actions">
        <button type="button" id="pc-consent-reject">Recusar</button>
        <button type="button" id="pc-consent-accept">Aceitar análise</button>
      </div>
    `;

    const settings = document.createElement("button");
    settings.type = "button";
    settings.id = "pc-consent-settings";
    settings.textContent = "Privacidade";

    document.body.appendChild(panel);
    document.body.appendChild(settings);

    function updateVisibility() {
      const consent = getConsent();

      panel.hidden = consent === "accepted" || consent === "rejected";
      settings.hidden = !panel.hidden;

      panel.style.display = panel.hidden ? "none" : "block";
      settings.style.display = settings.hidden ? "none" : "block";
    }

    panel.querySelector("#pc-consent-accept").addEventListener("click", () => {
      setConsent("accepted");
      startAnalytics();
      updateVisibility();
    });

    panel.querySelector("#pc-consent-reject").addEventListener("click", () => {
      const saved = setConsent("rejected");

      if (analyticsLoaded) {
        window["ga-disable-" + measurementId] = true;
        if (saved) {
          window.location.reload();
          return;
        }
      }

      updateVisibility();
    });

    settings.addEventListener("click", () => {
      panel.hidden = false;
      panel.style.display = "block";
      settings.hidden = true;
      settings.style.display = "none";
    });

    window.addEventListener("storage", (event) => {
      if (event.key !== storageKey && event.key !== null) return;
      consentOverride = undefined;

      if (getConsent() === "accepted") {
        startAnalytics();
      } else if (analyticsLoaded) {
        window["ga-disable-" + measurementId] = true;
        window.location.reload();
        return;
      }

      updateVisibility();
    });

    if (getConsent() === "accepted") {
      startAnalytics();
    }

    updateVisibility();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
