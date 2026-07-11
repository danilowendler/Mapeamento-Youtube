type FormMessageProps = {
  error?: string;
  success?: string;
};

/** Feedback de formulário: erro (warning) ou sucesso (success). */
export function FormMessage({ error, success }: FormMessageProps) {
  if (!error && !success) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={`border px-xs py-xxs text-body-sm ${
        error
          ? "border-warning/40 text-warning"
          : "border-success/40 text-success"
      }`}
    >
      {error ?? success}
    </p>
  );
}
