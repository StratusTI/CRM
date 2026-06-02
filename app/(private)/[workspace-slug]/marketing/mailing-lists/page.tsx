import { MailingListsList } from "@/components/email/mailing-lists-list";

export default async function MailingListsPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string }>;
}) {
  const { "workspace-slug": slug } = await params;
  return <MailingListsList slug={slug} />;
}
