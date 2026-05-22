import { mergeAttributes, Node } from "@tiptap/core";

/** Nó de vídeo embutido por URL (`<video controls src>`). */
export const Video = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return { src: { default: null } };
  },
  parseHTML() {
    return [{ tag: "video[src]" }];
  },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "video",
      mergeAttributes(HTMLAttributes, {
        controls: "true",
        class: "rt-media",
      }),
    ];
  },
});

/** Nó de áudio embutido por URL (`<audio controls src>`). */
export const Audio = Node.create({
  name: "audio",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return { src: { default: null } };
  },
  parseHTML() {
    return [{ tag: "audio[src]" }];
  },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "audio",
      mergeAttributes(HTMLAttributes, {
        controls: "true",
        class: "rt-media",
      }),
    ];
  },
});
