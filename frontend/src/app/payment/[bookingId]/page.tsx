import PaymentGate from "./PaymentGate";

interface PaymentPageProps {
  params: Promise<{ bookingId: string }>;
}

export default async function PaymentPage({ params }: PaymentPageProps) {
  const { bookingId } = await params;
  return <PaymentGate bookingId={bookingId} />;
}
