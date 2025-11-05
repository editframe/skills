import style from "./ColorPicker.module.css";

import React, { useCallback, useRef, useState } from "react";
import { RgbaStringColorPicker } from "react-colorful";

import useClickOutside from "./useClickOutside";

export const PopoverPicker: React.FC<{
  color: string;
  onChange: (newColor: string) => void;
}> = ({ color, onChange }) => {
  const popover = useRef<HTMLDivElement>(null);
  const [isOpen, toggle] = useState(false);

  const close = useCallback(() => {
    toggle(false);
  }, []);
  useClickOutside(popover, close);

  return (
    <div className={style.picker}>
      <div
        className={style.swatch}
        style={{ backgroundColor: color }}
        onClick={() => {
          toggle(true);
        }}
      />
      <label>{color}</label>

      {isOpen && (
        <div className={style.popover} ref={popover}>
          <RgbaStringColorPicker color={color} onChange={onChange} />
        </div>
      )}
    </div>
  );
};
