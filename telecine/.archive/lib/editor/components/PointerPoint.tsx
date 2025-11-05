import { observer } from "mobx-react-lite";
import style from "./PointerPoint.module.css";
import { useEditor } from "./EditorContext";

export const PointerPoint = observer(() => {
  const editor = useEditor();
  if (!editor.showPointer) return null;
  return (
    <div
      className={style.pointerPoint}
      style={{ left: editor.pointerPoint[0], top: editor.pointerPoint[1] }}
    >
      ✛
    </div>
  );
});
