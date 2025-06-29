
import RichTextEditor from 'reactjs-tiptap-editor'
import { extensions } from 'lib/react-tiptap-editor';
import { useState } from 'react';
import { Paper } from '@mantine/core';

export function MarkdownEditor() {
  // use session storage for this
  const [content, setContent] = useState<string>('');

  return (
    <Paper shadow='md'>
      <RichTextEditor
        extensions={extensions}
        content={content}
        onChangeContent={setContent}
        output='html'
      />
    </Paper>
  );
}
