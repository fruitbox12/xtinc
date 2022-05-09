import type { ComponentProcessProps } from "components/system/Apps/RenderComponent";
import StyledButton from "components/system/Dialog/StyledButton";
import StyledRun from "components/system/Dialog/StyledRun";
import {
  getProcessByFileExtension,
  getShortcutInfo,
} from "components/system/Files/FileEntry/functions";
import useFileDrop from "components/system/Files/FileManager/useFileDrop";
import { useFileSystem } from "contexts/fileSystem";
import { useProcesses } from "contexts/process";
import processDirectory from "contexts/process/directory";
import { useSession } from "contexts/session";
import { extname } from "path";
import { useCallback, useEffect, useRef, useState } from "react";
import { SHORTCUT_EXTENSION } from "utils/constants";

const OPEN_ID = "open";

const Run: FC<ComponentProcessProps> = () => {
  const { open, close, processes: { Run: runProcess } = {} } = useProcesses();
  const { exists, readFile, stat } = useFileSystem();
  const { foregroundId } = useSession();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(true);
  const [isEmptyInput, setIsEmptyInput] = useState(true);
  const runResource = useCallback(
    async (resource?: string) => {
      if (!resource) return;

      const [resourcePid, ...resourceUrl] = resource.split(" ");
      const resourcePath =
        resourceUrl.length > 0 ? resourceUrl.join("") : resourcePid;

      if (await exists(resourcePath)) {
        const stats = await stat(resourcePath);

        if (stats.isDirectory()) {
          open("FileExplorer", { url: resourcePath }, "");
        } else if (resourcePid && resourceUrl.length > 0) {
          open(resourcePid, { url: resourcePath });
        } else {
          const extension = extname(resourcePath);

          if (extension === SHORTCUT_EXTENSION) {
            const { pid, url } = getShortcutInfo(await readFile(resourcePath));

            if (pid) open(pid, { url });
          } else {
            const basePid = getProcessByFileExtension(extension);

            if (basePid) open(basePid, { url: resourcePath });
          }
        }
      } else if (
        Object.keys(processDirectory).some(
          (processName) =>
            processName.toLowerCase() === resourcePath.toLowerCase()
        )
      ) {
        open(resourcePath);
      } else {
        throw new Error(
          `Cannot find '${resource}'. Make sure you typed the name correctly, and then try again.`
        );
      }

      close("Run");
    },
    [close, exists, open, readFile, stat]
  );

  useEffect(() => {
    if (inputRef.current && foregroundId === "Run") {
      inputRef.current.focus();
    }
  }, [foregroundId]);

  useEffect(() => {
    if (runProcess?.url && inputRef.current) {
      inputRef.current.value = `${inputRef.current.value.trimEnd()} ${
        runProcess.url.includes(" ") ? `"${runProcess.url}"` : runProcess.url
      }`.trim();
      setIsEmptyInput(false);
    }
  }, [runProcess?.url]);

  return (
    <StyledRun {...useFileDrop({ id: "Run" })}>
      <figure>
        <img alt="Run" src="/System/Icons/32x32/run.webp" />
        <figcaption>
          Type the name of a program, folder, document, or Internet resource,
          and daedalOS will open it for you.
        </figcaption>
      </figure>
      <div>
        <label htmlFor={OPEN_ID}>Open:</label>
        <input
          ref={inputRef}
          autoComplete="off"
          enterKeyHint="go"
          id={OPEN_ID}
          onBlurCapture={({ relatedTarget }) => {
            if (
              !runProcess?.componentWindow ||
              runProcess.componentWindow.contains(relatedTarget)
            ) {
              inputRef.current?.focus();
            } else {
              setIsInputFocused(false);
            }
          }}
          onFocusCapture={() => setIsInputFocused(true)}
          onKeyDown={({ key }) => {
            if (key === "Enter") runResource(inputRef.current?.value.trim());
          }}
          onKeyUp={({ target }) =>
            setIsEmptyInput(!(target as HTMLInputElement)?.value)
          }
          spellCheck="false"
          type="text"
        />
      </div>
      <nav>
        <StyledButton
          $active={isInputFocused}
          disabled={isEmptyInput}
          onClick={() => runResource(inputRef.current?.value.trim())}
        >
          OK
        </StyledButton>
        <StyledButton onClick={() => close("Run")}>Cancel</StyledButton>
      </nav>
    </StyledRun>
  );
};

export default Run;
