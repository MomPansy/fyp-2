import { SimpleEditor } from "@/components/tiptap/simple/simple-editor.tsx";

interface ProblemDescriptionProps {
  description: string;
  readonly?: boolean;
}

export function ProblemDescription({
  description,
  readonly = true,
}: ProblemDescriptionProps) {
  return <SimpleEditor initialContent={description} readonly={readonly} />;
}
