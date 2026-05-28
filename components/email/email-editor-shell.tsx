"use client";

import "@react-email/editor/dist/style.css";
import { EmailEditor, type EmailEditorRef } from "@react-email/editor";
import type { Content } from "@tiptap/core";
import { forwardRef } from "react";

type Props = {
  initialContent?: Content;
  placeholder?: string;
};

/**
 * Wrapper fino do `EmailEditor` do react-email — só amarra props comuns e
 * estiliza o container. O parent pega o HTML/JSON pelo `ref`.
 */
export const EmailEditorShell = forwardRef<EmailEditorRef, Props>(
  function EmailEditorShell({ initialContent, placeholder }, ref) {
    return (
      <div className="email-editor-shell rounded-lg border border-border bg-card">
        <EmailEditor
          ref={ref}
          content={initialContent}
          placeholder={placeholder ?? "Escreva sua mensagem…"}
        />
      </div>
    );
  },
);
