import { FormBuilder } from "@/components/forms/form-builder";

export default async function FormBuilderPage({
  params,
}: {
  params: Promise<{ "workspace-slug": string; id: string }>;
}) {
  const { "workspace-slug": slug, id } = await params;
  return <FormBuilder slug={slug} formId={id} />;
}
