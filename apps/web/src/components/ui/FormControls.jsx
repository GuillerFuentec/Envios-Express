"use client";

import { forwardRef } from "react";

const cx = (...classes) => classes.filter(Boolean).join(" ");

export const FormLabel = ({ className = "", children, ...props }) => (
  <label className={cx("form-label", className)} {...props}>
    {children}
  </label>
);

export const FormControl = forwardRef(
  ({ as = "input", className = "", unstyled = false, type, ...props }, ref) => {
    const Component = as;
    const isTextarea = Component === "textarea";
    const baseClass = unstyled
      ? ""
      : cx("form-control", isTextarea && "form-control--textarea");

    return (
      <Component
        ref={ref}
        type={Component === "input" ? type || "text" : undefined}
        className={cx(baseClass, className)}
        {...props}
      />
    );
  }
);

FormControl.displayName = "FormControl";
