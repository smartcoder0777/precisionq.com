import PayOrder from "@/views/PayOrder";

type PageProps = { params: Promise<{ token: string }> };

export default async function Page({ params }: PageProps) {
  const { token } = await params;
  return <PayOrder token={token} />;
}
