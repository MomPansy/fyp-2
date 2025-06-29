import { BaseKit } from "reactjs-tiptap-editor";
import { Bold } from "reactjs-tiptap-editor/bold";
import { Italic } from "reactjs-tiptap-editor/italic";
import { TextUnderline } from "reactjs-tiptap-editor/textunderline";
import { Strike } from "reactjs-tiptap-editor/strike";
import { SubAndSuperScript } from "reactjs-tiptap-editor/subandsuperscript";
import { Highlight } from "reactjs-tiptap-editor/highlight";
import { Code } from "reactjs-tiptap-editor/code";
import { Heading } from "reactjs-tiptap-editor/heading";
import { Blockquote } from "reactjs-tiptap-editor/blockquote";
import { Indent } from "reactjs-tiptap-editor/indent";
import { BulletList } from "reactjs-tiptap-editor/bulletlist";
import { ListItem } from "reactjs-tiptap-editor/listitem";
import { Color } from "reactjs-tiptap-editor/color";
import { SlashCommand } from "reactjs-tiptap-editor/slashcommand";
import { Table } from "reactjs-tiptap-editor/table";
import { TaskList } from "reactjs-tiptap-editor/tasklist";
import { TextAlign } from "reactjs-tiptap-editor/textalign";
import { FontSize } from "reactjs-tiptap-editor/fontsize";
import { History } from "reactjs-tiptap-editor/history";
import { CodeBlock } from "reactjs-tiptap-editor/codeblock";

import "prism-code-editor-lightweight/layout.css";
import "prism-code-editor-lightweight/themes/github-light.css";

export const extensions = [
  BaseKit.configure({
    placeholder: {
      showOnlyCurrent: true,
    },
    characterCount: false,
  }),
  History,
  Heading.configure({
    spacer: true,
  }),
  FontSize,
  Bold,
  Italic,
  TextUnderline,
  Strike,
  Color,
  Highlight,
  SubAndSuperScript,
  Code.configure({
    spacer: true,
  }),
  TextAlign,
  Indent,
  BulletList,
  Blockquote,
  ListItem,
  SlashCommand,
  TaskList,
  Table,
  CodeBlock,
];
