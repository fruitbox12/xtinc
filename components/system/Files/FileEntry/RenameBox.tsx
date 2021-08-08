import StyledRenameBox from "components/system/Files/Views/StyledRenameBox";
import { extname } from "path";
import { useEffect, useRef } from "react";

type RenameBoxProps = {
  name: string;
  path: string;
  renameFile: (path: string, name?: string) => void;
};

const RenameBox = ({ name, path, renameFile }: RenameBoxProps): JSX.Element => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const saveRename = () => renameFile(path, inputRef?.current?.value);

  useEffect(() => {
    inputRef?.current?.focus();
    inputRef?.current?.setSelectionRange(0, name.length - extname(name).length);
  }, [name]);

  return (
    <StyledRenameBox
      defaultValue={name}
      onBlurCapture={saveRename}
      onKeyDown={({ key }) => key === "Enter" && saveRename()}
      onKeyUp={(event) => event.preventDefault()}
      ref={inputRef}
    />
  );
};

export default RenameBox;
