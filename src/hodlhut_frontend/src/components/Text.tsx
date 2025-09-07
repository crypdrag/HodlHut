import React from "react";

export type TextVariant =
  | "h1" | "h2" | "h3" | "h4"
  | "bodyLg" | "body" | "bodySm"
  | "caption" | "overline"
  | "uiLabel" | "button" | "badge"
  | "stat" | "code";

const typeClass: Record<TextVariant, string> = {
  h1: "heading-1",
  h2: "heading-2",
  h3: "heading-3",
  h4: "heading-4",
  bodyLg: "body-lg",
  body: "body-md",
  bodySm: "body-sm",
  caption: "caption",
  overline: "overline",
  uiLabel: "ui-label",
  button: "btn-text",
  badge: "badge-text",
  stat: "stat-num",
  code: "code",
};

const defaultTag: Record<TextVariant, keyof JSX.IntrinsicElements> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  bodyLg: "p",
  body: "p",
  bodySm: "p",
  caption: "span",
  overline: "span",
  uiLabel: "span",
  button: "span",
  badge: "span",
  stat: "span",
  code: "code",
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type TextProps<T extends keyof JSX.IntrinsicElements = any> = {
  as?: T;
  variant: TextVariant;
  className?: string;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "className">;

export function Text<T extends keyof JSX.IntrinsicElements = keyof JSX.IntrinsicElements>({
  as,
  variant,
  className,
  ...props
}: TextProps<T>) {
  const Tag = (as ?? defaultTag[variant]) as any;
  return <Tag className={cn(typeClass[variant], className)} {...props} />;
}

export { typeClass };