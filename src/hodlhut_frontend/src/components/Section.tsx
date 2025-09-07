import React from "react";

export function Section({
  children,
  className,
  tight,
  loose,
  container = true,
}: {
  children: React.ReactNode;
  className?: string;
  tight?: boolean;
  loose?: boolean;
  container?: boolean;
}) {
  const pad = loose ? "section-loose" : tight ? "section-tight" : "section";
  const classes = [pad, className].filter(Boolean).join(" ");
  
  return (
    <section className={classes}> 
      {container ? <div className="container-app">{children}</div> : children}
    </section>
  );
}