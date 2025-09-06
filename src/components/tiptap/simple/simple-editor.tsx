import * as React from "react";
import {
  UseEditorOptions,
  EditorContent,
  EditorContext,
  HTMLContent,
  useEditor,
} from "@tiptap/react";

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Underline } from "@tiptap/extension-underline";

// --- Custom Extensions ---
import { Link } from "../tiptap-extension/link-extension";
import { Selection } from "../tiptap-extension/selection-extension";
import { TrailingNode } from "../tiptap-extension/trailing-node-extension";

// --- UI Primitives ---
import { Button } from "../tiptap-ui-primitive/button";
import { Spacer } from "../tiptap-ui-primitive/spacer";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "../tiptap-ui-primitive/toolbar";

// --- Tiptap Node ---
import { ImageUploadNode } from "../tiptap-node/image-upload-node/image-upload-node-extension";
import "@/components/tiptap/tiptap-node/code-block-node/code-block-node.scss";
import "@/components/tiptap/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap/tiptap-node/image-node/image-node.scss";
import "@/components/tiptap/tiptap-node/paragraph-node/paragraph-node.scss";

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "../tiptap-ui/heading-dropdown-menu";
import { ImageUploadButton } from "../tiptap-ui/image-upload-button";
import { ListDropdownMenu } from "../tiptap-ui/list-dropdown-menu";
import { BlockquoteButton } from "../tiptap-ui/blockquote-button";
import { CodeBlockButton } from "../tiptap-ui/code-block-button";
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "../tiptap-ui/color-highlight-popover";
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "../tiptap-ui/link-popover";
import { MarkButton } from "../tiptap-ui/mark-button";
import { TextAlignButton } from "../tiptap-ui/text-align-button";
import { UndoRedoButton } from "../tiptap-ui/undo-redo-button";

// --- Icons ---
import { ArrowLeftIcon } from "../tiptap-icons/arrow-left-icon";
import { HighlighterIcon } from "../tiptap-icons/highlighter-icon";
import { LinkIcon } from "../tiptap-icons/link-icon";

// --- Hooks ---
import { useMobile } from "@/hooks/use-mobile";
import { useWindowSize } from "@/hooks/use-window-size";
import { useCursorVisibility } from "@/hooks/use-cursor-visibility";

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils";

// --- Styles ---
import "./simple-editor.scss";

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile,
  saveStatus,
}: {
  onHighlighterClick: () => void;
  onLinkClick: () => void;
  isMobile: boolean;
  saveStatus?: React.ReactNode;
}) => {
  return (
    <>
      <Spacer />

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} />
        <ListDropdownMenu types={["bulletList", "orderedList", "taskList"]} />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ImageUploadButton text="Add" />
      </ToolbarGroup>

      <Spacer />

      {isMobile && <ToolbarSeparator />}

      <ToolbarGroup>
        <div
          style={{
            minWidth: "120px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          {saveStatus}
        </div>
        {/* <ThemeToggle /> */}
      </ToolbarGroup>
    </>
  );
};

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link";
  onBack: () => void;
}) => (
  <>
    <ToolbarGroup>
      <Button data-style="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
);

interface SimpleEditorProps {
  initialContent: HTMLContent;
  onUpdate?: UseEditorOptions["onUpdate"];
  saveStatus?: React.ReactNode;
  readonly?: boolean;
  styles?: {
    editor?: React.CSSProperties;
  };
  showToolbar?: boolean;
}

export function SimpleEditor({
  onUpdate,
  initialContent,
  saveStatus,
  readonly,
  styles,
  showToolbar = true,
}: SimpleEditorProps) {
  const isMobile = useMobile();
  const windowSize = useWindowSize();
  const [mobileView, setMobileView] = React.useState<
    "main" | "highlighter" | "link"
  >("main");
  const toolbarRef = React.useRef<HTMLDivElement>(null);
  const editor = useEditor({
    editable: !readonly,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
      },
    },
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error("Upload failed:", error),
      }),
      TrailingNode,
      Link.configure({ openOnClick: false }),
    ],
    content: initialContent,
    onUpdate: onUpdate,
  });

  const bodyRect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  });

  React.useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main");
    }
  }, [isMobile, mobileView]);

  // Allow overriding the editor max-width via styles.editor.maxWidth by mapping it
  // to a CSS variable consumed by the SCSS: --simple-editor-max-width
  const editorStyle = React.useMemo(() => {
    const base = styles?.editor ? { ...styles.editor } : undefined;
    if (!base) return undefined;

    const result: React.CSSProperties = { ...base } as React.CSSProperties;

    // If caller provided maxWidth, forward it into the CSS variable so SCSS can use it
    const maxW = (base as any).maxWidth;
    if (maxW !== undefined && maxW !== null) {
      const value = typeof maxW === "number" ? `${maxW}px` : String(maxW);
      (result as any)["--simple-editor-max-width"] = value;
    }

    // If caller provided padding (desktop), forward it into CSS variable
    const padding = (base as any).padding;
    if (padding !== undefined && padding !== null) {
      const value =
        typeof padding === "number" ? `${padding}px` : String(padding);
      (result as any)["--simple-editor-padding"] = value;
    }

    // Optional mobile padding override
    const paddingMobile =
      (base as any).paddingMobile ?? (base as any).paddingMobile;
    if (paddingMobile !== undefined && paddingMobile !== null) {
      const value =
        typeof paddingMobile === "number"
          ? `${paddingMobile}px`
          : String(paddingMobile);
      (result as any)["--simple-editor-padding-mobile"] = value;
    }

    return result;
  }, [styles?.editor]);

  // Root style to allow instance-level override of toolbar height.
  // When showToolbar is false, set --tt-toolbar-height to 0 so the content-wrapper
  // calc(100% - var(--tt-toolbar-height)) expands to full height.
  const rootStyle = React.useMemo(() => {
    const s: React.CSSProperties = {};
    if (!showToolbar) {
      (s as React.CSSProperties & Record<string, any>)["--tt-toolbar-height"] =
        "0px";
    }
    return s;
  }, [showToolbar]);

  return (
    <div className="simple-editor-root" style={rootStyle}>
      <EditorContext.Provider value={{ editor }}>
        {showToolbar && (
          <Toolbar
            ref={toolbarRef}
            style={
              isMobile
                ? {
                  bottom: `calc(100% - ${windowSize.height - bodyRect.y}px)`,
                }
                : {}
            }
          >
            {mobileView === "main" ? (
              <MainToolbarContent
                onHighlighterClick={() => setMobileView("highlighter")}
                onLinkClick={() => setMobileView("link")}
                isMobile={isMobile}
                saveStatus={saveStatus}
              />
            ) : (
              <MobileToolbarContent
                type={mobileView === "highlighter" ? "highlighter" : "link"}
                onBack={() => setMobileView("main")}
              />
            )}
          </Toolbar>
        )}

        <div className="content-wrapper">
          <EditorContent
            editor={editor}
            role="presentation"
            className="simple-editor-content"
            style={editorStyle}
          />
        </div>
      </EditorContext.Provider>
    </div>
  );
}
