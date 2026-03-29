import { useState } from "react";

type TopCellLogoProps = {
  className?: string;
  imageClassName?: string;
  labelClassName?: string;
  subtitleClassName?: string;
  showLabel?: boolean;
  labelText?: string;
};

export default function TopCellLogo({
  className = "",
  imageClassName = "h-10 w-10 rounded-xl",
  labelClassName = "",
  subtitleClassName = "text-muted-foreground",
  showLabel = true,
  labelText = "TopCell",
}: TopCellLogoProps) {
  const [logoSrc, setLogoSrc] = useState("/topcell-logo.jpg");
  const [failed, setFailed] = useState(false);

  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      {!failed ? (
        <img
          src={logoSrc}
          alt="Logo TopCell"
          className={`${imageClassName} object-cover border border-primary/30 bg-slate-950/60 shadow-[0_0_30px_-12px_hsl(211_98%_59%/0.7)]`}
          onError={() => {
            if (logoSrc === "/topcell-logo.jpg") {
              setLogoSrc("/topcell-logo.png");
              return;
            }
            if (logoSrc !== "/favicon.ico") {
              setLogoSrc("/favicon.ico");
              return;
            }
            setFailed(true);
          }}
        />
      ) : (
        <span className={`${imageClassName} topcell-brand-gradient inline-flex items-center justify-center font-bold text-primary-foreground`}>
          TC
        </span>
      )}

      {showLabel ? (
        <div className={`leading-tight ${labelClassName}`.trim()}>
          <p className="text-lg font-bold tracking-wide">{labelText}</p>
          <p className={`text-xs ${subtitleClassName}`.trim()}>Assistência técnica e loja mobile</p>
        </div>
      ) : null}
    </div>
  );
}

