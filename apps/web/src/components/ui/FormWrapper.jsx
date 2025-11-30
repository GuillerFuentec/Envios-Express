"use client";

const cx = (...classes) => classes.filter(Boolean).join(" ");

export const FormWrapper = ({ className = "", children, ...props }) => (
  <div className={cx("order-1 md:order-2 contact-wrapper", className)} {...props}>
    {children}
  </div>
);
