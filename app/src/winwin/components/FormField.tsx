import type { ReactNode } from 'react';

export function FormField({
  id,
  label,
  required,
  help,
  error,
  children
}: Readonly<{
  id: string;
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  children: ReactNode;
}>) {
  return (
    <div className="winwin-form-field">
      <label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
      {help && <p id={`${id}-help`} className="winwin-field-help">{help}</p>}
      {children}
      {error && <p id={`${id}-error`} className="winwin-field-error" role="alert">{error}</p>}
    </div>
  );
}
