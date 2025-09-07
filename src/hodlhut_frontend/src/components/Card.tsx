import React from "react";
import { Text } from "./Text";

export function Card({
  title,
  action,
  children,
  className,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const classes = ["card", "stack-md", className].filter(Boolean).join(" ");
  
  return (
    <div className={classes}> 
      {(title || action) && (
        <div className="card-header">
          {typeof title === "string" ? <Text variant="h4">{title}</Text> : title}
          {action}
        </div>
      )}
      <div className="card-body stack-sm">{children}</div>
    </div>
  );
}