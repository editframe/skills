import { observer } from "mobx-react-lite";
import { TimeGroup } from "./TimeGroup";

import { TPropField } from "../../components/TPropField";

export const TimeGroupPropertiesPanel: React.FC<{ layer: TimeGroup }> =
  observer(({ layer }) => {
    return (
      <div>
        <TPropField model={layer} propName="containerTimeMode" />
        <TPropField model={layer} propName="backgroundColor" />
      </div>
    );
  });
