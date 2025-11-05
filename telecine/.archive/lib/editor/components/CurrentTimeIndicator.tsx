import styles from "./CurrentTimeIndicator.module.css";
import { observer } from "mobx-react-lite";
import { useEditor } from "./EditorContext";

export const CurrentTimeIndicator = observer(() => {
  const editor = useEditor();
  return (
    <div
      className={styles.currentTimeIndicator}
      style={{
        left: editor.msToPixels(
          editor.selectedTemporalRoot?.currentTimeMs ?? 0
        ),
      }}
    />
  );
});
