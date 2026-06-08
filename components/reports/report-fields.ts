/**
 * Catálogo de campos das fontes de relatório. A fonte da verdade vive em
 * `@/src/config/report-fields` (compartilhada com engine/service); este módulo
 * apenas re-exporta para os componentes da UI.
 */
export {
  type FieldType,
  fieldLabel,
  fieldType,
  RELATIONS,
  REPORT_FIELDS,
  type ReportField,
  type ReportRelation,
  SOURCE_LABELS,
} from "@/src/config/report-fields";
