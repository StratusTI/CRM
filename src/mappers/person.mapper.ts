import type { Person } from "@prisma/client";
import type { PersonDTO } from "@/src/schemas/person.schema";

/** `Prisma.Person` → `PersonDTO` (datas em ISO). */
export function toPersonDTO(person: Person): PersonDTO {
  return {
    id: person.id,
    name: person.name,
    emails: person.emails,
    phones: person.phones,
    city: person.city,
    jobTitle: person.jobTitle,
    linkedin: person.linkedin,
    avatar: person.avatar,
    companyId: person.companyId,
    workspaceId: person.workspaceId,
    createdById: person.createdById,
    updatedById: person.updatedById,
    createdAt: person.createdAt.toISOString(),
    updatedAt: person.updatedAt.toISOString(),
    deletedAt:
      person.deletedAt === null ? null : person.deletedAt.toISOString(),
  };
}
