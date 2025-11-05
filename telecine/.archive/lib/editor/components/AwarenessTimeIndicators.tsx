import styles from "./AwarenessTimeIndicators.module.css";
import { observer } from "mobx-react-lite";
import { useEditor } from "./EditorContext";
import { colorHash } from "../util/colorHash";
import { Fragment } from "react";

export const AwarenessTimeIndicators = observer(() => {
  const editor = useEditor();
  return editor.temporalRootAttentions.map((attention) => {
    return (
      <Fragment key={attention.id}>
        <div
          className={styles.awarenessTimeIndicator}
          style={{
            left: editor.msToPixels(attention.currentTime ?? 0),
            borderLeftColor: colorHash(attention.id),
          }}
        />
        <div className={styles.awarenessUserIndicator}>
          <div
            className={styles.awarenessUserIndicatorIcon}
            style={{
              backgroundColor: colorHash(attention.id),
              left: editor.msToPixels(attention.currentTime ?? 0),
            }}
          >
            {attention.name?.[0] ?? "?"}
          </div>
        </div>
      </Fragment>
    );
  });
});
