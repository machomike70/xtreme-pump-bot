import { useState, useEffect } from "react";

interface Ad {
  id: string;
  label: string;
  headline: string;
  cta: string;
  url: string;
  accent?: string;
}

const ADS: Ad[] = [
  {
    id: "goml",
    label: "POWERED BY",
    headline: "GET OFF MY LAWN RADIO",
    cta: "🎙️ LISTEN LIVE →",
    url: "https://gomlradio.replit.app",
    accent: "#39FF14",
  },
  {
    id: "xrp",
    label: "ECOSYSTEM",
    headline: "XTREME RIPPLE PROTOCOL",
    cta: "🔗 JOIN THE NETWORK →",
    url: "https://t.me/Goml_Network",
    accent: "#00CFFF",
  },
  {
    id: "alpha",
    label: "ADVERTISE HERE",
    headline: "REACH 1000s OF PUMP.FUN TRADERS",
    cta: "📩 CONTACT US →",
    url: "https://t.me/XtremePumpAlpha",
    accent: "#FFD700",
  },
];

export function AdBanner({ slot }: { slot: number }) {
  const ad = ADS[slot % ADS.length];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <a
      href={ad.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mx-2 my-1 rounded transition-opacity"
      style={{
        opacity: visible ? 1 : 0,
        background: "rgba(0,0,0,0.6)",
        border: `1px solid ${ad.accent ?? "#39FF14"}22`,
        boxShadow: `0 0 12px ${ad.accent ?? "#39FF14"}11`,
        textDecoration: "none",
      }}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex flex-col gap-0.5">
          <span
            className="text-[8px] font-black tracking-[0.3em]"
            style={{ color: ad.accent ?? "#39FF14", opacity: 0.7 }}
          >
            {ad.label}
          </span>
          <span
            className="text-[11px] font-black tracking-wider"
            style={{ color: "#c8f0c8" }}
          >
            {ad.headline}
          </span>
        </div>
        <span
          className="text-[10px] font-black tracking-widest flex-shrink-0 ml-2"
          style={{ color: ad.accent ?? "#39FF14" }}
        >
          {ad.cta}
        </span>
      </div>
    </a>
  );
}
