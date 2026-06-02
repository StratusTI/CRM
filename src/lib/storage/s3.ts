import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  S3_ACCESS_KEY,
  S3_BUCKET,
  S3_ENDPOINT,
  S3_SECRET_KEY,
} from "@/lib/env/_server";

/**
 * Storage de mídia para posts agendados, sobre MinIO (S3 local). Diferente do
 * [[blob-store]] (em memória, TTL curto, só para o Graph do Instagram baixar na
 * hora), aqui a mídia precisa sobreviver até o horário do agendamento — por isso
 * vai para um bucket persistente.
 *
 * Como é tudo local, `region` e `forcePathStyle` são fixos: MinIO ignora região
 * e exige path-style (`http://host/bucket/key`, não `http://bucket.host/key`).
 */

let client: S3Client | null = null;

/** Credenciais do MinIO presentes? Gateia a feature de agendamento. */
export function isStorageConfigured(): boolean {
  return Boolean(S3_ENDPOINT && S3_ACCESS_KEY && S3_SECRET_KEY && S3_BUCKET);
}

function getClient(): S3Client {
  if (!isStorageConfigured()) {
    throw new Error("MinIO/S3 não configurado");
  }
  if (!client) {
    client = new S3Client({
      endpoint: S3_ENDPOINT,
      region: "us-east-1",
      forcePathStyle: true,
      credentials: {
        accessKeyId: S3_ACCESS_KEY as string,
        secretAccessKey: S3_SECRET_KEY as string,
      },
    });
  }
  return client;
}

let bucketReady = false;

/** Cria o bucket sob demanda (idempotente) — evita setup manual no MinIO. */
async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  const s3 = getClient();
  try {
    await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
  } catch {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
    } catch {
      // Corrida entre réplicas: outra pode tê-lo criado. Ignora.
    }
  }
  bucketReady = true;
}

/** Lê todo um stream do corpo do GetObject em um Buffer. */
async function streamToBuffer(
  body: AsyncIterable<Uint8Array> | ReadableStream<Uint8Array> | unknown,
): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  // SDK v3 no Node entrega um Readable (async iterable).
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** Grava os bytes no bucket sob `key`. */
export async function putObject(
  key: string,
  bytes: ArrayBuffer | Uint8Array,
  contentType: string,
): Promise<void> {
  await ensureBucket();
  const body = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  await getClient().send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

/** Baixa os bytes do objeto `key`. */
export async function getObjectBytes(
  key: string,
): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  await ensureBucket();
  const res = await getClient().send(
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
  );
  const buffer = await streamToBuffer(res.Body);
  // Copia para um ArrayBuffer puro (os services esperam ArrayBuffer).
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
  return {
    bytes: arrayBuffer,
    contentType: res.ContentType ?? "application/octet-stream",
  };
}

/** Remove o objeto `key` (best-effort — erros não propagam). */
export async function deleteObject(key: string): Promise<void> {
  try {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    );
  } catch {
    // Limpeza é best-effort: um objeto órfão não quebra o fluxo.
  }
}
