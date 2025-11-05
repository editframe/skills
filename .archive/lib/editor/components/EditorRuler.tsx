import style from "./EditorRuler.module.css";

import { observer } from "mobx-react-lite";
import { TimeCode } from "./TimeCode";
import { useEditor } from "./EditorContext";

export const EditorRuler = observer(() => {
  const editor = useEditor();
  return (
    <div className={style.editorRuler} style={{ width: editor.rulerWidth }}>
      {editor.rulerTicks.map((tick) => (
        <div key={tick} style={{ width: editor.msToPixels(editor.tickMs) }}>
          <span>
            |<TimeCode ms={editor.tickMs * tick} />
          </span>
        </div>
      ))}
    </div>
  );
});
