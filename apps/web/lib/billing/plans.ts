export function canStartCheckout(status: string | null) {
  return (
    status === null || status === "canceled" || status === "incomplete_expired"
  );
}
