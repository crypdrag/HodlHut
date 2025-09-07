import React from "react";

export function CardGrid({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  const classes = ["grid-cards", className].filter(Boolean).join(" ");
  return <div className={classes}>{children}</div>;
}

export function FormGrid({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  const classes = ["grid-form", className].filter(Boolean).join(" ");
  return <div className={classes}>{children}</div>;
}

export function SidebarLayout({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  const classes = ["layout-sidebar", className].filter(Boolean).join(" ");
  return <div className={classes}>{children}</div>;
}