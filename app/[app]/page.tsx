import { redirect } from "next/navigation";

export default async function AppPage({
  params,
}: {
  params: Promise<{ app: string }>
}) {
  const { app: slug } = await params
  redirect(`/${slug}/workspace`)
}