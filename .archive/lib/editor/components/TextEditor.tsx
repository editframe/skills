import { useRef, type FC, useEffect } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

export const TextEditor: FC<{
  disableTools?: boolean;
  initializeSelection?: boolean;
  textContent: string;
  setTextContent: (text: string) => void;
  textStyle: React.CSSProperties;
  setTextStyle: (styles: React.CSSProperties) => void;
}> = ({
  disableTools = false,
  initializeSelection = false,
  textContent,
  setTextContent,
  textStyle,
  setTextStyle,
}) => {
  const quillRef = useRef<ReactQuill>(null);

  useEffect(() => {
    if (!quillRef.current) {
      return;
    }
    if (initializeSelection) {
      const editor = quillRef.current.getEditor();
      editor.setSelection(0, editor.getLength() - 1);
    }
  }, []);

  return (
    <div>
      <ReactQuill
        ref={quillRef}
        modules={{
          toolbar: disableTools
            ? false
            : [["bold", "italic", "underline", "background", "color"]],
        }}
        // @ts-expect-error is not defined
        value={{
          ops: [
            {
              insert: textContent,
              attributes: {
                italic: textStyle.fontStyle === "italic" ? true : null,
                bold: textStyle.fontWeight === "bold" ? true : null,
                underline:
                  textStyle.textDecoration === "underline" ? true : null,
              },
            },
          ],
        }}
        theme="snow"
        onChange={(_content, delta, _source, editor) => {
          let styles = {};
          delta.ops?.forEach((op) => {
            if (op.attributes?.italic === true) {
              styles = { ...styles, fontStyle: "italic" };
            } else if (op.attributes?.italic === null) {
              styles = { ...styles, fontStyle: "normal" };
            }

            if (op.attributes?.bold === true) {
              styles = { ...styles, fontWeight: "bold" };
            } else if (op.attributes?.bold === null) {
              styles = { ...styles, fontWeight: "normal" };
            }

            if (op.attributes?.underline === true) {
              styles = { ...styles, textDecoration: "underline" };
            } else if (op.attributes?.underline === null) {
              styles = { ...styles, textDecoration: "none" };
            }
          });
          setTextContent(editor.getText());
          setTextStyle(styles);
        }}
      />
    </div>
  );
};
